"""Snapshot aggregation service — pre-computes dashboards."""

from datetime import datetime, timedelta, timezone
from app.core.supabase_client import get_supabase_admin
from app.core.cache import snapshot_cache, cache_key

SNAPSHOT_MAX_ROWS = 20000


async def compute_snapshot(
    scope_type: str,
    scope_id: int | None,
    period_hours: int = 24,
) -> dict:
    """Compute aggregated sentiment snapshot for a scope."""
    sb = get_supabase_admin()
    now = datetime.now(timezone.utc)
    period_start = now - timedelta(hours=period_hours)

    query = sb.table("sentiment_entries").select(
        "id, ingested_at, sentiment, sentiment_score, language, primary_topic_id, extracted_keywords"
    )

    if scope_type == "state" and scope_id:
        query = query.eq("state_id", scope_id)
    elif scope_type == "district" and scope_id:
        query = query.eq("district_id", scope_id)
    elif scope_type == "constituency" and scope_id:
        query = query.eq("constituency_id", scope_id)
    elif scope_type == "ward" and scope_id:
        query = query.eq("ward_id", scope_id)

    # Read only the latest rows first (indexed path), then filter by period in-memory.
    result = (
        query
        .order("id", desc=True)
        .limit(SNAPSHOT_MAX_ROWS)
        .execute()
    )
    data = result.data or []

    filtered = []
    for row in data:
        ts = row.get("ingested_at")
        if not ts:
            continue
        try:
            ts_dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
            if ts_dt >= period_start:
                filtered.append(row)
        except Exception:
            continue

    data = filtered

    total = len(data)
    positive = sum(1 for e in data if e["sentiment"] == "positive")
    negative = sum(1 for e in data if e["sentiment"] == "negative")
    neutral = total - positive - negative
    avg_score = sum(e.get("sentiment_score", 0) for e in data) / max(total, 1)

    # Language distribution
    lang_dist: dict[str, int] = {}
    for e in data:
        lang = e.get("language", "unknown")
        lang_dist[lang] = lang_dist.get(lang, 0) + 1

    # Top topics
    topic_counts: dict[int, int] = {}
    for e in data:
        tid = e.get("primary_topic_id")
        if tid:
            topic_counts[tid] = topic_counts.get(tid, 0) + 1
    top_topics = sorted(
        [{"topic_id": k, "count": v} for k, v in topic_counts.items()],
        key=lambda x: -x["count"],
    )[:10]

    # Top keywords
    kw_counts: dict[str, int] = {}
    for e in data:
        for kw in e.get("extracted_keywords") or []:
            kw_counts[kw] = kw_counts.get(kw, 0) + 1
    top_keywords = sorted(kw_counts, key=lambda k: -kw_counts[k])[:20]

    snapshot = {
        "scope_type": scope_type,
        "scope_id": scope_id,
        "period_start": period_start.isoformat(),
        "period_end": now.isoformat(),
        "total_entries": total,
        "positive_count": positive,
        "negative_count": negative,
        "neutral_count": neutral,
        "avg_sentiment_score": round(avg_score, 4),
        "top_topics": top_topics,
        "top_keywords": top_keywords,
        "language_distribution": lang_dist,
    }

    # Cache it
    ck = cache_key(scope_type, scope_id or 0, period_hours)
    snapshot_cache[ck] = snapshot

    return snapshot


async def get_or_compute_snapshot(
    scope_type: str, scope_id: int | None, period_hours: int = 24
) -> dict:
    """Retrieve from cache or compute fresh snapshot."""
    ck = cache_key(scope_type, scope_id or 0, period_hours)
    if ck in snapshot_cache:
        return snapshot_cache[ck]
    return await compute_snapshot(scope_type, scope_id, period_hours)
