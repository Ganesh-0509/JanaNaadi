"""News RSS feed ingester."""

import json
import pathlib
import feedparser
from app.ingesters.base_ingester import BaseIngester

CONFIG_DIR = pathlib.Path(__file__).resolve().parent.parent.parent / "config"


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
        entries = []

        for feed_config in feeds:
            url = feed_config.get("url", "")
            region = feed_config.get("region")
            if not url:
                continue

            parsed = feedparser.parse(url)
            for item in parsed.entries[:20]:
                title = item.get("title", "")
                summary = item.get("summary", "")
                text = f"{title}. {summary}".strip()
                if len(text) < 10:
                    continue
                entries.append({
                    "text": text,
                    "source_id": item.get("id") or item.get("link"),
                    "source_url": item.get("link"),
                    "location": region,
                })

        return entries
