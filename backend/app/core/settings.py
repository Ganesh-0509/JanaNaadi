"""Application settings loaded from environment variables."""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""  # anon key
    supabase_service_key: str = ""  # service role key

    # Bytez (primary LLM)
    bytez_api_key: str = ""
    bytez_model: str = "google/gemini-2.5-flash"

    # Gemini (secondary/fallback LLM)
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # Twitter (optional)
    twitter_bearer_token: str = ""

    # Reddit (optional)
    reddit_client_id: str = ""
    reddit_client_secret: str = ""

    # App
    app_name: str = "JanaNaadi"
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]

    # Rate limiting
    rate_limit_default: str = "60/minute"

    # Cache TTL (seconds)
    cache_ttl_snapshots: int = 300  # 5 minutes
    cache_ttl_heatmap: int = 120  # 2 minutes

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
