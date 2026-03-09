"""Public endpoints — no authentication required."""

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel, Field
from app.core.supabase_client import get_supabase_admin
from app.core.cache import general_cache
from app.services.snapshot_service import get_or_compute_snapshot
from app.models.schemas import NationalPulse, StateRanking, TrendingTopic

router = APIRouter(prefix="/api/public", tags=["public"])


# --- Citizen Voice models ---
class CitizenVoiceRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=2000)
    area: str | None = Field(None, max_length=200)
    category: str | None = Field(None, max_length=100)


@router.get("/national-pulse", response_model=NationalPulse)
async def national_pulse():
    """Get the national-level sentiment overview."""
    snapshot = await get_or_compute_snapshot("national", None, period_hours=24)

    total = snapshot["total_entries"]
    pos = snapshot["positive_count"]
    neg = snapshot["negative_count"]
    avg = snapshot["avg_sentiment_score"]

    # Build top issues from top_topics
    sb = get_supabase_admin()
    top_issues = []
    top_positive = []
    for t in snapshot.get("top_topics", [])[:5]:
        topic = sb.table("topic_taxonomy").select("name").eq("id", t["topic_id"]).limit(1).execute()
        name = topic.data[0]["name"] if topic.data else f"Topic {t['topic_id']}"
        top_issues.append({"topic": name, "count": t["count"]})

    return NationalPulse(
        avg_sentiment=avg,
        total_entries_24h=total,
        positive_count=pos,
        negative_count=neg,
        neutral_count=max(0, total - pos - neg),
        top_3_issues=top_issues[:3],
        top_3_positive=top_positive[:3],
        language_breakdown=snapshot.get("language_distribution", {}),
    )


@router.get("/state-rankings", response_model=list[StateRanking])
async def state_rankings():
    """Get all states ranked by sentiment."""
    cache_key = "state_rankings_24h"
    if cache_key in general_cache:
        return general_cache[cache_key]

    sb = get_supabase_admin()
    states = sb.table("states").select("id, name, code").execute()

    rankings = []
    for state in states.data or []:
        snapshot = await get_or_compute_snapshot("state", state["id"], period_hours=24)
        top_issue = None
        if snapshot.get("top_topics"):
            tid = snapshot["top_topics"][0]["topic_id"]
            topic = sb.table("topic_taxonomy").select("name").eq("id", tid).limit(1).execute()
            top_issue = topic.data[0]["name"] if topic.data else None

        rankings.append(
            StateRanking(
                state=state["name"],
                state_code=state["code"],
                avg_sentiment=snapshot["avg_sentiment_score"],
                volume=snapshot["total_entries"],
                top_issue=top_issue,
            )
        )

    rankings.sort(key=lambda r: r.avg_sentiment, reverse=True)
    general_cache[cache_key] = rankings
    return rankings


@router.get("/trending-topics", response_model=list[TrendingTopic])
async def trending_topics():
    """Get trending topics across India."""
    snapshot_7d = await get_or_compute_snapshot("national", None, period_hours=168)
    snapshot_24h = await get_or_compute_snapshot("national", None, period_hours=24)

    sb = get_supabase_admin()
    topics_7d = {t["topic_id"]: t["count"] for t in snapshot_7d.get("top_topics", [])}
    topics_24h = {t["topic_id"]: t["count"] for t in snapshot_24h.get("top_topics", [])}

    trending = []
    for tid, count_24h in topics_24h.items():
        count_7d = topics_7d.get(tid, 1)
        daily_avg_7d = count_7d / 7
        change = ((count_24h - daily_avg_7d) / max(daily_avg_7d, 1)) * 100

        topic = sb.table("topic_taxonomy").select("name").eq("id", tid).limit(1).execute()
        name = topic.data[0]["name"] if topic.data else f"Topic {tid}"

        # Calculate sentiment trend for this topic
        from datetime import datetime, timedelta, timezone
        now = datetime.now(timezone.utc)
        day_ago = (now - timedelta(hours=24)).isoformat()
        two_days_ago = (now - timedelta(hours=48)).isoformat()

        recent = sb.table("sentiment_entries").select("sentiment_score").eq("primary_topic_id", tid).gte("published_at", day_ago).execute()
        prev = sb.table("sentiment_entries").select("sentiment_score").eq("primary_topic_id", tid).gte("published_at", two_days_ago).lt("published_at", day_ago).execute()

        avg_recent = sum(e["sentiment_score"] for e in recent.data) / max(len(recent.data), 1) if recent.data else 0
        avg_prev = sum(e["sentiment_score"] for e in prev.data) / max(len(prev.data), 1) if prev.data else 0
        s_trend = round(avg_recent - avg_prev, 3)

        trending.append(
            TrendingTopic(
                topic=name,
                mention_count=count_24h,
                sentiment_trend=s_trend,
                seven_day_change=round(change, 1),
            )
        )

    trending.sort(key=lambda t: t.mention_count, reverse=True)
    return trending[:10]


