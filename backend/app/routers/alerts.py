"""Alert management endpoints — admin only."""

from fastapi import APIRouter, Depends, Query, Path
from app.core.auth import require_admin
from app.core.supabase_client import get_supabase_admin
from app.models.schemas import AlertOut

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
