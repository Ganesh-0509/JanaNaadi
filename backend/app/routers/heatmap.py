"""Heatmap data endpoints — authenticated."""

from fastapi import APIRouter, Depends, Query
from app.core.auth import require_analyst
from app.core.supabase_client import get_supabase_admin
from app.services.snapshot_service import get_or_compute_snapshot
from app.models.schemas import HeatmapPoint

router = APIRouter(prefix="/api/heatmap", tags=["heatmap"])


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


@router.get("/states", response_model=list[HeatmapPoint])
async def heatmap_states(user: dict = Depends(require_analyst)):
    """Get state-level heatmap data."""
    sb = get_supabase_admin()
    states = sb.table("states").select("id, name, code").execute()
    points = []
    for s in states.data or []:
        snapshot = await get_or_compute_snapshot("state", s["id"], period_hours=24)
        # States don't have lat/lng in our schema — use defaults or centroid
        points.append(
            HeatmapPoint(
                id=s["id"],
                name=s["name"],
                lat=0,
                lng=0,
                avg_sentiment=snapshot["avg_sentiment_score"],
                volume=snapshot["total_entries"],
                dominant_topic=None,
            )
        )
    return points


@router.get("/districts", response_model=list[HeatmapPoint])
async def heatmap_districts(
    state_id: int = Query(...),
    user: dict = Depends(require_analyst),
):
    """Get district-level heatmap data for a state."""
    return await _build_heatmap_points("districts", "state_id", state_id, "district", "district_id")


@router.get("/constituencies", response_model=list[HeatmapPoint])
async def heatmap_constituencies(
    district_id: int = Query(...),
    user: dict = Depends(require_analyst),
):
    """Get constituency-level heatmap data for a district."""
    return await _build_heatmap_points(
        "constituencies", "district_id", district_id, "constituency", "constituency_id"
    )


@router.get("/wards", response_model=list[HeatmapPoint])
async def heatmap_wards(
    constituency_id: int = Query(...),
    user: dict = Depends(require_analyst),
):
    """Get ward-level heatmap data for a constituency."""
    return await _build_heatmap_points(
        "wards", "constituency_id", constituency_id, "ward", "ward_id"
    )
