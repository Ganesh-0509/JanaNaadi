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
    """Get sentiment trend over time."""
    sb = get_supabase_admin()
    days = _parse_period(period)
    now = datetime.now(timezone.utc)

    field_map = {
        "state": "state_id",
        "district": "district_id",
        "constituency": "constituency_id",
        "ward": "ward_id",
    }

    points = []
    for day_offset in range(days, 0, -1):
        day_start = now - timedelta(days=day_offset)
        day_end = now - timedelta(days=day_offset - 1)

        query = (
            sb.table("sentiment_entries")
            .select("sentiment", count="exact")
            .gte("ingested_at", day_start.isoformat())
            .lt("ingested_at", day_end.isoformat())
        )
        if scope in field_map and id:
            query = query.eq(field_map[scope], id)

        result = query.execute()
        data = result.data or []
        total = len(data)
        if total == 0:
            points.append(
                SentimentTrendPoint(
                    date=day_start.strftime("%Y-%m-%d"),
                    positive_pct=0,
                    negative_pct=0,
                    neutral_pct=0,
                    volume=0,
                )
            )
            continue

        pos = sum(1 for e in data if e["sentiment"] == "positive")
        neg = sum(1 for e in data if e["sentiment"] == "negative")
        neu = total - pos - neg

        points.append(
            SentimentTrendPoint(
                date=day_start.strftime("%Y-%m-%d"),
                positive_pct=round(pos / total * 100, 1),
                negative_pct=round(neg / total * 100, 1),
                neutral_pct=round(neu / total * 100, 1),
                volume=total,
            )
        )

    return points


@router.get("/topics", response_model=list[TopicTrendPoint])
async def topic_trend(
    scope: str = Query("national"),
    id: int | None = Query(None),
    period: str = Query("30d"),
):
    """Get topic mention trend over time."""
    sb = get_supabase_admin()
    days = _parse_period(period)
    now = datetime.now(timezone.utc)

    field_map = {
        "state": "state_id",
        "district": "district_id",
        "constituency": "constituency_id",
        "ward": "ward_id",
    }

    points = []
    for day_offset in range(days, 0, -1):
        day_start = now - timedelta(days=day_offset)
        day_end = now - timedelta(days=day_offset - 1)

        query = (
            sb.table("sentiment_entries")
            .select("primary_topic_id")
            .gte("ingested_at", day_start.isoformat())
            .lt("ingested_at", day_end.isoformat())
        )
        if scope in field_map and id:
            query = query.eq(field_map[scope], id)

        result = query.execute()
        topic_counts: dict[int, int] = {}
        for e in result.data or []:
            tid = e.get("primary_topic_id")
            if tid:
                topic_counts[tid] = topic_counts.get(tid, 0) + 1

        for tid, count in topic_counts.items():
            topic = sb.table("topic_taxonomy").select("name").eq("id", tid).limit(1).execute()
            name = topic.data[0]["name"] if topic.data else f"Topic {tid}"
            points.append(
                TopicTrendPoint(
                    date=day_start.strftime("%Y-%m-%d"),
                    topic=name,
                    mention_count=count,
                )
            )

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

    items = []
    for scope_id in ids:
        region = sb.table(table).select("name").eq("id", scope_id).limit(1).execute()
        name = region.data[0]["name"] if region.data else f"#{scope_id}"
        snapshot = await get_or_compute_snapshot(type, scope_id, period_hours=168)

        top_issue = None
        if snapshot.get("top_topics"):
            tid = snapshot["top_topics"][0]["topic_id"]
            topic = sb.table("topic_taxonomy").select("name").eq("id", tid).limit(1).execute()
            top_issue = topic.data[0]["name"] if topic.data else None

        items.append(
            ComparisonItem(
                id=scope_id,
                name=name,
                avg_sentiment=snapshot["avg_sentiment_score"],
                top_issue=top_issue,
                volume=snapshot["total_entries"],
            )
        )
    return items
