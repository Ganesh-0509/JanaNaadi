"""Supabase client singleton."""

from supabase import create_client, Client
from app.core.settings import get_settings


_client: Client | None = None
_service_client: Client | None = None


def get_supabase() -> Client:
    """Get the Supabase client using the anon key (RLS enforced)."""
    global _client
    if _client is None:
        s = get_settings()
        _client = create_client(s.supabase_url, s.supabase_key)
    return _client


def get_supabase_admin() -> Client:
    """Get the Supabase client using the service role key (bypasses RLS)."""
    global _service_client
    if _service_client is None:
        s = get_settings()
        _service_client = create_client(s.supabase_url, s.supabase_service_key)
    return _service_client
