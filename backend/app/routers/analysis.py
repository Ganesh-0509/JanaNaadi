"""Analysis / drill-down endpoints."""

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Path
from app.core.supabase_client import get_supabase_admin
from app.services.snapshot_service import get_or_compute_snapshot
from app.models.schemas import RegionAnalysis, SentimentDistribution, SentimentEntryBrief

_logger = logging.getLogger("jananaadi.analysis")

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

    # Source / language distribution — use a larger window to avoid skew on states with 500+ entries
    q = (
        sb.table("sentiment_entries")
        .select("source, language, sentiment, sentiment_score, cleaned_text, published_at, primary_topic_id, ingested_at")
    )
    if scope_type != "national":
        q = q.eq(f"{scope_type}_id", scope_id)
    entries = q.order("ingested_at", desc=True).limit(1000).execute()

    source_dist: dict[str, int] = {}
    lang_dist: dict[str, int] = {}
    day_buckets: dict[str, list[str]] = defaultdict(list)  # date -> [sentiment, ...]
    for e in entries.data or []:
        source_dist[e.get("source", "unknown")] = source_dist.get(e.get("source", "unknown"), 0) + 1
        lang_dist[e.get("language", "unknown")] = lang_dist.get(e.get("language", "unknown"), 0) + 1
        if e.get("ingested_at"):
            day_buckets[e["ingested_at"][:10]].append(e.get("sentiment", "neutral"))

    # Build trend arrays from day_buckets
    def _build_trend(days: int) -> list[dict]:
        now = datetime.now(timezone.utc)
        points = []
        for offset in range(days, 0, -1):
            day = (now - timedelta(days=offset)).strftime("%Y-%m-%d")
            sents = day_buckets.get(day, [])
            total_day = len(sents)
            if total_day == 0:
                points.append({"date": day, "positive_pct": 0, "negative_pct": 0, "neutral_pct": 0, "volume": 0})
            else:
                pos = sents.count("positive")
                neg = sents.count("negative")
                points.append({
                    "date": day,
                    "positive_pct": round(pos / total_day * 100, 1),
                    "negative_pct": round(neg / total_day * 100, 1),
                    "neutral_pct": round((total_day - pos - neg) / total_day * 100, 1),
                    "volume": total_day,
                })
        return points

    # Resolve topic names for recent entries in one batch
    topic_ids_needed = [
        e.get("primary_topic_id") for e in (entries.data or [])[:20]
        if e.get("primary_topic_id")
    ]
    topic_name_map: dict[int, str] = {}
    if topic_ids_needed:
        tr = sb.table("topic_taxonomy").select("id,name").in_("id", list(set(topic_ids_needed))).execute()
        topic_name_map = {r["id"]: r["name"] for r in tr.data or []}

    # Recent entries
    recent = [
        SentimentEntryBrief(
            id="00000000-0000-0000-0000-000000000000",
            text=e.get("cleaned_text", ""),
            sentiment=e.get("sentiment", "neutral"),
            sentiment_score=e.get("sentiment_score", 0),
            topic=topic_name_map.get(e.get("primary_topic_id")) if e.get("primary_topic_id") else None,
            location=name,
            date=e.get("published_at"),
        )
        for e in (entries.data or [])[:20]
    ]

    return RegionAnalysis(
        name=name,
        sentiment_distribution=dist,
        avg_sentiment=snapshot["avg_sentiment_score"],
        topic_breakdown=topic_breakdown,
        language_breakdown=lang_dist,
        source_distribution=source_dist,
        trend_7d=_build_trend(7),
        trend_30d=_build_trend(30),
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


@router.get("/summarize/{scope_type}/{scope_id}")
async def summarize_region(
    scope_type: str = Path(...),
    scope_id: str = Path(...),
):
    """Generate a Gemini AI policy summary for a region's citizen concerns."""
    sb = get_supabase_admin()

    # Resolve region name + integer ID
    scope_int: int | None = None
    if scope_type == "national":
        name = "India"
    elif scope_id.isdigit():
        scope_int = int(scope_id)
        table_map = {"state": "states", "district": "districts", "constituency": "constituencies", "ward": "wards"}
        table = table_map.get(scope_type, "states")
        row = sb.table(table).select("name").eq("id", scope_int).limit(1).execute()
        name = row.data[0]["name"] if row.data else f"{scope_type} #{scope_id}"
    else:
        row = sb.table("states").select("id,name").eq("code", scope_id.upper()).limit(1).execute()
        if row.data:
            scope_int = row.data[0]["id"]
            name = row.data[0]["name"]
        else:
            name = scope_id

    snapshot = await get_or_compute_snapshot(scope_type, scope_int, period_hours=720)

    # Sample recent voices — fetch original_text (raw bytes as submitted) so Gemini
    # reads the citizen's own words in their language (Tamil, Hindi, etc.) directly.
    q = sb.table("sentiment_entries").select("original_text,cleaned_text,sentiment,language")
    if scope_type != "national" and scope_int:
        q = q.eq(f"{scope_type}_id", scope_int)
    voices_res = q.order("ingested_at", desc=True).limit(30).execute()

    # Build voice lines: prefer original_text; fall back to cleaned_text
    voice_lines: list[str] = []
    for e in (voices_res.data or []):
        text = (e.get("original_text") or e.get("cleaned_text") or "").strip()
        if text:
            lang = e.get("language") or "en"
            sentiment = e.get("sentiment") or "neutral"
            voice_lines.append(f"[{lang.upper()} / {sentiment}] {text}")
    voice_lines = voice_lines[:25]

    # Resolve top topic names in one batch
    topic_ids = [t["topic_id"] for t in snapshot.get("top_topics", [])[:5]]
    topic_names: list[str] = []
    if topic_ids:
        tr = sb.table("topic_taxonomy").select("id,name").in_("id", topic_ids).execute()
        id_to_name = {r["id"]: r["name"] for r in tr.data or []}
        topic_names = [id_to_name[tid] for tid in topic_ids if tid in id_to_name]

    prompt = (
        f"You are a senior government policy analyst reviewing real citizen voices submitted to a public "
        f"sentiment platform for {name}, India.\n\n"
        f"Aggregate statistics:\n"
        f"- Total voices: {snapshot['total_entries']}\n"
        f"- Avg sentiment score: {snapshot['avg_sentiment_score']:.2f}  (-1 = very negative, +1 = very positive)\n"
        f"- Positive: {snapshot.get('positive_count', 0)}  Negative: {snapshot.get('negative_count', 0)}  Neutral: {snapshot.get('neutral_count', 0)}\n"
        f"- Top issues: {', '.join(topic_names) if topic_names else 'various civic concerns'}\n\n"
        "Actual citizen voices (in their own language — Tamil, Hindi, English, etc.):\n"
        + "\n".join(f"  {i+1}. {v}" for i, v in enumerate(voice_lines))
        + "\n\nBased on these real voices, write a concise 3-sentence policy brief in English: "
        "(1) what citizens are most urgently concerned about with specific examples, "
        "(2) the overall emotional tone and scale of the problem, "
        "(3) one concrete, department-specific recommendation for policymakers. "
        "Be direct, use plain language, no bullet points."
    )

    try:
        from app.core.settings import get_settings
        settings = get_settings()
        if settings.use_local_llm:
            from app.services.local_llm_service import generate_text
            summary = await generate_text(prompt, max_tokens=500)
        else:
            from app.services.gemini_service import call_gemini_text
            summary = await call_gemini_text(prompt)
    except Exception as exc:
        _logger.warning("LLM summarize failed: %s", exc)
        summary = (
            f"Citizens in {name} have submitted {snapshot['total_entries']} voices with an average "
            f"sentiment score of {snapshot['avg_sentiment_score']:.2f}. "
            f"Top concerns include {', '.join(topic_names[:3]) if topic_names else 'various civic matters'}. "
            "Policymakers should prioritize direct engagement with these high-frequency issues."
        )

    return {"summary": summary, "region": name, "total_voices": snapshot["total_entries"]}
