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
from app.routers import public, heatmap, analysis, trends, search, alerts, briefs, ingest, admin
from app.routers import ws as ws_router

logger = logging.getLogger("jananaadi.scheduler")

scheduler = AsyncIOScheduler()


async def _scheduled_news_ingestion():
    """Background job: fetch and process RSS news feeds."""
    try:
        from app.ingesters.news_ingester import NewsIngester
        from app.routers.ingest import _process_and_store
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown."""
    # Schedule background jobs
    scheduler.add_job(_scheduled_news_ingestion, "interval", hours=2, id="news_ingest")
    scheduler.add_job(_scheduled_snapshot, "interval", hours=1, id="snapshot")
    scheduler.add_job(_scheduled_alert_check, "interval", hours=6, id="alert_check")
    scheduler.start()
    logger.info("Background scheduler started: news(2h), snapshot(1h), alerts(6h)")
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


app = FastAPI(
    title="JanaNaadi API",
    description="India's Real-Time Public Sentiment Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Body size guard — applied before CORS so large pre-flight bodies are rejected
app.add_middleware(_LimitRequestSizeMiddleware)

# CORS
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
app.include_router(ws_router.router)


@app.get("/")
async def root():
    return {
        "name": "JanaNaadi API",
        "tagline": "Pulse of the People",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
