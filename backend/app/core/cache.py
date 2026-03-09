"""TTL cache for expensive queries (snapshots, heatmap data)."""

from cachetools import TTLCache
from app.core.settings import get_settings

_settings = get_settings()

# Snapshot cache — keyed by (scope_type, scope_id, period)
snapshot_cache: TTLCache = TTLCache(maxsize=512, ttl=_settings.cache_ttl_snapshots)

# Heatmap cache — keyed by (level, parent_id, filters_hash)
heatmap_cache: TTLCache = TTLCache(maxsize=256, ttl=_settings.cache_ttl_heatmap)

# General purpose cache
general_cache: TTLCache = TTLCache(maxsize=1024, ttl=300)


def cache_key(*parts) -> str:
    """Build a hashable cache key from parts."""
    return ":".join(str(p) for p in parts)
