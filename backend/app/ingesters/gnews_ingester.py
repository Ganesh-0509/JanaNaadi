"""Google News RSS ingester — no API key required.

Builds targeted RSS query URLs for every Indian state + key civic topics
so we capture hyperlocal signals that generic national feeds miss.
"""

from urllib.parse import urlencode
import feedparser
import asyncio
import re
import html
from datetime import datetime, timezone
import time

from app.ingesters.base_ingester import BaseIngester

# (query_string, region_hint)
_STATE_QUERIES: list[tuple[str, str]] = [
    ("Andhra Pradesh news", "Andhra Pradesh"),
    ("Arunachal Pradesh news", "Arunachal Pradesh"),
    ("Assam news", "Assam"),
    ("Bihar news", "Bihar"),
    ("Chhattisgarh news", "Chhattisgarh"),
    ("Goa news", "Goa"),
    ("Gujarat news", "Gujarat"),
    ("Haryana news", "Haryana"),
    ("Himachal Pradesh news", "Himachal Pradesh"),
    ("Jharkhand news", "Jharkhand"),
    ("Karnataka news", "Karnataka"),
    ("Kerala news", "Kerala"),
    ("Madhya Pradesh news", "Madhya Pradesh"),
    ("Maharashtra news", "Maharashtra"),
    ("Manipur news", "Manipur"),
    ("Meghalaya news", "Meghalaya"),
    ("Mizoram news", "Mizoram"),
    ("Nagaland news", "Nagaland"),
    ("Odisha news", "Odisha"),
    ("Punjab news", "Punjab"),
    ("Rajasthan news", "Rajasthan"),
    ("Sikkim news", "Sikkim"),
    ("Tamil Nadu news", "Tamil Nadu"),
    ("Telangana news", "Telangana"),
    ("Tripura news", "Tripura"),
    ("Uttar Pradesh news", "Uttar Pradesh"),
    ("Uttarakhand news", "Uttarakhand"),
    ("West Bengal news", "West Bengal"),
    ("Jammu Kashmir news", "Jammu & Kashmir"),
    ("Delhi news", "Delhi"),
]

# Civic / topic level queries (no region pin — let geo_engine do the work)
_TOPIC_QUERIES: list[tuple[str, None]] = [
    ("India farmers agriculture protest", None),
    ("India unemployment jobs economy", None),
    ("India electricity water shortage", None),
    ("India road accident flood disaster", None),
    ("India corruption scam government", None),
    ("India school college education fees", None),
    ("India hospital doctor medicine", None),
    ("India inflation prices fuel", None),
    ("India environment pollution deforestation", None),
    ("India women safety crime", None),
    ("India tribal adivasi rights", None),
    ("India dalit caste discrimination", None),
    ("India communal violence riot", None),
    ("India startup innovation technology", None),
    ("India parliament bill legislation", None),
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
    """Fetch articles from Google News RSS for Indian states and civic topics."""

    async def fetch(self, **kwargs) -> list[dict]:
        all_queries = _STATE_QUERIES + _TOPIC_QUERIES  # type: ignore[operator]
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
