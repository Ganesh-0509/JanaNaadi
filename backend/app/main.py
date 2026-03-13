"""JanaNaadi — FastAPI application entry point."""

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.settings import get_settings
from app.core.rate_limiter import limiter
from app.routers import public, heatmap, analysis, trends, search, alerts, briefs, ingest, admin, ontology
from app.routers import ws as ws_router

logger = logging.getLogger("jananaadi.scheduler")

scheduler = AsyncIOScheduler()


async def _scheduled_news_ingestion():
    """Background job: fetch and process RSS news feeds."""
    try:
        from app.ingesters.news_ingester import NewsIngester
        from app.routers.ingest import _process_and_store, _last_run_info
        from datetime import datetime, timezone
        ingester = NewsIngester()
        entries = await ingester.fetch()
        count = 0
        for entry in entries:
            try:
                result = await _process_and_store(
                    entry["text"], "news",
                    location_hint=entry.get("location"),
                    source_id=entry.get("source_id"),
                    source_url=entry.get("source_url"),
                )
                if result:
                    count += 1
            except Exception:
                continue
            await asyncio.sleep(0)  # yield between entries so other requests aren't blocked
        _last_run_info["news"] = {"ran_at": datetime.now(timezone.utc).isoformat(), "count": count}
        logger.info(f"Scheduled news ingestion: {count} new entries")
    except Exception as e:
        logger.error(f"Scheduled news ingestion failed: {e}")


async def _scheduled_snapshot():
    """Background job: recompute national snapshot."""
    try:
        from app.services.snapshot_service import compute_snapshot
        await compute_snapshot("national", None, period_hours=24)
        logger.info("Scheduled snapshot recomputed")
    except Exception as e:
        logger.error(f"Scheduled snapshot failed: {e}")


async def _scheduled_alert_check():
    """Background job: check for sentiment spikes."""
    try:
        from app.services.alert_engine import check_for_spikes
        alerts_created = await check_for_spikes()
        logger.info(f"Scheduled alert check: {len(alerts_created)} new alerts")
    except Exception as e:
        logger.error(f"Scheduled alert check failed: {e}")


async def _scheduled_reddit_ingestion():
    """Background job: fetch posts from India-related subreddits."""
    try:
        from app.ingesters.reddit_ingester import RedditIngester
        from app.routers.ingest import _process_and_store, _last_run_info
        from datetime import datetime, timezone
        ingester = RedditIngester()
        entries = await ingester.fetch()
        count = 0
        for entry in entries:
            try:
                result = await _process_and_store(
                    entry["text"], "reddit",
                    location_hint=entry.get("location"),
                    source_id=entry.get("source_id"),
                    source_url=entry.get("source_url"),
                )
                if result:
                    count += 1
            except Exception:
                continue
            await asyncio.sleep(0)  # yield between entries
        _last_run_info["reddit"] = {"ran_at": datetime.now(timezone.utc).isoformat(), "count": count}
        logger.info(f"Scheduled Reddit ingestion: {count} new entries")
    except Exception as e:
        logger.error(f"Scheduled Reddit ingestion failed: {e}")


