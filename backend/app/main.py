"""JanaNaadi — FastAPI application entry point."""

import asyncio
import logging
import random
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
from app.routers import public, heatmap, analysis, trends, search, alerts, briefs, ingest, admin, ontology, incidents
from app.routers import ws as ws_router

logger = logging.getLogger("jananaadi.scheduler")

scheduler = AsyncIOScheduler()


def _bounded_minutes(minutes: int, minimum: int = 5, maximum: int = 60) -> int:
    return max(minimum, min(maximum, int(minutes)))


def _poll_sleep_seconds(base_minutes: int, jitter_seconds: int) -> int:
    base = _bounded_minutes(base_minutes) * 60
    jitter = max(0, int(jitter_seconds))
    if jitter == 0:
        return base
    return max(120, base + random.randint(-jitter, jitter))


# ─────────────────────────────────────────────────────────────────────────────
# Scheduled jobs
# ─────────────────────────────────────────────────────────────────────────────

async def _scheduled_domain_ingestion():
    """Background job: fetch all 6 intelligence domains (defense, climate,
    technology, economics, geopolitics, society).

    FIX: This job was completely missing from the original scheduler.
    Domain intelligence was never being auto-ingested — the graph was
    only populated by manual triggers.
    """
    try:
        from app.ingesters.domain_ingester import DomainIngester
        from app.routers.ingest import _process_and_store, _last_run_info
        from app.services.ingest_guard import clear_run_cache
        from datetime import datetime, timezone

        clear_run_cache()  # reset dedup cache at start of each run

        ingester = DomainIngester()
        domain_data = await ingester.fetch_all_domains(max_items_per_feed=10)

        total_count = 0
        for domain, entries in domain_data.items():
            domain_count = 0
            for entry in entries:
                try:
                    # The sentiment_entries.domain CHECK does not include "delhi".
                    # Delhi feed items are stored under "general" while preserving
                    # ward-level location hints in location_hint.
                    stored_domain = "general" if domain == "delhi" else domain
                    result = await _process_and_store(
                        entry["text"],
                        domain,
                        location_hint=entry.get("location_hint"),
                        source_id=entry.get("source_id"),
                        source_url=entry.get("source_url"),
                        domain=stored_domain,
                    )
                    if result:
                        domain_count += 1
                except Exception:
                    continue
                await asyncio.sleep(0)

            total_count += domain_count
            logger.info(f"Domain ingestion [{domain}]: {domain_count} new entries")

        _last_run_info["domains"] = {
            "ran_at": datetime.now(timezone.utc).isoformat(),
            "count": total_count,
        }
        logger.info(f"Scheduled domain ingestion complete: {total_count} total new entries")

    except asyncio.CancelledError:
        logger.info("Scheduled domain ingestion cancelled during shutdown")
        return
    except Exception as e:
        logger.error(f"Scheduled domain ingestion failed: {e}")


async def _scheduled_news_ingestion():
    """Background job: fetch and process RSS news feeds."""
    try:
        from app.ingesters.news_ingester import NewsIngester
        from app.routers.ingest import _process_and_store, _last_run_info
        from app.services.ingest_guard import clear_run_cache
        from datetime import datetime, timezone

        clear_run_cache()  # reset dedup cache

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
            await asyncio.sleep(0)
        _last_run_info["news"] = {"ran_at": datetime.now(timezone.utc).isoformat(), "count": count}
        logger.info(f"Scheduled news ingestion: {count} new entries")
    except asyncio.CancelledError:
        logger.info("Scheduled news ingestion cancelled during shutdown")
        return
    except Exception as e:
        logger.error(f"Scheduled news ingestion failed: {e}")


async def _scheduled_snapshot():
    """Background job: recompute national snapshot."""
    try:
        from app.services.snapshot_service import compute_snapshot
        await compute_snapshot("national", None, period_hours=24)
        logger.info("Scheduled snapshot recomputed")
    except asyncio.CancelledError:
        logger.info("Scheduled snapshot cancelled during shutdown")
        return
    except Exception as e:
        logger.error(f"Scheduled snapshot failed: {e}")


