"""RSS news feed ingester."""

import time
import asyncio
import re
import html
import json
import pathlib
from datetime import datetime, timezone
import feedparser
from app.ingesters.base_ingester import BaseIngester

CONFIG_DIR = pathlib.Path(__file__).resolve().parent.parent.parent / "config"

_MAX_ITEMS_PER_FEED = 30  # increased from 20


def _strip_html(text: str) -> str:
    """Remove HTML tags and decode HTML entities from RSS feed text."""
    # Decode HTML entities (&nbsp;, &amp;, etc.)
    text = html.unescape(text)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Clean up extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text


class NewsIngester(BaseIngester):
    """Fetch news headlines + summaries from RSS feeds."""

    def _load_feeds(self) -> list[dict]:
        path = CONFIG_DIR / "rss_feeds.json"
        if path.exists():
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        return []

    async def fetch(self, **kwargs) -> list[dict]:
        feeds = self._load_feeds()
        entries: list[dict] = []

        loop = asyncio.get_event_loop()

        async def _fetch_feed(feed_config: dict) -> list[dict]:
            url = feed_config.get("url", "")
            region = feed_config.get("region")
            if not url:
                return []
            try:
                parsed = await loop.run_in_executor(None, feedparser.parse, url)
            except Exception:
                return []

            result = []
            for item in parsed.entries[:_MAX_ITEMS_PER_FEED]:
                title = _strip_html(item.get("title", ""))
                summary = _strip_html(item.get("summary", ""))
                text = f"{title}. {summary}".strip()
                if len(text) < 10:
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

        # Fetch all feeds concurrently in batches to avoid overwhelming the event loop
        batch_size = 15
        for i in range(0, len(feeds), batch_size):
            batch = feeds[i : i + batch_size]
            results = await asyncio.gather(*[_fetch_feed(f) for f in batch], return_exceptions=True)
            for r in results:
                if isinstance(r, list):
                    entries.extend(r)

        return entries