async def _scheduled_gnews_ingestion():
    """Background job: fetch targeted Google News RSS articles."""
    try:
        from app.ingesters.gnews_ingester import GNewsIngester
        from app.routers.ingest import _process_and_store, _last_run_info
        from datetime import datetime, timezone
        ingester = GNewsIngester()
        entries = await ingester.fetch()
        count = 0
        for entry in entries:
            try:
                result = await _process_and_store(
                    entry["text"], "news",
                    location_hint=entry.get("location"),
                    source_id=entry.get("source_id"),
                    source_url=entry.get("source_url"),
                    published_at=entry.get("published_at"),
                )
                if result:
                    count += 1
            except Exception:
                continue
            await asyncio.sleep(0)  # yield between entries
        _last_run_info["gnews"] = {"ran_at": datetime.now(timezone.utc).isoformat(), "count": count}
        logger.info(f"Scheduled GNews ingestion: {count} new entries")
    except Exception as e:
        logger.error(f"Scheduled GNews ingestion failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown."""
    # Schedule background jobs with OPTIMIZED intervals to reduce API costs
    # Changed from 2h to 12h for ingestion tasks (83% cost reduction)
    scheduler.add_job(_scheduled_news_ingestion, "interval", hours=12, id="news_ingest")
    scheduler.add_job(_scheduled_gnews_ingestion, "interval", hours=12, id="gnews_ingest")
    scheduler.add_job(_scheduled_reddit_ingestion, "interval", hours=12, id="reddit_ingest")
    # Snapshots and alerts (no API cost)
    scheduler.add_job(_scheduled_snapshot, "interval", hours=1, id="snapshot")
    scheduler.add_job(_scheduled_alert_check, "interval", hours=6, id="alert_check")
    scheduler.start()
    logger.info("📅 Background scheduler started: news(12h), gnews(12h), reddit(12h), snapshot(1h), alerts(6h)")
    
    # OPTIMIZATION: Disabled automatic startup ingestion to save API credits during development
    # Only manual triggers or scheduled runs will ingest data
    # To re-enable, uncomment these lines:
    # import asyncio as _asyncio
    # _asyncio.create_task(_scheduled_news_ingestion())
    # _asyncio.create_task(_scheduled_gnews_ingestion())
    
    logger.info("⚠️ Auto-ingestion on startup DISABLED to save API credits")
    logger.info("💡 Trigger manually via /api/admin/trigger-ingestion or wait for scheduled run")
    
    yield
    scheduler.shutdown()
    logger.info("Background scheduler stopped")


settings = get_settings()


class _LimitRequestSizeMiddleware(BaseHTTPMiddleware):
    """Reject requests whose Content-Length exceeds 1 MB."""
    _MAX = 1_000_000  # 1 MB

    async def dispatch(self, request: StarletteRequest, call_next):
        cl = request.headers.get("content-length")
        if cl and int(cl) > self._MAX:
            return JSONResponse(
                {"detail": "Request body too large. Maximum allowed size is 1 MB."},
                status_code=413,
            )
        return await call_next(request)


class _SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""
    async def dispatch(self, request: StarletteRequest, call_next):
        response = await call_next(request)
        # Content Security Policy - restrict sources for scripts, styles, etc.
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "  # React requires inline scripts
            "style-src 'self' 'unsafe-inline'; "  # Tailwind uses inline styles
            "img-src 'self' data: https:; "  # Allow images from https sources
            "font-src 'self' data:; "
            "connect-src 'self' ws: wss: https:; "  # Allow WebSocket and API calls
            "frame-ancestors 'none'; "  # Prevent clickjacking (same as X-Frame-Options)
        )
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        # XSS protection (legacy but still useful for older browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # Strict Transport Security - force HTTPS (only in production)
        if not settings.debug:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        # Referrer policy - don't leak referrer to external sites
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Permissions policy - restrict access to browser features
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response


app = FastAPI(
    title="JanaNaadi API",
    description="India's Real-Time Public Sentiment Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — MUST be first to handle preflight OPTIONS requests
if not settings.debug:
    _localhost = [o for o in settings.cors_origins if "localhost" in o or "127.0.0.1" in o]
    if _localhost:
        logging.getLogger("jananaadi").warning(
            "PRODUCTION WARNING: CORS still allows localhost origins %s. "
            "Set CORS_ORIGINS env var to restrict access.",
            _localhost,
        )
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers for all responses
app.add_middleware(_SecurityHeadersMiddleware)

# Body size guard
app.add_middleware(_LimitRequestSizeMiddleware)

# Register routers
app.include_router(public.router)
app.include_router(heatmap.router)
app.include_router(analysis.router)
app.include_router(trends.router)
app.include_router(search.router)
app.include_router(alerts.router)
app.include_router(briefs.router)
app.include_router(ingest.router)
app.include_router(admin.router)
app.include_router(ontology.router)
app.include_router(ws_router.router)


@app.api_route("/", methods=["GET", "HEAD"])
async def root() -> dict[str, str]:
    return {
        "name": "JanaNaadi API",
        "tagline": "Pulse of the People",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.api_route("/health", methods=["GET", "HEAD"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