async def _scheduled_alert_check():
    """Background job: check for sentiment spikes."""
    try:
        from app.services.alert_engine import check_for_spikes
        alerts_created = await check_for_spikes()
        logger.info(f"Scheduled alert check: {len(alerts_created)} new alerts")
    except asyncio.CancelledError:
        logger.info("Scheduled alert check cancelled during shutdown")
        return
    except Exception as e:
        logger.error(f"Scheduled alert check failed: {e}")


async def _scheduled_reddit_ingestion():
    """Background job: fetch posts from India-related subreddits."""
    try:
        from app.ingesters.reddit_ingester import RedditIngester
        from app.routers.ingest import _process_and_store, _last_run_info
        from app.services.ingest_guard import clear_run_cache
        from datetime import datetime, timezone

        clear_run_cache()

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
            await asyncio.sleep(0)
        _last_run_info["reddit"] = {"ran_at": datetime.now(timezone.utc).isoformat(), "count": count}
        logger.info(f"Scheduled Reddit ingestion: {count} new entries")
    except asyncio.CancelledError:
        logger.info("Scheduled Reddit ingestion cancelled during shutdown")
        return
    except Exception as e:
        logger.error(f"Scheduled Reddit ingestion failed: {e}")


async def _scheduled_gnews_ingestion():
    """Background job: fetch targeted Google News RSS articles."""
    try:
        from app.ingesters.gnews_ingester import GNewsIngester
        from app.routers.ingest import _process_and_store, _last_run_info
        from app.services.ingest_guard import clear_run_cache
        from datetime import datetime, timezone

        clear_run_cache()

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
            await asyncio.sleep(0)
        _last_run_info["gnews"] = {"ran_at": datetime.now(timezone.utc).isoformat(), "count": count}
        logger.info(f"Scheduled GNews ingestion: {count} new entries")
    except asyncio.CancelledError:
        logger.info("Scheduled GNews ingestion cancelled during shutdown")
        return
    except Exception as e:
        logger.error(f"Scheduled GNews ingestion failed: {e}")


