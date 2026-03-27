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


def invalidate_for_entry(state_id: int | None) -> None:
    """Purge snapshot and heatmap cache entries after new data is ingested."""
    # Clear all national snapshots (any period)
    keys_to_delete = [k for k in list(snapshot_cache.keys()) if str(k).startswith("national:")]
    # Clear state-specific snapshots
    if state_id:
        keys_to_delete += [k for k in list(snapshot_cache.keys()) if str(k).startswith(f"state:{state_id}:")]
    for k in keys_to_delete:
        snapshot_cache.pop(k, None)
    # Invalidate heatmap and general caches entirely (small and fast to rebuild)
    heatmap_cache.clear()
    general_cache.pop("state_rankings_24h", None)
    general_cache.pop("mcd_ward_rankings_24h", None)
