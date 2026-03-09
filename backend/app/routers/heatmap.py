"""Heatmap data endpoints."""

import asyncio
import math
from fastapi import APIRouter, Query
from app.core.supabase_client import get_supabase_admin
from app.core.cache import general_cache
from app.services.snapshot_service import get_or_compute_snapshot
from app.models.schemas import HeatmapPoint


def _urgency(negative_count: int, total: int, avg_sentiment: float) -> float:
    """Urgency score 0–1: high volume of negative voices = high urgency."""
    if total == 0:
        return 0.0
    neg_ratio = negative_count / total
    # weight by log(volume) so large cities with lots of complaints rank higher
    raw = neg_ratio * math.log1p(total) / math.log1p(5000)  # normalise against 5k entries
    return round(min(raw, 1.0), 4)

router = APIRouter(prefix="/api/heatmap", tags=["heatmap"])

# Indian state centroid coordinates (approximate)
STATE_CENTROIDS: dict[str, tuple[float, float]] = {
    "DL": (28.6139, 77.2090),
    "TN": (11.1271, 78.6569),
    "MH": (19.6633, 73.5248),
    "KA": (15.3173, 75.7139),
    "UP": (26.8467, 80.9462),
    "WB": (22.9868, 87.8550),
    "TS": (18.1124, 79.0193),
    "KL": (10.8505, 76.2711),
    "GJ": (22.2587, 71.1924),
    "RJ": (27.0238, 74.2179),
    "MP": (22.9734, 78.6569),
    "BR": (25.0961, 85.3131),
    "AP": (15.9129, 79.7400),
    "PB": (31.1471, 75.3412),
    "HR": (29.0588, 76.0856),
    "OD": (20.9517, 85.0985),
    "JH": (23.6102, 85.2799),
    "AS": (26.2006, 92.9376),
    "CG": (21.2787, 81.8661),
    "UK": (30.0668, 79.0193),
    "GA": (15.2993, 74.1240),
    "TR": (23.9408, 91.9882),
    "ML": (25.4670, 91.3662),
    "MN": (24.6637, 93.9063),
    "NL": (26.1584, 94.5624),
    "MZ": (23.1645, 92.9376),
    "AR": (28.2180, 94.7278),
    "SK": (27.5330, 88.5122),
    "HP": (31.1048, 77.1734),
    "JK": (33.7782, 76.5762),
}


async def _build_heatmap_points(
    table: str,
    parent_field: str | None,
    parent_id: int | None,
    scope_type: str,
    geo_field: str,
) -> list[HeatmapPoint]:
    """Generic heatmap point builder."""
    sb = get_supabase_admin()
    query = sb.table(table).select("*")
    if parent_field and parent_id:
        query = query.eq(parent_field, parent_id)
    items = query.execute()

    points = []
    for item in items.data or []:
        snapshot = await get_or_compute_snapshot(scope_type, item["id"], period_hours=24)
        dominant_topic = None
        if snapshot.get("top_topics"):
            tid = snapshot["top_topics"][0]["topic_id"]
            topic = sb.table("topic_taxonomy").select("name").eq("id", tid).limit(1).execute()
            dominant_topic = topic.data[0]["name"] if topic.data else None

        points.append(
            HeatmapPoint(
                id=item["id"],
                name=item["name"],
                lat=item.get("lat", 0) or 0,
                lng=item.get("lng", 0) or 0,
                avg_sentiment=snapshot["avg_sentiment_score"],
                volume=snapshot["total_entries"],
                dominant_topic=dominant_topic,
            )
        )
    return points


TIME_RANGE_HOURS = {"24h": 24, "7d": 168, "30d": 720}


