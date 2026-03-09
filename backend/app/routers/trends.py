"""Trend analysis endpoints."""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Query
from app.core.supabase_client import get_supabase_admin
from app.models.schemas import SentimentTrendPoint, TopicTrendPoint, ComparisonItem
from app.services.snapshot_service import get_or_compute_snapshot

router = APIRouter(prefix="/api/trends", tags=["trends"])


def _parse_period(period: str) -> int:
    """Parse period string to days."""
    if period.endswith("d"):
        return int(period[:-1])
    return 30


@router.get("/sentiment", response_model=list[SentimentTrendPoint])
async def sentiment_trend(
    scope: str = Query("national"),
    id: int | None = Query(None),
    period: str = Query("30d"),
):
    """Get sentiment trend over time — single batch query, grouped in Python."""
    sb = get_supabase_admin()
    days = _parse_period(period)
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)

    field_map = {
        "state": "state_id",
        "district": "district_id",
        "constituency": "constituency_id",
        "ward": "ward_id",
    }

    query = (
        sb.table("sentiment_entries")
        .select("sentiment,ingested_at")
        .gte("ingested_at", start.isoformat())
        .lt("ingested_at", now.isoformat())
    )
    if scope in field_map and id:
        query = query.eq(field_map[scope], id)

    result = query.execute()

    # Group by date in Python
    from collections import defaultdict
    buckets: dict[str, list[str]] = defaultdict(list)
    for row in result.data or []:
        day = row["ingested_at"][:10]  # YYYY-MM-DD
        buckets[day].append(row["sentiment"])

    points = []
    for day_offset in range(days, 0, -1):
        day_dt = now - timedelta(days=day_offset)
        day_key = day_dt.strftime("%Y-%m-%d")
        sentiments = buckets.get(day_key, [])
        total = len(sentiments)
        if total == 0:
            points.append(SentimentTrendPoint(
                date=day_key, positive_pct=0, negative_pct=0, neutral_pct=0, volume=0,
            ))
            continue
        pos = sentiments.count("positive")
        neg = sentiments.count("negative")
        neu = total - pos - neg
        points.append(SentimentTrendPoint(
            date=day_key,
            positive_pct=round(pos / total * 100, 1),
            negative_pct=round(neg / total * 100, 1),
            neutral_pct=round(neu / total * 100, 1),
            volume=total,
        ))

    return points


@router.get("/topics", response_model=list[TopicTrendPoint])
async def topic_trend(
    scope: str = Query("national"),
    id: int | None = Query(None),
    period: str = Query("30d"),
):
    """Get topic mention trend over time — single batch query, grouped in Python."""
    sb = get_supabase_admin()
    days = _parse_period(period)
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)

    field_map = {
        "state": "state_id",
        "district": "district_id",
        "constituency": "constituency_id",
        "ward": "ward_id",
    }

    query = (
        sb.table("sentiment_entries")
        .select("primary_topic_id,ingested_at")
        .gte("ingested_at", start.isoformat())
        .lt("ingested_at", now.isoformat())
    )
    if scope in field_map and id:
        query = query.eq(field_map[scope], id)

    result = query.execute()

    # Fetch all topic names in one call
    topic_ids = list({r["primary_topic_id"] for r in result.data or [] if r.get("primary_topic_id")})
    topic_name_map: dict[int, str] = {}
    if topic_ids:
        topics_res = sb.table("topic_taxonomy").select("id,name").in_("id", topic_ids).execute()
        topic_name_map = {t["id"]: t["name"] for t in topics_res.data or []}

    # Group by (date, topic_id) in Python
    from collections import defaultdict
    buckets: dict[tuple[str, int], int] = defaultdict(int)
    for row in result.data or []:
        tid = row.get("primary_topic_id")
        if not tid:
            continue
        day = row["ingested_at"][:10]
        buckets[(day, tid)] += 1

    points = []
    for (day, tid), count in buckets.items():
        points.append(TopicTrendPoint(
            date=day,
            topic=topic_name_map.get(tid, f"Topic {tid}"),
            mention_count=count,
        ))

    return points


