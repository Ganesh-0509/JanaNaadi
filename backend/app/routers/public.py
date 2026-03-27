"""Public endpoints — no authentication required."""

import asyncio
import re
import json
import os
from collections import Counter
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, Request, HTTPException
from pydantic import BaseModel, Field, field_validator
from app.core.supabase_client import get_supabase_admin
from app.core.cache import general_cache
from app.core.rate_limiter import limiter
from app.services.snapshot_service import get_or_compute_snapshot
from app.models.schemas import NationalPulse, StateRanking, TrendingTopic

router = APIRouter(prefix="/api/public", tags=["public"])

# --- Load Factual MCD Ward Data ---
def _load_mcd_wards() -> list[dict]:
    """Load ward metadata from known project locations, independent of process CWD."""
    candidates = [
        Path(__file__).resolve().parents[3] / "data" / "mcd_wards.json",  # repo root/data
        Path(__file__).resolve().parents[2] / "data" / "mcd_wards.json",  # backend/data
        Path(os.getcwd()) / "data" / "mcd_wards.json",                    # legacy CWD lookup
    ]

    for path in candidates:
        try:
            if path.exists():
                with path.open("r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        return data
        except Exception:
            continue

    return []


MCD_WARDS = _load_mcd_wards()

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
    """MCD VERSION: Get the Delhi City sentiment overview."""
    # We use "national" snapshot internally to represent "MCD City Wide"
    snapshot = await get_or_compute_snapshot("national", None, period_hours=24)

    total = snapshot["total_entries"]
    pos = snapshot["positive_count"]
    neg = snapshot["negative_count"]
    avg = snapshot["avg_sentiment_score"]

    sb = get_supabase_admin()
    top_issues = []
    top_positive = []
    
    # Pre-fetch topic names
    topics_ids = [t["topic_id"] for t in snapshot.get("top_topics", [])]
    if topics_ids:
        res = sb.table("topic_taxonomy").select("id, name").in_("id", topics_ids).execute()
        topic_map = {r["id"]: r["name"] for r in res.data or []}
        for t in snapshot.get("top_topics", [])[:3]:
            name = topic_map.get(t["topic_id"], f"Topic {t['topic_id']}")
            top_issues.append({"topic": name, "count": t["count"]})

    return NationalPulse(
        avg_sentiment=avg,
        total_entries_24h=total,
        positive_count=pos,
        negative_count=neg,
        neutral_count=max(0, total - pos - neg),
        top_3_issues=top_issues,
        top_3_positive=top_positive,
        language_breakdown=snapshot.get("language_distribution", {}),
    )


@router.get("/state-rankings", response_model=list[StateRanking])
@limiter.limit("60/minute")
async def state_rankings(request: Request):
    """MCD VERSION: Get all Delhi Wards ranked by sentiment."""
    cache_key = "mcd_ward_rankings_24h"
    if cache_key in general_cache:
        return general_cache[cache_key]

    # Parallelize snapshot computation across the most active wards
    # For a real hackathon project, we compute for all 250, but for performance
    # we can focus on those with data in the last 30 days.
    # Here we simulate for a selection of 50 core wards for speed.
    active_wards = MCD_WARDS[:40]  # Keep rankings fast enough for interactive use
    
    snapshots = await asyncio.gather(
        *(get_or_compute_snapshot("ward", w["id"], period_hours=24) for w in active_wards)
    )

    # If there is no 24h activity, fall back to 7-day data so rankings are still informative.
    if snapshots and all((s.get("total_entries", 0) == 0) for s in snapshots):
        snapshots = await asyncio.gather(
            *(get_or_compute_snapshot("ward", w["id"], period_hours=168) for w in active_wards)
        )

    rankings = []
    for ward, snapshot in zip(active_wards, snapshots):
        rankings.append(
            StateRanking(
                state_id=ward["id"],
                state=ward["name"],
                state_code=f"W{ward['id']:03}", # Ward Code
                avg_sentiment=snapshot["avg_sentiment_score"],
                volume=snapshot["total_entries"],
                top_issue="General Infrastructure" if not snapshot.get("top_topics") else None,
            )
        )

    # Sort by sentiment score (highest first = best performing wards)
    rankings.sort(key=lambda r: r.avg_sentiment, reverse=True)
    general_cache[cache_key] = rankings
    return rankings


@router.get("/trending-topics", response_model=list[TrendingTopic])
@limiter.limit("60/minute")
async def trending_topics(request: Request):
    """MCD VERSION: Get trending topics across Delhi."""
    snapshot_7d = await get_or_compute_snapshot("national", None, period_hours=168)
    snapshot_24h = await get_or_compute_snapshot("national", None, period_hours=24)

    sb = get_supabase_admin()
    topics_7d = {t["topic_id"]: t["count"] for t in snapshot_7d.get("top_topics", [])}
    topics_24h = {t["topic_id"]: t["count"] for t in snapshot_24h.get("top_topics", [])}

    # Resolve names in bulk
    all_tids = list(set(list(topics_7d.keys()) + list(topics_24h.keys())))
    topic_map = {}
    if all_tids:
        res = sb.table("topic_taxonomy").select("id, name").in_("id", all_tids).execute()
        topic_map = {r["id"]: r["name"] for r in res.data or []}

    trending = []
    for tid, count_24h in topics_24h.items():
        count_7d = topics_7d.get(tid, 1)
        daily_avg_7d = count_7d / 7
        change = ((count_24h - daily_avg_7d) / max(daily_avg_7d, 1)) * 100

        name = topic_map.get(tid, f"Topic {tid}")

        trending.append(
            TrendingTopic(
                topic=name,
                mention_count=count_24h,
                sentiment_trend=0.0, # Simplified for MCD City demo
                seven_day_change=round(change, 1),
            )
        )

    trending.sort(key=lambda t: t.mention_count, reverse=True)
    return trending[:10]


@router.get("/area-pulse")
@limiter.limit("30/minute")
async def area_pulse(request: Request, area: str):
    """MCD VERSION: Get sentiment pulse for a specific Delhi Ward."""
    # Sanitize
    area_clean = re.sub(r"[^\w\s]", "", area).strip().lower()
    if not area_clean:
        raise HTTPException(status_code=400, detail="Invalid ward name")

    # Find matching ward from JSON
    matched_ward = None
    for w in MCD_WARDS:
        if area_clean in w["name"].lower():
            matched_ward = w
            break
    
    if not matched_ward:
        return {"found": False, "message": f"No MCD Ward found matching '{area}'"}

    snapshot = await get_or_compute_snapshot("ward", matched_ward["id"], period_hours=168)

    sb = get_supabase_admin()
    top_issues = []
    topic_ids = [t["topic_id"] for t in snapshot.get("top_topics", []) if t.get("topic_id") is not None]
    if topic_ids:
        topics_res = sb.table("topic_taxonomy").select("id, name").in_("id", topic_ids).execute()
        topic_map = {r["id"]: r["name"] for r in topics_res.data or []}
        for t in snapshot.get("top_topics", [])[:5]:
            topic_name = topic_map.get(t.get("topic_id"), f"Topic {t.get('topic_id')}")
            top_issues.append({"topic": topic_name, "count": t.get("count", 0)})

    return {
        "found": True,
        "state": f"{matched_ward['name']} (Ward {matched_ward['id']})",
        "state_code": f"W{matched_ward['id']:03}",
        "avg_sentiment": snapshot["avg_sentiment_score"],
        "total_entries": snapshot["total_entries"],
        "positive": snapshot["positive_count"],
        "negative": snapshot["negative_count"],
        "neutral": snapshot["neutral_count"],
        "top_issues": top_issues,
    }


@router.get("/hotspots")
@limiter.limit("30/minute")
async def hotspots(request: Request, limit: int = 15):
    """MCD VERSION: Return Delhi Wards ranked by urgency."""
    sb = get_supabase_admin()
    
    # Query sentiment entries with ward_id
    from datetime import datetime, timezone, timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    result = (
        sb.table("sentiment_entries")
        .select("ward_id, sentiment_score")
        .gte("ingested_at", cutoff)
        .order("ingested_at", desc=True)
        .limit(20000)
        .execute()
    )

    from collections import defaultdict
    buckets = defaultdict(list)
    for row in result.data or []:
        wid = row.get("ward_id")
        if wid is None:
            continue
        buckets[wid].append(float(row.get("sentiment_score") or 0))

    if not buckets:
        return []

    # Map Ward Data
    ward_map = {w["id"]: w for w in MCD_WARDS}

    hotspot_list = []
    for wid, scores in buckets.items():
        ward = ward_map.get(wid, {"name": f"Ward {wid}", "id": wid})
        avg = sum(scores) / len(scores)
        
        # Urgency: Volume + Negative Sentiment
        import math
        vol_norm = 1 - math.exp(-len(scores) / 50)
        neg_intensity = max(0.0, -avg)
        urgency = round(0.5 * neg_intensity + 0.5 * vol_norm, 4)

        hotspot_list.append({
            "state_id": wid,
            "state": ward.get("name"),
            "state_code": f"W{wid:03}",
            "urgency_score": urgency,
            "avg_sentiment": round(avg, 4),
            "volume": len(scores),
        })

    hotspot_list.sort(key=lambda x: x["urgency_score"], reverse=True)
    return hotspot_list[:limit]


@router.get("/recent-voices")
@limiter.limit("60/minute")
async def recent_voices(request: Request, limit: int = 20):
    """Return recent public-facing voices in a UI-friendly shape."""
    sb = get_supabase_admin()
    capped_limit = max(1, min(limit, 100))

    result = (
        sb.table("sentiment_entries")
        .select(
            "id, source_id, original_text, sentiment, sentiment_score, primary_topic_id, "
            "state_id, ward_id, source, language, ingested_at"
        )
        .order("ingested_at", desc=True)
        .limit(capped_limit)
        .execute()
    )

    rows = result.data or []
    if not rows:
        return []

    topic_ids = list({r.get("primary_topic_id") for r in rows if r.get("primary_topic_id") is not None})
    topic_map: dict[int, str] = {}
    if topic_ids:
        topics = sb.table("topic_taxonomy").select("id, name").in_("id", topic_ids).execute()
        topic_map = {t["id"]: t["name"] for t in topics.data or []}

    state_ids = list({r.get("state_id") for r in rows if r.get("state_id") is not None})
    state_map: dict[int, str] = {}
    if state_ids:
        try:
            states = sb.table("states").select("id, name").in_("id", state_ids).execute()
            state_map = {s["id"]: s["name"] for s in states.data or []}
        except Exception:
            state_map = {}

    ward_map = {w["id"]: w["name"] for w in MCD_WARDS}

    payload = []
    for row in rows:
        ward_id = row.get("ward_id")
        state_id = row.get("state_id")
        topic_id = row.get("primary_topic_id")
        text = row.get("original_text") or ""
        sentiment_score = float(row.get("sentiment_score") or 0)

        payload.append(
            {
                "id": row.get("id"),
                "source_id": row.get("source_id"),
                "text": text,
                "original_text": text,
                "sentiment": row.get("sentiment") or "neutral",
                "score": sentiment_score,
                "sentiment_score": sentiment_score,
                "topic": topic_map.get(topic_id, "General civic issues"),
                "state": ward_map.get(ward_id) or state_map.get(state_id) or "Delhi",
                "source": row.get("source") or "unknown",
                "language": row.get("language") or "en",
                "time": row.get("ingested_at"),
                "ingested_at": row.get("ingested_at"),
            }
        )

    return payload


@router.get("/keywords")
@limiter.limit("60/minute")
async def keywords(request: Request, limit: int = 40, state_id: int | None = None):
    """Return top extracted keywords from recent entries for cloud visualizations."""
    from datetime import datetime, timezone, timedelta

    sb = get_supabase_admin()
    capped_limit = max(1, min(limit, 100))
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    result = (
        sb.table("sentiment_entries")
        .select("state_id, ward_id, extracted_keywords, ingested_at")
        .gte("ingested_at", cutoff)
        .order("ingested_at", desc=True)
        .limit(10000)
        .execute()
    )

    rows = result.data or []
    if state_id is not None:
        rows = [
            r
            for r in rows
            if r.get("state_id") == state_id or r.get("ward_id") == state_id
        ]

    counts: Counter[str] = Counter()
    for row in rows:
        kws = row.get("extracted_keywords") or []
        if isinstance(kws, str):
            kws = [k.strip() for k in kws.split(",") if k.strip()]
        if not isinstance(kws, list):
            continue

        for kw in kws:
            token = str(kw).strip().lower()
            if len(token) < 3:
                continue
            counts[token] += 1

    return [{"keyword": k, "count": c} for k, c in counts.most_common(capped_limit)]


# ── Geographic hierarchy lookups ──────────────────────────────

@router.get("/geo/wards")
@limiter.limit("60/minute")
async def geo_wards(request: Request):
    """Return all 250 Delhi MCD Wards."""
    return MCD_WARDS


@router.get("/mcd-news")
@limiter.limit("10/minute")
async def mcd_news(request: Request):
    """MCD VERSION: Fetch real-time MCD/Delhi news from RSS feeds."""
    # Only use Delhi-specific feeds for this endpoint
    from app.ingesters.news_ingester import NewsIngester
    ingester = NewsIngester()
    
    # Check cache
    cache_key = "mcd_realtime_news"
    if cache_key in general_cache:
        return general_cache[cache_key]

    all_feeds = ingester._load_feeds()
    delhi_feeds = [f for f in all_feeds if f.get("region") == "Delhi" or "MCD" in f.get("name", "")]
    
    import feedparser
    import asyncio
    loop = asyncio.get_event_loop()
    
    async def _fetch_one(f):
        try:
            parsed = await asyncio.wait_for(
                loop.run_in_executor(None, feedparser.parse, f["url"]),
                timeout=3.5,
            )
            items = []
            for item in parsed.entries[:5]:
                items.append({
                    "title": item.get("title", ""),
                    "link": item.get("link", ""),
                    "summary": item.get("summary", "")[:200] + "...",
                    "source": f["name"],
                    "published": item.get("published", "")
                })
            return items
        except Exception:
            return []

    if not delhi_feeds:
        return []

    results = await asyncio.gather(*[_fetch_one(f) for f in delhi_feeds[:5]])
    news_items = [item for sublist in results for item in sublist]
    
    # Store in cache for 10 minutes
    general_cache[cache_key] = news_items[:20]
    return news_items[:20]