@router.get("/states", response_model=list[HeatmapPoint])
async def heatmap_states(
    time_range: str = Query("30d"),
    topic: str | None = Query(None),
    source: str | None = Query(None),
    language: str | None = Query(None),
    sentiment: str | None = Query(None),
):
    """Get state-level heatmap data with optional filters."""
    from datetime import datetime, timezone, timedelta
    from collections import defaultdict

    period_hours = TIME_RANGE_HOURS.get(time_range, 720)
    sb = get_supabase_admin()

    # Pre-fetch all topic names
    topics = {t["id"]: t["name"] for t in (sb.table("topic_taxonomy").select("id, name").execute().data or [])}
    topic_id_filter = None
    if topic:
        topic_id_filter = next((tid for tid, tname in topics.items() if tname.lower() == topic.lower()), None)

    has_extra_filters = bool(source or language or sentiment)

    if not has_extra_filters:
        # ── Snapshot path (fast, cached) ───────────────────────────
        cache_key = f"heatmap_states:{time_range}:{topic or 'all'}"
        if cache_key in general_cache:
            return general_cache[cache_key]

        states = sb.table("states").select("id, name, code").execute()
        state_list = states.data or []
        snapshots = await asyncio.gather(
            *(get_or_compute_snapshot("state", s["id"], period_hours=period_hours) for s in state_list)
        )

        points = []
        for s, snapshot in zip(state_list, snapshots):
            lat, lng = STATE_CENTROIDS.get(s["code"], (22.5, 82.0))

            dominant_topic = None
            if snapshot.get("top_topics"):
                tid = snapshot["top_topics"][0]["topic_id"]
                dominant_topic = topics.get(tid)

            # If filtering by topic, skip states where the topic isn't dominant
            if topic_id_filter and not any(t["topic_id"] == topic_id_filter for t in snapshot.get("top_topics", [])):
                # Still include but show zero volume so user sees all states
                points.append(
                    HeatmapPoint(
                        id=s["id"], name=s["name"], code=s["code"],
                        lat=lat, lng=lng, avg_sentiment=0, volume=0,
                        dominant_topic=None, positive_count=0, negative_count=0, neutral_count=0,
                    )
                )
                continue

            neg = snapshot["negative_count"]
            vol = snapshot["total_entries"]
            points.append(
                HeatmapPoint(
                    id=s["id"],
                    name=s["name"],
                    code=s["code"],
                    lat=lat,
                    lng=lng,
                    avg_sentiment=snapshot["avg_sentiment_score"],
                    volume=vol,
                    urgency_score=_urgency(neg, vol, snapshot["avg_sentiment_score"]),
                    dominant_topic=dominant_topic,
                    positive_count=snapshot["positive_count"],
                    negative_count=neg,
                    neutral_count=snapshot["neutral_count"],
                )
            )

        general_cache[cache_key] = points
        return points

    # ── Direct query path (source / language / sentiment filters active) ──
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=period_hours)).isoformat()
    query = (
        sb.table("sentiment_entries")
        .select("state_id, sentiment, sentiment_score, primary_topic_id")
        .gte("ingested_at", cutoff)
    )
    if source:
        query = query.eq("source", source)
    if language:
        query = query.eq("language", language)
    if sentiment:
        query = query.eq("sentiment", sentiment)
    if topic_id_filter:
        query = query.eq("primary_topic_id", topic_id_filter)

    result = query.execute()
    all_entries = result.data or []

    states = sb.table("states").select("id, name, code").execute()

    by_state: dict[int, list] = defaultdict(list)
    for e in all_entries:
        sid = e.get("state_id")
        if sid:
            by_state[sid].append(e)

    points = []
    for s in (states.data or []):
        lat, lng = STATE_CENTROIDS.get(s["code"], (22.5, 82.0))
        ents = by_state[s["id"]]
        total = len(ents)
        if total == 0:
            points.append(HeatmapPoint(
                id=s["id"], name=s["name"], code=s["code"],
                lat=lat, lng=lng, avg_sentiment=0, volume=0,
                urgency_score=0, dominant_topic=None,
                positive_count=0, negative_count=0, neutral_count=0,
            ))
            continue

        pos = sum(1 for e in ents if e["sentiment"] == "positive")
        neg = sum(1 for e in ents if e["sentiment"] == "negative")
        avg_s = sum(e.get("sentiment_score", 0) for e in ents) / total

        topic_counts: dict[int, int] = {}
        for e in ents:
            tid = e.get("primary_topic_id")
            if tid:
                topic_counts[tid] = topic_counts.get(tid, 0) + 1
        dom_topic_id = max(topic_counts, key=lambda k: topic_counts[k]) if topic_counts else None
        dominant_topic = topics.get(dom_topic_id) if dom_topic_id else None

        points.append(HeatmapPoint(
            id=s["id"], name=s["name"], code=s["code"],
            lat=lat, lng=lng, avg_sentiment=round(avg_s, 4), volume=total,
            urgency_score=_urgency(neg, total, avg_s), dominant_topic=dominant_topic,
            positive_count=pos, negative_count=neg, neutral_count=total - pos - neg,
        ))

    return points