@router.get("/comparison", response_model=list[ComparisonItem])
async def comparison(
    scope_ids: str = Query(..., description="Comma-separated IDs"),
    type: str = Query("constituency"),
):
    """Compare 2-3 regions side by side."""
    ids = [int(x.strip()) for x in scope_ids.split(",") if x.strip().isdigit()][:5]
    sb = get_supabase_admin()

    table_map = {
        "constituency": "constituencies",
        "ward": "wards",
        "district": "districts",
        "state": "states",
    }
    table = table_map.get(type, "constituencies")

    # Pre-load all topic names once
    all_topics = {t["id"]: t["name"] for t in (sb.table("topic_taxonomy").select("id, name").execute().data or [])}

    items = []
    for scope_id in ids:
        region = sb.table(table).select("name").eq("id", scope_id).limit(1).execute()
        name = region.data[0]["name"] if region.data else f"#{scope_id}"
        snapshot = await get_or_compute_snapshot(type, scope_id, period_hours=168)

        # Top 3 topics
        top_topics = [
            all_topics.get(t["topic_id"], f"Topic {t['topic_id']}")
            for t in snapshot.get("top_topics", [])[:3]
        ]
        top_issue = top_topics[0] if top_topics else None

        # Urgency: weighted negative intensity + volume
        pos = snapshot["positive_count"]
        neg = snapshot["negative_count"]
        neu = snapshot["neutral_count"]
        total = max(snapshot["total_entries"], 1)
        import math
        urgency = round(
            0.6 * (neg / total) + 0.4 * (1 - math.exp(-total / 200)),
            4,
        )

        items.append(
            ComparisonItem(
                id=scope_id,
                name=name,
                avg_sentiment=snapshot["avg_sentiment_score"],
                top_issue=top_issue,
                top_topics=top_topics,
                volume=snapshot["total_entries"],
                positive=pos,
                negative=neg,
                neutral=neu,
                urgency_score=urgency,
            )
        )
    return items


@router.get("/forecast", response_model=list[dict])
async def sentiment_forecast(
    scope: str = Query("national"),
    id: str | None = Query(None),
    horizon: int = Query(7, ge=1, le=14),
):
    """7-day sentiment forecast using linear regression on the last 30 days."""
    import numpy as np

    sb = get_supabase_admin()
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=30)

    field_map = {
        "state": "state_id",
        "district": "district_id",
        "constituency": "constituency_id",
        "ward": "ward_id",
    }

    # Resolve id: accept numeric IDs or state codes (e.g. "DL", "TN")
    resolved_id: int | None = None
    if id is not None:
        if id.isdigit():
            resolved_id = int(id)
        elif scope == "state":
            row = sb.table("states").select("id").eq("code", id.upper()).limit(1).execute()
            if row.data:
                resolved_id = row.data[0]["id"]

    query = (
        sb.table("sentiment_entries")
        .select("sentiment_score,ingested_at")
        .gte("ingested_at", start.isoformat())
        .lt("ingested_at", now.isoformat())
    )
    if scope in field_map and resolved_id:
        query = query.eq(field_map[scope], resolved_id)

    result = query.execute()

    from collections import defaultdict
    buckets: dict[str, list[float]] = defaultdict(list)
    for row in result.data or []:
        day = row["ingested_at"][:10]
        buckets[day].append(row.get("sentiment_score", 0))

    # Build ordered daily averages for past 30 days
    daily_scores = []
    for d_offset in range(30, 0, -1):
        day_key = (now - timedelta(days=d_offset)).strftime("%Y-%m-%d")
        vals = buckets.get(day_key, [])
        daily_scores.append(float(np.mean(vals)) if vals else None)

    # Fill gaps via linear interpolation over known values
    known_idx = [i for i, v in enumerate(daily_scores) if v is not None]
    if len(known_idx) < 2:
        return []
    xs = np.array(known_idx, dtype=float)
    ys = np.array([daily_scores[i] for i in known_idx], dtype=float)

    # Linear regression
    coeffs = np.polyfit(xs, ys, 1)
    slope, intercept = float(coeffs[0]), float(coeffs[1])

    # Residual std for confidence interval
    y_pred_known = slope * xs + intercept
    residuals = ys - y_pred_known
    std = float(np.std(residuals)) if len(residuals) > 1 else 0.1

    points = []
    for h in range(1, horizon + 1):
        future_x = 30 + h - 1  # continues index
        forecast_date = (now + timedelta(days=h)).strftime("%Y-%m-%d")
        pred = round(float(np.clip(slope * future_x + intercept, -1, 1)), 4)
        points.append({
            "date": forecast_date,
            "forecast_score": pred,
            "upper": round(float(np.clip(pred + std, -1, 1)), 4),
            "lower": round(float(np.clip(pred - std, -1, 1)), 4),
            "is_forecast": True,
        })

    return points
