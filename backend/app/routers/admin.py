"""Admin / system management endpoints."""

import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, BackgroundTasks
from app.core.auth import require_admin
from app.core.supabase_client import get_supabase_admin
from app.models.schemas import AdminStats
from app.services.snapshot_service import compute_snapshot
from app.services.alert_engine import check_for_spikes

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStats)
async def admin_stats(user: dict = Depends(require_admin)):
    """Get system-wide statistics."""
    sb = get_supabase_admin()

    total = sb.table("sentiment_entries").select("id", count="exact").execute()
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today = (
        sb.table("sentiment_entries")
        .select("id", count="exact")
        .gte("ingested_at", today_start.isoformat())
        .execute()
    )
    unread_alerts = (
        sb.table("alerts")
        .select("id", count="exact")
        .eq("is_read", False)
        .execute()
    )

    # Count distinct active sources today
    sources = (
        sb.table("sentiment_entries")
        .select("source")
        .gte("ingested_at", today_start.isoformat())
        .execute()
    )
    active_sources = len(set(e["source"] for e in sources.data or []))

    return AdminStats(
        total_entries=total.count or 0,
        entries_today=today.count or 0,
        sources_active=active_sources,
        alert_count=unread_alerts.count or 0,
    )


@router.post("/snapshot/generate")
async def generate_snapshots(
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_admin),
):
    """Trigger snapshot re-computation for all scopes."""

    async def recompute():
        sb = get_supabase_admin()
        # National snapshot — use 720 h (30 days) to cover all seeded data
        await compute_snapshot("national", None, period_hours=720)

        # All states — run in parallel
        states = sb.table("states").select("id").execute()
        await asyncio.gather(
            *[compute_snapshot("state", s["id"], period_hours=720) for s in states.data or []]
        )

    background_tasks.add_task(recompute)
    return {"status": "triggered"}


@router.post("/check-alerts")
async def trigger_alert_check(
    user: dict = Depends(require_admin),
):
    """Manually trigger spike detection."""
    alerts = await check_for_spikes()
    return {"status": "ok", "alerts_created": len(alerts)}
