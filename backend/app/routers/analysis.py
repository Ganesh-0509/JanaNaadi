"""Analysis / drill-down endpoints."""

from fastapi import APIRouter, Path
from app.core.supabase_client import get_supabase_admin
from app.services.snapshot_service import get_or_compute_snapshot
from app.models.schemas import RegionAnalysis, SentimentDistribution, SentimentEntryBrief

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


async def _region_analysis(scope_type: str, scope_id: int) -> RegionAnalysis:
    """Build full analysis for a region."""
    sb = get_supabase_admin()

    # Get region name
    if scope_type == "national":
        name = "India"
    else:
        table_map = {
            "constituency": "constituencies",
            "ward": "wards",
            "district": "districts",
            "state": "states",
        }
        table = table_map.get(scope_type, "states")
        region = sb.table(table).select("name").eq("id", scope_id).limit(1).execute()
        name = region.data[0]["name"] if region.data else f"{scope_type} #{scope_id}"

    # Get snapshot — use 720h (30 days) to capture all data
    sid = None if scope_type == "national" else scope_id
    snapshot = await get_or_compute_snapshot(scope_type, sid, period_hours=720)

    # Sentiment distribution
    dist = SentimentDistribution(
        positive=snapshot["positive_count"],
        negative=snapshot["negative_count"],
        neutral=snapshot["neutral_count"],
        total=snapshot["total_entries"],
    )

    # Topic breakdown
    topic_breakdown = []
    for t in snapshot.get("top_topics", []):
        topic = sb.table("topic_taxonomy").select("name").eq("id", t["topic_id"]).limit(1).execute()
        topic_name = topic.data[0]["name"] if topic.data else f"Topic {t['topic_id']}"
        topic_breakdown.append({"topic": topic_name, "count": t["count"]})

    # Source distribution
    query = (
        sb.table("sentiment_entries")
        .select("source, language, sentiment, sentiment_score, cleaned_text, published_at")
    )
    if scope_type != "national":
        query = query.eq(f"{scope_type}_id", scope_id)
    entries = (
        query.order("ingested_at", desc=True)
        .limit(200)
        .execute()
    )
    source_dist: dict[str, int] = {}
    lang_dist: dict[str, int] = {}
    for e in entries.data or []:
        src = e.get("source", "unknown")
        source_dist[src] = source_dist.get(src, 0) + 1
        lang = e.get("language", "unknown")
        lang_dist[lang] = lang_dist.get(lang, 0) + 1

    # Recent entries
    recent = []
    for e in (entries.data or [])[:20]:
        recent.append(
            SentimentEntryBrief(
                id="00000000-0000-0000-0000-000000000000",
                text=e.get("cleaned_text", ""),
                sentiment=e.get("sentiment", "neutral"),
                sentiment_score=e.get("sentiment_score", 0),
                topic=None,
                location=name,
                date=e.get("published_at"),
            )
        )

    return RegionAnalysis(
        name=name,
        sentiment_distribution=dist,
        avg_sentiment=snapshot["avg_sentiment_score"],
        topic_breakdown=topic_breakdown,
        language_breakdown=lang_dist,
        source_distribution=source_dist,
        recent_entries=recent,
    )


@router.get("/national/{scope_id}", response_model=RegionAnalysis)
async def national_analysis(scope_id: int = Path(...)):
    """National-level analysis."""
    return await _region_analysis("national", scope_id)


@router.get("/constituency/{constituency_id}", response_model=RegionAnalysis)
async def constituency_analysis(constituency_id: int = Path(...)):
    """Full analysis for a constituency."""
    return await _region_analysis("constituency", constituency_id)


@router.get("/ward/{ward_id}", response_model=RegionAnalysis)
async def ward_analysis(ward_id: int = Path(...)):
    """Full analysis for a ward."""
    return await _region_analysis("ward", ward_id)


@router.get("/district/{district_id}", response_model=RegionAnalysis)
async def district_analysis(district_id: int = Path(...)):
    """Full analysis for a district."""
    return await _region_analysis("district", district_id)


@router.get("/state/{state_id}", response_model=RegionAnalysis)
async def state_analysis(state_id: str = Path(...)):
    """Full analysis for a state. Accepts numeric ID or state code."""
    sb = get_supabase_admin()
    # Support state code (e.g. "TN") or numeric ID
    if state_id.isdigit():
        return await _region_analysis("state", int(state_id))
    # Lookup by code
    row = sb.table("states").select("id").eq("code", state_id.upper()).limit(1).execute()
    if row.data:
        return await _region_analysis("state", row.data[0]["id"])
    # Fallback: try name match
    row = sb.table("states").select("id").ilike("name", f"%{state_id}%").limit(1).execute()
    if row.data:
        return await _region_analysis("state", row.data[0]["id"])
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail=f"State '{state_id}' not found")
