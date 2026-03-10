"""Alert management endpoints — admin only."""

from fastapi import APIRouter, Depends, Query, Path, HTTPException, Request
from app.core.auth import require_admin
from app.core.supabase_client import get_supabase_admin
from app.core.rate_limiter import limiter
from app.models.schemas import AlertOut
from app.services.gemini_service import generate_action_recommendations

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut])
async def list_alerts(
    severity: str | None = Query(None),
    unread: bool | None = Query(None),
    scope_type: str | None = Query(None),
    limit: int = Query(50, le=200),
    user: dict = Depends(require_admin),
):
    """List alerts with optional filters."""
    sb = get_supabase_admin()
    query = sb.table("alerts").select("*")

    if severity:
        query = query.eq("severity", severity)
    if unread is True:
        query = query.eq("is_read", False)
    if scope_type:
        query = query.eq("scope_type", scope_type)

    result = query.order("triggered_at", desc=True).limit(limit).execute()
    return [AlertOut(**a) for a in result.data or []]


@router.post("/{alert_id}/read")
async def mark_alert_read(
    alert_id: str = Path(...),
    user: dict = Depends(require_admin),
):
    """Mark an alert as read."""
    sb = get_supabase_admin()
    sb.table("alerts").update({"is_read": True}).eq("id", alert_id).execute()
    return {"status": "ok"}


@router.post("/{alert_id}/resolve")
async def mark_alert_resolved(
    alert_id: str = Path(...),
    user: dict = Depends(require_admin),
):
    """Mark an alert as resolved."""
    sb = get_supabase_admin()
    sb.table("alerts").update({"is_resolved": True, "is_read": True}).eq("id", alert_id).execute()
    return {"status": "ok"}


@router.post("/{alert_id}/recommend")
@limiter.limit("10/minute")  # Rate limit: AI recommendations are expensive
async def get_recommendations(
    request: Request,
    alert_id: str = Path(...),
    user: dict = Depends(require_admin),
):
    """
    Generate AI-powered government action recommendations for an alert.
    Uses Gemini to produce structured, department-specific action plans.
    
    Rate limited to 10 requests/minute to prevent API quota exhaustion.
    """
    sb = get_supabase_admin()

    # Fetch the alert
    result = sb.table("alerts").select("*").eq("id", alert_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert = result.data[0]

    # Resolve region name
    scope_type = alert.get("scope_type", "constituency")
    scope_id = alert.get("scope_id")
    region_name = f"Region #{scope_id}"
    table_map = {
        "constituency": "constituencies",
        "district": "districts",
        "state": "states",
        "ward": "wards",
    }
    if scope_id:
        table = table_map.get(scope_type, "constituencies")
        region_res = sb.table(table).select("name").eq("id", scope_id).limit(1).execute()
        if region_res.data:
            region_name = region_res.data[0]["name"]

    # Get top 3 topics from recent sentiment entries for this region
    field_map = {
        "constituency": "constituency_id",
        "district": "district_id",
        "state": "state_id",
        "ward": "ward_id",
    }
    field = field_map.get(scope_type, "constituency_id")
    top_topics: list[str] = []
    if scope_id:
        from datetime import datetime, timedelta, timezone
        since = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        entries = (
            sb.table("sentiment_entries")
            .select("primary_topic_id")
            .eq(field, scope_id)
            .gte("ingested_at", since)
            .limit(200)
            .execute()
        )
        # Tally topic mentions
        tally: dict[int, int] = {}
        for e in (entries.data or []):
            tid = e.get("primary_topic_id")
            if tid:
                tally[tid] = tally.get(tid, 0) + 1
        if tally:
            top_ids = sorted(tally, key=lambda x: tally[x], reverse=True)[:3]
            topics_res = sb.table("topic_taxonomy").select("id, name").in_("id", top_ids).execute()
            top_topics = [t["name"] for t in (topics_res.data or [])]

    # Build stats from alert payload
    stats = {
        "neg_pct": abs(alert.get("sentiment_shift") or 0),
        "volume": alert.get("volume_change") or 0,
        "urgency": 0.0,
    }

    recommendations = await generate_action_recommendations(
        alert_type=alert["alert_type"],
        severity=alert["severity"],
        region_name=region_name,
        top_topics=top_topics,
        stats=stats,
    )
    return recommendations
