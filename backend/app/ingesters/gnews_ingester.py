"""Google News RSS ingester — Delhi/ward scoped, no API key required."""

from urllib.parse import urlencode
import feedparser
import asyncio
import re
import html
from datetime import datetime, timezone
import time

from app.ingesters.base_ingester import BaseIngester

# (query_string, region_hint)
_DELHI_QUERIES: list[tuple[str, str]] = [
    ("Delhi news", "Delhi"),
    ("MCD Delhi municipal news", "Delhi"),
    ("Delhi ward development MCD", "Delhi"),
    ("Delhi civic complaints residents", "Delhi"),
    ("Rohini Delhi ward news", "Delhi"),
    ("Dwarka Delhi ward news", "Delhi"),
    ("Karol Bagh Delhi ward news", "Delhi"),
    ("Chandni Chowk Delhi ward news", "Delhi"),
    ("Okhla Delhi ward news", "Delhi"),
    ("Wazirpur Delhi ward news", "Delhi"),
    ("Shahdara Delhi ward news", "Delhi"),
    ("Mustafabad Delhi ward news", "Delhi"),
    ("Delhi pollution AQI", "Delhi"),
    ("Delhi waterlogging flood", "Delhi"),
    ("Delhi water supply issue", "Delhi"),
    ("Delhi power cut electricity", "Delhi"),
    ("Delhi traffic pothole roads", "Delhi"),
    ("Delhi sanitation garbage MCD", "Delhi"),
    ("Delhi women safety crime", "Delhi"),
    ("Delhi school hospital civic services", "Delhi"),
]

_BASE = "https://news.google.com/rss/search"
_COMMON = {"hl": "en-IN", "gl": "IN", "ceid": "IN:en"}

_MAX_ITEMS_PER_FEED = 15


def _strip_html(text: str) -> str:
    """Remove HTML tags and decode HTML entities from RSS feed text."""
    text = html.unescape(text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def _build_url(query: str) -> str:
    params = {"q": query, **_COMMON}
    return f"{_BASE}?{urlencode(params)}"


class GNewsIngester(BaseIngester):
    """Fetch articles from Google News RSS for Delhi and Delhi wards."""

    async def fetch(self, **kwargs) -> list[dict]:
        all_queries = _DELHI_QUERIES
        entries: list[dict] = []

        loop = asyncio.get_event_loop()

        async def _fetch_one(query: str, region: str | None) -> list[dict]:
            url = _build_url(query)
            try:
                # feedparser is synchronous — run in executor to avoid blocking
                parsed = await loop.run_in_executor(None, feedparser.parse, url)
            except Exception:
                return []

            result = []
            for item in parsed.entries[:_MAX_ITEMS_PER_FEED]:
                title = _strip_html(item.get("title", ""))
                summary = _strip_html(item.get("summary", ""))
                text = f"{title}. {summary}".strip()
                if len(text) < 15:
                    continue

                published_at = None
                if hasattr(item, "published_parsed") and item.published_parsed:
                    ts = time.mktime(item.published_parsed)
                    published_at = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()

                result.append({
                    "text": text,
                    "source_id": item.get("id") or item.get("link"),
                    "source_url": item.get("link"),
                    "location": region,
                    "published_at": published_at,
                })
            return result

        # Batch requests in groups of 10 to avoid hammering Google
        batch_size = 10
        for i in range(0, len(all_queries), batch_size):
            batch = all_queries[i : i + batch_size]
            tasks = [_fetch_one(q, r) for q, r in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, list):
                    entries.extend(r)
            # Polite delay between batches
            if i + batch_size < len(all_queries):
                await asyncio.sleep(2)

        return entries
