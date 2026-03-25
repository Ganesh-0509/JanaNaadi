"""Search endpoints."""

from fastapi import APIRouter, Query, Request
from app.core.supabase_client import get_supabase_admin
from app.core.rate_limiter import limiter
from app.models.schemas import SentimentEntryBrief
from app.services.bytez_service import call_bytez_model

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
        "id, cleaned_text, sentiment, sentiment_score, primary_topic_id, state_id, source, source_url, published_at"
    )

    if q:
        query = query.ilike("cleaned_text", f"%{q}%")
    if sentiment:
        query = query.eq("sentiment", sentiment)
    if source:
        query = query.eq("source", source)
    if language:
        query = query.eq("language", language)
    if topic:
        topic_row = sb.table("topic_taxonomy").select("id").ilike("name", f"%{topic}%").limit(1).execute()
        if topic_row.data:
            query = query.eq("primary_topic_id", topic_row.data[0]["id"])

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

    # Batch-resolve state names and topic names in 2 queries instead of N
    state_ids = list({e["state_id"] for e in result.data or [] if e.get("state_id")})
    state_name_map: dict[int, str] = {}
    if state_ids:
        sr = sb.table("states").select("id,name").in_("id", state_ids).execute()
        state_name_map = {s["id"]: s["name"] for s in sr.data or []}

    topic_ids = list({e["primary_topic_id"] for e in result.data or [] if e.get("primary_topic_id")})
    topic_name_map: dict[int, str] = {}
    if topic_ids:
        tr = sb.table("topic_taxonomy").select("id,name").in_("id", topic_ids).execute()
        topic_name_map = {t["id"]: t["name"] for t in tr.data or []}

    entries = []
    for e in result.data or []:
        entries.append(
            SentimentEntryBrief(
                id=e["id"],
                text=e.get("cleaned_text", ""),
                sentiment=e.get("sentiment", "neutral"),
                sentiment_score=e.get("sentiment_score", 0),
                topic=topic_name_map.get(e.get("primary_topic_id")),
                location=state_name_map.get(e.get("state_id")),
                source=e.get("source"),
                source_url=e.get("source_url"),
                date=e.get("published_at"),
            )
        )
    return entries


@router.post("/summarize")
@limiter.limit("15/minute")  # Rate limit: AI summarization is expensive
async def summarize_search(
    request: Request,
    q: str = Query("", description="Search query"),
    limit: int = Query(100, le=200, description="Number of recent entries to analyze"),
):
    """
    Generate an AI summary of sentiment entries matching the search query.
    Returns key patterns, trends, and sentiment overview from the voices.
    
    Rate limited to 15 requests/minute to prevent API quota exhaustion.
    """
    sb = get_supabase_admin()
    
    # Fetch recent matching entries
    query = sb.table("sentiment_entries").select("cleaned_text, sentiment, sentiment_score, primary_topic_id")
    
    if q:
        query = query.ilike("cleaned_text", f"%{q}%")
    
    result = query.order("published_at", desc=True).limit(limit).execute()
    
    if not result.data or len(result.data) == 0:
        return {
            "summary": "No voices found matching your search query.",
            "sentiment_overview": "neutral",
            "key_themes": [],
            "entry_count": 0
        }
    
    entries = result.data
    entry_count = len(entries)
    
    # Calculate sentiment distribution
    pos_count = sum(1 for e in entries if e["sentiment"] == "positive")
    neg_count = sum(1 for e in entries if e["sentiment"] == "negative")
    neu_count = sum(1 for e in entries if e["sentiment"] == "neutral")
    avg_score = sum(e.get("sentiment_score", 0) for e in entries) / entry_count
    
    # Determine overall sentiment
    if neg_count > pos_count and neg_count > neu_count:
        overall_sentiment = "negative"
    elif pos_count > neg_count and pos_count > neu_count:
        overall_sentiment = "positive"
    else:
        overall_sentiment = "neutral"
    
    # Sample up to 30 voices for the AI to analyze (to keep token count reasonable)
    sample_texts = [e["cleaned_text"][:200] for e in entries[:30]]
    
    import hashlib
    prompt = f"""Analyze these citizen voices from India about \"{q}\" and provide a concise summary.

Search query: {q}
Number of voices: {entry_count}
Sentiment breakdown: {pos_count} positive, {neu_count} neutral, {neg_count} negative
Average sentiment score: {avg_score:.2f}

Sample of recent voices:
{chr(10).join(f'- {t}' for t in sample_texts[:15])}

Provide:
1. A 2-3 sentence summary of the main concerns/themes
2. Top 3-5 key themes or topics mentioned
3. Notable sentiment patterns (what's driving positive/negative sentiment)

Format as JSON:
{{
  "summary": "2-3 sentence overview",
  "key_themes": ["theme1", "theme2", "theme3"],
  "sentiment_analysis": "what's driving the sentiment"
}}"""

    cache_key = hashlib.sha256(prompt.encode()).hexdigest()
    if not hasattr(summarize_search, "_summary_cache"):
        summarize_search._summary_cache = {}
    cache = summarize_search._summary_cache
    if cache_key in cache:
        ai_result = cache[cache_key]
    else:
        try:
            # OPTIMIZATION: Reduced token limit 400→300 (25% savings)
            result_text = await call_bytez_model(prompt, max_tokens=300)
            import json
            ai_result = json.loads(result_text)
            cache[cache_key] = ai_result
        except Exception:
            # Fallback if AI parsing fails
            ai_result = {
                "summary": f"Found {entry_count} voices discussing '{q}'. Sentiment is {overall_sentiment} with an average score of {avg_score:.2f}.",
                "key_themes": [],
                "sentiment_analysis": f"{pos_count} positive, {neu_count} neutral, {neg_count} negative voices."
            }

    return {
        "summary": ai_result.get("summary", ""),
        "key_themes": ai_result.get("key_themes", []),
        "sentiment_analysis": ai_result.get("sentiment_analysis", ""),
        "sentiment_overview": overall_sentiment,
        "entry_count": entry_count,
        "sentiment_distribution": {
            "positive": pos_count,
            "neutral": neu_count,
            "negative": neg_count
        }
    }
