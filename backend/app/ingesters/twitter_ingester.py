"""Twitter/X data ingester."""

import httpx
from app.core.settings import get_settings
from app.ingesters.base_ingester import BaseIngester


class TwitterIngester(BaseIngester):
    """Fetch tweets via Twitter API v2."""

    async def fetch(self, **kwargs) -> list[dict]:
        s = get_settings()
        if not s.twitter_bearer_token:
            return []

        keywords = kwargs.get("keywords", [
            "government India", "sarkar", "nagar palika",
            "municipality", "MLA", "MP complaint",
            "road repair", "water supply", "bijli",
        ])
        query = " OR ".join(keywords[:5]) + " lang:en OR lang:hi -is:retweet"

        headers = {"Authorization": f"Bearer {s.twitter_bearer_token}"}
        params = {
            "query": query,
            "max_results": 100,
            "tweet.fields": "created_at,author_id,geo,lang",
        }

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.twitter.com/2/tweets/search/recent",
                headers=headers,
                params=params,
                timeout=30,
            )
            if resp.status_code != 200:
                return []

            data = resp.json()
            entries = []
            for tweet in data.get("data", []):
                entries.append({
                    "text": tweet["text"],
                    "source_id": tweet["id"],
                    "location": None,  # Would need Places API lookup
                    "language": tweet.get("lang"),
                })
            return entries
