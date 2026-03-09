"""Heatmap data endpoints."""

import asyncio
from fastapi import APIRouter, Query
from app.core.supabase_client import get_supabase_admin
from app.core.cache import general_cache
from app.services.snapshot_service import get_or_compute_snapshot
from app.models.schemas import HeatmapPoint

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
):
    """Get state-level heatmap data with optional filters."""
    period_hours = TIME_RANGE_HOURS.get(time_range, 720)
    cache_key = f"heatmap_states:{time_range}:{topic or 'all'}"
    if cache_key in general_cache:
        return general_cache[cache_key]

    sb = get_supabase_admin()
    states = sb.table("states").select("id, name, code").execute()

    # Pre-fetch all topics
    topics = {t["id"]: t["name"] for t in (sb.table("topic_taxonomy").select("id, name").execute().data or [])}
    topic_id_filter = None
    if topic:
        topic_id_filter = next((tid for tid, name in topics.items() if name.lower() == topic.lower()), None)

    # Parallelize snapshot computation across all states
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

        points.append(
            HeatmapPoint(
                id=s["id"],
                name=s["name"],
                code=s["code"],
                lat=lat,
                lng=lng,
                avg_sentiment=snapshot["avg_sentiment_score"],
                volume=snapshot["total_entries"],
                dominant_topic=dominant_topic,
                positive_count=snapshot["positive_count"],
                negative_count=snapshot["negative_count"],
                neutral_count=snapshot["neutral_count"],
            )
        )

    general_cache[cache_key] = points
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