@router.get("/districts", response_model=list[HeatmapPoint])
async def heatmap_districts(
    state_id: int = Query(...),
):
    """Get district-level heatmap data for a state."""
    return await _build_heatmap_points("districts", "state_id", state_id, "district", "district_id")


@router.get("/constituencies", response_model=list[HeatmapPoint])
async def heatmap_constituencies(
    district_id: int = Query(...),
):
    """Get constituency-level heatmap data for a district."""
    return await _build_heatmap_points(
        "constituencies", "district_id", district_id, "constituency", "constituency_id"
    )


@router.get("/wards", response_model=list[HeatmapPoint])
async def heatmap_wards(
    constituency_id: int = Query(...),
):
    """Get ward-level heatmap data for a constituency."""
    return await _build_heatmap_points(
        "wards", "constituency_id", constituency_id, "ward", "ward_id"
    )


@router.get("/history", response_model=list[HeatmapPoint])
async def heatmap_history(date: str = Query(..., description="ISO date YYYY-MM-DD")):
    """Return state-level heatmap for a specific historical date (24h window)."""
    from datetime import datetime, timezone

    try:
        day = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")

    cache_key_hist = f"heatmap_history:{date}"
    if cache_key_hist in general_cache:
        return general_cache[cache_key_hist]

    from datetime import timedelta
    period_start = day
    period_end = day + timedelta(hours=24)

    sb = get_supabase_admin()
    states = sb.table("states").select("id, name, code").execute()
    topics_map = {t["id"]: t["name"] for t in (sb.table("topic_taxonomy").select("id, name").execute().data or [])}

    entries_result = (
        sb.table("sentiment_entries")
        .select("state_id, sentiment, sentiment_score, primary_topic_id")
        .gte("ingested_at", period_start.isoformat())
        .lt("ingested_at", period_end.isoformat())
        .execute()
    )
    all_entries = entries_result.data or []

    # group entries by state_id
    from collections import defaultdict
    by_state: dict[int, list] = defaultdict(list)
    for e in all_entries:
        sid = e.get("state_id")
        if sid:
            by_state[sid].append(e)

    points = []
    for s in (states.data or []):
        lat, lng = STATE_CENTROIDS.get(s["code"], (22.5, 82.0))
        ents = by_state[s["id"]]
        total = len(ents)
        if total == 0:
            points.append(HeatmapPoint(
                id=s["id"], name=s["name"], code=s["code"],
                lat=lat, lng=lng, avg_sentiment=0, volume=0,
                urgency_score=0, dominant_topic=None,
                positive_count=0, negative_count=0, neutral_count=0,
            ))
            continue
        pos = sum(1 for e in ents if e["sentiment"] == "positive")
        neg = sum(1 for e in ents if e["sentiment"] == "negative")
        neu = total - pos - neg
        avg_s = sum(e.get("sentiment_score", 0) for e in ents) / total
        topic_counts: dict[int, int] = {}
        for e in ents:
            tid = e.get("primary_topic_id")
            if tid:
                topic_counts[tid] = topic_counts.get(tid, 0) + 1
        dom_topic_id = max(topic_counts, key=lambda k: topic_counts[k]) if topic_counts else None
        dominant_topic = topics_map.get(dom_topic_id) if dom_topic_id else None
        points.append(HeatmapPoint(
            id=s["id"], name=s["name"], code=s["code"],
            lat=lat, lng=lng, avg_sentiment=round(avg_s, 4), volume=total,
            urgency_score=_urgency(neg, total, avg_s), dominant_topic=dominant_topic,
            positive_count=pos, negative_count=neg, neutral_count=neu,
        ))

    general_cache[cache_key_hist] = points
    return points