async def _scheduled_domain_score_computation():
    """Background job: auto-compute domain intelligence scores for all 6 domains.

    FIX: Previously domain intelligence scores were NEVER computed automatically.
    GovDashboard's Multi-Domain Intelligence cards showed empty because no one
    called /api/ontology/domain/{domain}/compute. This job runs every 2 hours
    after ingestion and computes fresh scores for all 6 PS domains at national scope.
    """
    DOMAINS = ["geopolitics", "economics", "defense", "climate", "technology", "society"]
    try:
        from app.core.supabase_client import get_supabase_admin
        from datetime import datetime, timedelta, timezone

        sb = get_supabase_admin()
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        computed_count = 0

        for domain in DOMAINS:
            try:
                # Fetch last 24h entries for this domain
                entries_result = await asyncio.to_thread(
                    lambda d=domain: sb.table("sentiment_entries")
                    .select("sentiment, sentiment_score, urgency_score, primary_topic_id")
                    .eq("domain", d)
                    .gte("ingested_at", cutoff)
                    .execute()
                )

                entries = entries_result.data or []
                if not entries:
                    logger.debug(f"Domain score [{domain}]: no entries in last 24h, skipping")
                    continue

                total = len(entries)
                avg_sentiment = sum(e.get("sentiment_score", 0) for e in entries) / total
                avg_urgency = sum(e.get("urgency_score", 0) or 0 for e in entries) / total
                negative_count = sum(1 for e in entries if e.get("sentiment") == "negative")
                negative_ratio = negative_count / total

                # Risk score: weighted combination
                risk_score = round(min(negative_ratio * 0.6 + avg_urgency * 0.4, 1.0), 4)

                if risk_score >= 0.7:
                    urgency_level = "critical"
                elif risk_score >= 0.4:
                    urgency_level = "high"
                elif risk_score >= 0.2:
                    urgency_level = "moderate"
                else:
                    urgency_level = "low"

                # Build key factors from top topics
                topic_counts: dict = {}
                for e in entries:
                    tid = e.get("primary_topic_id")
                    if tid:
                        topic_counts[tid] = topic_counts.get(tid, 0) + 1
                sorted_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)
                key_factors = [{"topic_id": t[0], "mentions": t[1]} for t in sorted_topics[:5]]

                score_data = {
                    "domain": domain,
                    "scope": "national",
                    "scope_id": None,
                    "risk_score": risk_score,
                    "sentiment_trend": round(avg_sentiment, 4),
                    "urgency_level": urgency_level,
                    "key_factors": key_factors,
                    "entity_ids": [],
                    "metadata": {
                        "entries_analyzed": total,
                        "negative_ratio": round(negative_ratio, 4),
                        "avg_urgency": round(avg_urgency, 4),
                        "auto_computed": True,
                    },
                    "computed_at": datetime.now(timezone.utc).isoformat(),
                }

                await asyncio.to_thread(
                    lambda d=score_data: sb.table("domain_intelligence").insert(d).execute()
                )
                computed_count += 1
                logger.info(f"Domain score [{domain}]: risk={risk_score:.3f} urgency={urgency_level} entries={total}")

            except Exception as domain_err:
                logger.warning(f"Domain score computation failed for [{domain}]: {domain_err}")
                continue

        logger.info(f"Scheduled domain score computation complete: {computed_count}/{len(DOMAINS)} domains updated")

    except asyncio.CancelledError:
        logger.info("Scheduled domain score computation cancelled during shutdown")
        return
    except Exception as e:
        logger.error(f"Scheduled domain score computation failed: {e}")


async def _run_incident_detection():
    """Background job: detect and create Delhi incidents + chain effects."""
    try:
        from app.services.incident_engine import detect_incidents_in_delhi
        incidents_created = await detect_incidents_in_delhi()
        logger.info(f"Delhi incident detection: {len(incidents_created)} new incidents")
    except asyncio.CancelledError:
        logger.info("Delhi incident detection cancelled during shutdown")
        return
    except Exception as e:
        logger.error(f"Delhi incident detection failed: {e}")


async def _continuous_rss_poller(stop_event: asyncio.Event):
    """Continuous RSS polling fallback when APScheduler is disabled.

    Runs with moderate interval + jitter to avoid aggressive feed hits.
    """
    s = get_settings()
    logger.info(
        "Continuous RSS poller enabled: every ~%sm (jitter ±%ss)",
        s.rss_poll_interval_min,
        s.rss_poll_jitter_sec,
    )

    while not stop_event.is_set():
        try:
            await _scheduled_news_ingestion()
            await _scheduled_gnews_ingestion()
        except asyncio.CancelledError:
            return
        except Exception as e:
            logger.error(f"Continuous RSS poller run failed: {e}")

        sleep_for = _poll_sleep_seconds(s.rss_poll_interval_min, s.rss_poll_jitter_sec)
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=sleep_for)
        except asyncio.TimeoutError:
            continue


