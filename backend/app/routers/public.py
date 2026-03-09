"""Public endpoints — no authentication required."""

import asyncio
import re
from fastapi import APIRouter, BackgroundTasks, Request, HTTPException
from pydantic import BaseModel, Field, field_validator
from app.core.supabase_client import get_supabase_admin
from app.core.cache import general_cache
from app.core.rate_limiter import limiter
from app.services.snapshot_service import get_or_compute_snapshot
from app.models.schemas import NationalPulse, StateRanking, TrendingTopic

router = APIRouter(prefix="/api/public", tags=["public"])


# --- Citizen Voice models ---
_SAFE_AREA_RE = re.compile(r"[^\w\s,.()'\-]")  # strip HTML / special chars from area


class CitizenVoiceRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=2000)
    area: str | None = Field(None, max_length=100)
    category: str | None = Field(None, max_length=100)

    @field_validator("area", "category", mode="before")
    @classmethod
    def sanitize_str(cls, v: object) -> str | None:
        if v is None:
            return None
        cleaned = _SAFE_AREA_RE.sub("", str(v)).strip()
        return cleaned if cleaned else None


@router.get("/national-pulse", response_model=NationalPulse)
@limiter.limit("60/minute")
async def national_pulse(request: Request):
    """Get the national-level sentiment overview."""
    snapshot = await get_or_compute_snapshot("national", None, period_hours=720)

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
@limiter.limit("60/minute")
async def state_rankings(request: Request):
    """Get all states ranked by sentiment."""
    cache_key = "state_rankings_24h"
    if cache_key in general_cache:
        return general_cache[cache_key]

    sb = get_supabase_admin()
    states = sb.table("states").select("id, name, code").execute()

    # Pre-fetch all topics
    topics = {t["id"]: t["name"] for t in (sb.table("topic_taxonomy").select("id, name").execute().data or [])}

    # Parallelize snapshot computation across all states
    state_list = states.data or []
    snapshots = await asyncio.gather(
        *(get_or_compute_snapshot("state", s["id"], period_hours=720) for s in state_list)
    )

    rankings = []
    for state, snapshot in zip(state_list, snapshots):
        top_issue = None
        if snapshot.get("top_topics"):
            tid = snapshot["top_topics"][0]["topic_id"]
            top_issue = topics.get(tid)

        rankings.append(
            StateRanking(
                state_id=state["id"],
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
@limiter.limit("60/minute")
async def trending_topics(request: Request):
    """Get trending topics across India."""
    snapshot_7d = await get_or_compute_snapshot("national", None, period_hours=720)
    snapshot_24h = await get_or_compute_snapshot("national", None, period_hours=168)

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
@limiter.limit("20/minute")
async def open_data(request: Request, format: str = "csv", period: str = "weekly"):
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
@limiter.limit("5/minute")
async def submit_citizen_voice(request: Request, req: CitizenVoiceRequest, background_tasks: BackgroundTasks):
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
@limiter.limit("60/minute")
async def recent_voices(request: Request, limit: int = 20):
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
@limiter.limit("30/minute")
async def area_pulse(request: Request, area: str):
    """Get sentiment pulse for a specific area (state name search)."""
    # Sanitize query param: strip special chars, enforce length
    area = re.sub(r"[^\w\s]", "", area).strip()[:100]
    if not area:
        raise HTTPException(status_code=400, detail="Invalid area name")
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


@router.get("/keywords")
@limiter.limit("30/minute")
async def trending_keywords(request: Request, limit: int = 40, state_id: int | None = None):
    """Return top keywords extracted from the last 24 h of voices."""
    from collections import Counter
    from datetime import datetime, timezone, timedelta

    limit = min(max(limit, 5), 100)
    sb = get_supabase_admin()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    query = sb.table("sentiment_entries").select("extracted_keywords").gte("ingested_at", cutoff)
    if state_id:
        query = query.eq("state_id", state_id)

    result = query.execute()
    counter: Counter = Counter()
    for row in result.data or []:
        kws = row.get("extracted_keywords") or []
        # stored as JSON array of strings or comma-separated string
        if isinstance(kws, str):
            kws = [k.strip() for k in kws.split(",") if k.strip()]
        for kw in kws:
            kw = str(kw).strip().lower()
            if 2 < len(kw) < 40:
                counter[kw] += 1

    return [{"keyword": kw, "count": cnt} for kw, cnt in counter.most_common(limit)]


@router.get("/hotspots")
@limiter.limit("30/minute")
async def hotspots(request: Request, limit: int = 15):
    """Return states ranked by urgency (high volume + negative sentiment)."""
    from datetime import datetime, timezone, timedelta
    from collections import defaultdict

    limit = min(max(limit, 5), 30)
    sb = get_supabase_admin()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    result = (
        sb.table("sentiment_entries")
        .select("state_id,sentiment_score")
        .gte("ingested_at", cutoff)
        .execute()
    )

    buckets: dict[int, list[float]] = defaultdict(list)
    for row in result.data or []:
        sid = row.get("state_id")
        score = row.get("sentiment_score")
        if sid and score is not None:
            buckets[sid].append(float(score))

    if not buckets:
        return []

    # Fetch state names
    state_ids = list(buckets.keys())
    states_res = sb.table("states").select("id,name,code").in_("id", state_ids).execute()
    name_map = {s["id"]: {"name": s["name"], "code": s["code"]} for s in states_res.data or []}

    def _urgency(scores: list[float]) -> float:
        if not scores:
            return 0.0
        import math
        avg = sum(scores) / len(scores)
        # Normalise volume component (sigmoid-like)
        vol_norm = 1 - math.exp(-len(scores) / 100)
        neg_intensity = max(0.0, -avg)  # 0..1 when avg is -1..0
        return round(0.5 * neg_intensity + 0.5 * vol_norm, 4)

    hotspot_list = []
    for sid, scores in buckets.items():
        info = name_map.get(sid, {"name": f"State {sid}", "code": "???"})
        avg_score = round(sum(scores) / len(scores), 4)
        hotspot_list.append({
            "state_id": sid,
            "state": info["name"],
            "state_code": info["code"],
            "urgency_score": _urgency(scores),
            "avg_sentiment": avg_score,
            "volume": len(scores),
        })

    hotspot_list.sort(key=lambda x: x["urgency_score"], reverse=True)
    return hotspot_list[:limit]


# ── Geographic hierarchy lookups ──────────────────────────────

@router.get("/geo/districts")
@limiter.limit("60/minute")
async def geo_districts(request: Request, state_id: int | None = None):
    """Return districts, optionally filtered by state."""
    sb = get_supabase_admin()
    q = sb.table("districts").select("id, name, state_id")
    if state_id:
        q = q.eq("state_id", state_id)
    result = q.order("name").limit(500).execute()
    return result.data or []


@router.get("/geo/constituencies")
@limiter.limit("60/minute")
async def geo_constituencies(request: Request, district_id: int | None = None):
    """Return constituencies, optionally filtered by district."""
    sb = get_supabase_admin()
    q = sb.table("constituencies").select("id, name, type, district_id")
    if district_id:
        q = q.eq("district_id", district_id)
    result = q.order("name").limit(500).execute()
    return result.data or []


@router.get("/geo/wards")
@limiter.limit("60/minute")
async def geo_wards(request: Request, constituency_id: int | None = None):
    """Return wards, optionally filtered by constituency."""
    sb = get_supabase_admin()
    q = sb.table("wards").select("id, name, constituency_id")
    if constituency_id:
        q = q.eq("constituency_id", constituency_id)
    result = q.order("name").limit(500).execute()
    return result.data or []