@router.get("/open-data")
async def open_data(format: str = "csv", period: str = "weekly"):
    """Download anonymized aggregate data as CSV."""
    from fastapi.responses import StreamingResponse
    import csv
    import io

    snapshot = await get_or_compute_snapshot(
        "national", None, period_hours=168 if period == "weekly" else 720
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["metric", "value"])
    writer.writerow(["total_entries", snapshot["total_entries"]])
    writer.writerow(["positive_count", snapshot["positive_count"]])
    writer.writerow(["negative_count", snapshot["negative_count"]])
    writer.writerow(["neutral_count", snapshot["neutral_count"]])
    writer.writerow(["avg_sentiment_score", snapshot["avg_sentiment_score"]])

    for kw in snapshot.get("top_keywords", [])[:20]:
        writer.writerow(["top_keyword", kw])

    for lang, count in snapshot.get("language_distribution", {}).items():
        writer.writerow([f"language_{lang}", count])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=jananaadi_open_data_{period}.csv"},
    )


# ─────────────────────────────────────────────────────────────
#  CITIZEN VOICE endpoints — anonymous public participation
# ─────────────────────────────────────────────────────────────

@router.post("/voice")
async def submit_citizen_voice(req: CitizenVoiceRequest, background_tasks: BackgroundTasks):
    """Submit an anonymous citizen concern — no login required.
    
    Processes through full NLP pipeline in the background.
    """
    from app.routers.ingest import _process_and_store

    async def _process():
        import logging
        logger = logging.getLogger("jananaadi.citizen_voice")
        try:
            await _process_and_store(
                text=req.text,
                source="survey",
                location_hint=req.area,
            )
            logger.info("Citizen voice processed successfully")
        except Exception as e:
            logger.error(f"Citizen voice processing failed: {e}")

    background_tasks.add_task(_process)
    return {
        "status": "received",
        "message": "Thank you! Your voice has been recorded and will be analyzed.",
    }


@router.get("/recent-voices")
async def recent_voices(limit: int = 20):
    """Get recent anonymized citizen submissions for the public feed."""
    sb = get_supabase_admin()
    result = (
        sb.table("sentiment_entries")
        .select("cleaned_text, sentiment, sentiment_score, primary_topic_id, state_id, published_at, source")
        .order("published_at", desc=True)
        .limit(min(limit, 50))
        .execute()
    )

    # Resolve topic names
    topics = {t["id"]: t["name"] for t in (sb.table("topic_taxonomy").select("id, name").execute().data or [])}
    states = {s["id"]: s["name"] for s in (sb.table("states").select("id, name").execute().data or [])}

    voices = []
    for e in (result.data or []):
        # Anonymize: truncate text, strip personal info
        text = (e.get("cleaned_text") or "")[:150]
        if len(e.get("cleaned_text", "")) > 150:
            text += "..."
        voices.append({
            "text": text,
            "sentiment": e.get("sentiment", "neutral"),
            "score": e.get("sentiment_score", 0),
            "topic": topics.get(e.get("primary_topic_id"), "General"),
            "state": states.get(e.get("state_id"), "India"),
            "time": e.get("published_at"),
            "source": e.get("source", "unknown"),
        })
    return voices


@router.get("/area-pulse")
async def area_pulse(area: str):
    """Get sentiment pulse for a specific area (state name search)."""
    sb = get_supabase_admin()

    # Find matching state
    states = sb.table("states").select("id, name, code").ilike("name", f"%{area}%").execute()
    if not states.data:
        return {"found": False, "message": f"No data found for '{area}'"}

    state = states.data[0]
    snapshot = await get_or_compute_snapshot("state", state["id"], period_hours=24)

    # Get top topics for this state
    topics_map = {t["id"]: t["name"] for t in (sb.table("topic_taxonomy").select("id, name").execute().data or [])}
    top_issues = []
    for t in snapshot.get("top_topics", [])[:3]:
        name = topics_map.get(t["topic_id"], "Other")
        top_issues.append({"topic": name, "count": t["count"]})

    return {
        "found": True,
        "state": state["name"],
        "state_code": state["code"],
        "avg_sentiment": snapshot["avg_sentiment_score"],
        "total_entries": snapshot["total_entries"],
        "positive": snapshot["positive_count"],
        "negative": snapshot["negative_count"],
        "neutral": snapshot["neutral_count"],
        "top_issues": top_issues,
    }