# ─────────────────────────────────────────────────────────────────────────────
# App lifespan
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown."""

    # Use settings for intervals
    from app.core.settings import get_settings
    from datetime import datetime, timezone
    s = get_settings()
    rss_stop_event: asyncio.Event | None = None
    rss_task: asyncio.Task | None = None

    if s.enable_scheduler:
        news_interval = _bounded_minutes(s.scheduler_news_interval_min)
        gnews_interval = _bounded_minutes(s.scheduler_gnews_interval_min)
        reddit_interval = _bounded_minutes(s.scheduler_reddit_interval_min)
        domain_interval = _bounded_minutes(s.scheduler_domain_interval_min)

        scheduler.add_job(_scheduled_domain_ingestion, "interval", minutes=s.scheduler_domain_interval_min, id="domain_ingest", max_instances=1, coalesce=True)
        scheduler.add_job(
            _scheduled_news_ingestion,
            "interval",
            minutes=news_interval,
            jitter=max(0, s.rss_poll_jitter_sec),
            id="news_ingest",
            max_instances=1,
            coalesce=True,
            next_run_time=datetime.now(timezone.utc),
        )
        scheduler.add_job(
            _scheduled_gnews_ingestion,
            "interval",
            minutes=gnews_interval,
            jitter=max(0, s.rss_poll_jitter_sec),
            id="gnews_ingest",
            max_instances=1,
            coalesce=True,
            next_run_time=datetime.now(timezone.utc),
        )
        scheduler.add_job(_scheduled_reddit_ingestion, "interval", minutes=reddit_interval, id="reddit_ingest", max_instances=1, coalesce=True)
        # Snapshots, alerts, and domain intelligence scores
        scheduler.add_job(_scheduled_snapshot, "interval", hours=1, id="snapshot", max_instances=1, coalesce=True)
        scheduler.add_job(_scheduled_alert_check, "interval", hours=6, id="alert_check", max_instances=1, coalesce=True)
        # FIX: Auto-compute domain intelligence scores every 2h so GovDashboard always has fresh data
        scheduler.add_job(_scheduled_domain_score_computation, "interval", hours=2, id="domain_scores", max_instances=1, coalesce=True)
        scheduler.add_job(_run_incident_detection, "interval", minutes=15, id="delhi_incident_detection", max_instances=1, coalesce=True)

        scheduler.start()
        logger.info(
            f"Background scheduler started: domains({domain_interval}m), news({news_interval}m), "
            f"gnews({gnews_interval}m), reddit({reddit_interval}m), "
            f"snapshot(1h), domain_scores(2h), alerts(6h), incident_detection(15m)"
        )
        logger.info("RSS ingestion starts immediately on app boot, then continues on interval.")
    else:
        if s.enable_rss_autopoll:
            rss_stop_event = asyncio.Event()
            rss_task = asyncio.create_task(_continuous_rss_poller(rss_stop_event))
            logger.info(
                "Background scheduler disabled; RSS autopoll fallback is active (every ~%sm, jitter ±%ss).",
                s.rss_poll_interval_min,
                s.rss_poll_jitter_sec,
            )
        else:
            logger.info("Background scheduler disabled (ENABLE_SCHEDULER=false). API latency mode enabled.")

    yield
    if s.enable_scheduler:
        scheduler.shutdown(wait=False)
        logger.info("Background scheduler stopped")
    if rss_stop_event is not None:
        rss_stop_event.set()
    if rss_task is not None:
        rss_task.cancel()
        try:
            await rss_task
        except asyncio.CancelledError:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# App setup (unchanged from original)
# ─────────────────────────────────────────────────────────────────────────────

settings = get_settings()


class _LimitRequestSizeMiddleware(BaseHTTPMiddleware):
    _MAX = 1_000_000

    async def dispatch(self, request: StarletteRequest, call_next):
        cl = request.headers.get("content-length")
        if cl and int(cl) > self._MAX:
            return JSONResponse(
                {"detail": "Request body too large. Maximum allowed size is 1 MB."},
                status_code=413,
            )
        return await call_next(request)


class _SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' ws: wss: https:; "
            "frame-ancestors 'none'; "
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        if not settings.debug:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response


app = FastAPI(
    title="JanaNaadi API",
    description="India's Real-Time Public Sentiment Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

if not settings.debug:
    _localhost = [o for o in settings.cors_origins if "localhost" in o or "127.0.0.1" in o]
    if _localhost:
        logging.getLogger("jananaadi").warning(
            "PRODUCTION WARNING: CORS still allows localhost origins %s.", _localhost
        )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(_SecurityHeadersMiddleware)
app.add_middleware(_LimitRequestSizeMiddleware)

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
app.include_router(incidents.router)
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