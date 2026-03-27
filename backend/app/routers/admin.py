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
        await compute_snapshot("national", None, period_hours=720)
        states = sb.table("states").select("id").execute()
        await asyncio.gather(
            *[compute_snapshot("state", s["id"], period_hours=720) for s in states.data or []]
        )

    background_tasks.add_task(recompute)
    return {"status": "triggered"}


@router.post("/check-alerts")
async def trigger_alert_check(user: dict = Depends(require_admin)):
    """Manually trigger spike detection."""
    alerts = await check_for_spikes()
    return {"status": "ok", "alerts_created": len(alerts)}


@router.post("/trigger-ingestion")
async def trigger_ingestion(
    background_tasks: BackgroundTasks,
):
    """Manually trigger a full ingestion run across all domains and news sources.

    Runs in the background — returns immediately with job ID.
    Check /api/admin/ingestion-status to see progress.
    """
    from app.main import (
        _scheduled_domain_ingestion,
        _scheduled_news_ingestion,
        _scheduled_gnews_ingestion,
    )

    async def run_all():
        from app.services.ingest_guard import clear_run_cache
        clear_run_cache()
        # Run domain ingestion first (highest value for the knowledge graph)
        await _scheduled_domain_ingestion()
        # Then general news
        await _scheduled_news_ingestion()
        await _scheduled_gnews_ingestion()

    background_tasks.add_task(run_all)

    return {
        "status": "triggered",
        "message": "Full ingestion started in background. Check server logs for progress.",
        "jobs": ["domain_ingestion", "news_ingestion", "gnews_ingestion"],
    }


@router.post("/trigger-domain/{domain}")
async def trigger_single_domain(
    domain: str,
    background_tasks: BackgroundTasks,
):
    """Trigger ingestion for a single domain only (useful for testing).

    domain: one of defense, climate, technology, economics, geopolitics, society, delhi
    """
    VALID_DOMAINS = {"defense", "climate", "technology", "economics", "geopolitics", "society", "delhi"}
    if domain not in VALID_DOMAINS:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail=f"Invalid domain '{domain}'. Must be one of: {', '.join(sorted(VALID_DOMAINS))}",
        )

    async def run_single():
        from app.ingesters.domain_ingester import DomainIngester
        from app.routers.ingest import _process_and_store, _last_run_info
        from app.services.ingest_guard import clear_run_cache

        clear_run_cache()
        ingester = DomainIngester()
        entries = await ingester.fetch_domain(domain, max_items=10)
        count = 0
        for entry in entries:
            try:
                result = await _process_and_store(
                    entry["text"],
                    domain,
                    location_hint=entry.get("location_hint"),
                    source_id=entry.get("source_id"),
                    source_url=entry.get("source_url"),
                    domain="general" if domain == "delhi" else domain,
                )
                if result:
                    count += 1
            except Exception:
                continue
            await asyncio.sleep(0)

        _last_run_info[domain] = {
            "ran_at": datetime.now(timezone.utc).isoformat(),
            "count": count,
        }

    background_tasks.add_task(run_single)
    return {
        "status": "triggered",
        "domain": domain,
        "message": f"Ingestion for '{domain}' started. Check server logs for progress.",
    }


@router.get("/ingestion-status")
async def ingestion_status():
    """Get the last run time and entry count for each ingestion job."""
    from app.routers.ingest import _last_run_info
    return {
        "status": "ok",
        "last_runs": _last_run_info,
    }