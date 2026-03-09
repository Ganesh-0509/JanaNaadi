"""Reddit data ingester."""

import httpx
from app.core.settings import get_settings
from app.ingesters.base_ingester import BaseIngester


SUBREDDITS = [
    {"name": "india", "region": None},
    {"name": "chennai", "region": "Tamil Nadu"},
    {"name": "delhi", "region": "Delhi"},
    {"name": "mumbai", "region": "Maharashtra"},
    {"name": "bangalore", "region": "Karnataka"},
    {"name": "hyderabad", "region": "Telangana"},
]


class RedditIngester(BaseIngester):
    """Fetch posts from India-related subreddits."""

    async def _get_token(self) -> str | None:
        s = get_settings()
        if not s.reddit_client_id or not s.reddit_client_secret:
            return None

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://www.reddit.com/api/v1/access_token",
                data={"grant_type": "client_credentials"},
                auth=(s.reddit_client_id, s.reddit_client_secret),
                headers={"User-Agent": "JanaNaadi/1.0"},
                timeout=15,
            )
            if resp.status_code == 200:
                return resp.json().get("access_token")
        return None

    async def fetch(self, **kwargs) -> list[dict]:
        token = await self._get_token()
        if not token:
            return []

        entries = []
        headers = {
            "Authorization": f"Bearer {token}",
            "User-Agent": "JanaNaadi/1.0",
        }

        async with httpx.AsyncClient() as client:
            for sub in SUBREDDITS:
                resp = await client.get(
                    f"https://oauth.reddit.com/r/{sub['name']}/hot",
                    headers=headers,
                    params={"limit": 25},
                    timeout=15,
                )
                if resp.status_code != 200:
                    continue

                data = resp.json()
                for post in data.get("data", {}).get("children", []):
                    pd = post.get("data", {})
                    title = pd.get("title", "")
                    selftext = pd.get("selftext", "")[:500]
                    text = f"{title}. {selftext}".strip()
                    if len(text) < 10:
                        continue
                    entries.append({
                        "text": text,
                        "source_id": pd.get("id"),
                        "source_url": f"https://reddit.com{pd.get('permalink', '')}",
                        "location": sub.get("region"),
                    })

        return entries
