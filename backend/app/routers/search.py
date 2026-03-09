"""Search endpoints."""

from fastapi import APIRouter, Query
from app.core.supabase_client import get_supabase_admin
from app.models.schemas import SentimentEntryBrief

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/entries", response_model=list[SentimentEntryBrief])
async def search_entries(
    q: str = Query("", description="Search text"),
    state: str | None = Query(None),
    district: str | None = Query(None),
    constituency: str | None = Query(None),
    state_id: int | None = Query(None),
    district_id: int | None = Query(None),
    constituency_id: int | None = Query(None),
    sentiment: str | None = Query(None),
    topic: str | None = Query(None),
    source: str | None = Query(None),
    language: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
):
    """Full-text search across sentiment entries with filters."""
    sb = get_supabase_admin()
    query = sb.table("sentiment_entries").select(
        "id, cleaned_text, sentiment, sentiment_score, primary_topic_id, state_id, published_at"
    )

    if q:
        query = query.ilike("cleaned_text", f"%{q}%")
    if sentiment:
        query = query.eq("sentiment", sentiment)
    if source:
        query = query.eq("source", source)
    if language:
        query = query.eq("language", language)

    # Direct ID filters (preferred — no extra DB lookups)
    if state_id:
        query = query.eq("state_id", state_id)
    elif state:
        # Try exact code match first, then name match
        state_row = sb.table("states").select("id").eq("code", state.upper()).limit(1).execute()
        if not state_row.data:
            state_row = sb.table("states").select("id").ilike("name", f"%{state}%").limit(1).execute()
        if state_row.data:
            query = query.eq("state_id", state_row.data[0]["id"])
    if district_id:
        query = query.eq("district_id", district_id)
    elif district:
        dist_row = sb.table("districts").select("id").ilike("name", f"%{district}%").limit(1).execute()
        if dist_row.data:
            query = query.eq("district_id", dist_row.data[0]["id"])
    if constituency_id:
        query = query.eq("constituency_id", constituency_id)
    elif constituency:
        con_row = sb.table("constituencies").select("id").ilike("name", f"%{constituency}%").limit(1).execute()
        if con_row.data:
            query = query.eq("constituency_id", con_row.data[0]["id"])

    result = (
        query.order("ingested_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    entries = []
    for e in result.data or []:
        entries.append(
            SentimentEntryBrief(
                id=e["id"],
                text=e.get("cleaned_text", ""),
                sentiment=e.get("sentiment", "neutral"),
                sentiment_score=e.get("sentiment_score", 0),
                topic=None,
                location=None,
                date=e.get("published_at"),
            )
        )
    return entries
