"""Data ingestion endpoints — admin only."""

import asyncio
import csv
import io
import logging
from uuid import uuid4
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks
from app.core.auth import require_admin
from app.core.supabase_client import get_supabase_admin
from app.models.schemas import IngestStatus, ManualEntryRequest, CSVUploadResponse
from app.services.sentiment_engine import score_sentiment
from app.services.geo_engine import geolocate
from app.services.topic_engine import match_topic
from app.services.dedup_service import normalize_text, is_near_duplicate

logger = logging.getLogger("jananaadi.ingest")
router = APIRouter(prefix="/api/ingest", tags=["ingest"])


def _retry_supabase_query(query_fn, max_retries=3):
    """Retry Supabase queries on transient connection errors (HTTP/2 connection termination)."""
    import time
    from httpx import RemoteProtocolError
    
    for attempt in range(max_retries):
        try:
            return query_fn()
        except RemoteProtocolError as e:
            if attempt < max_retries - 1:
                wait_time = 0.1 * (2 ** attempt)  # Exponential backoff: 0.1s, 0.2s, 0.4s
                logger.warning(f"Supabase connection error (attempt {attempt + 1}/{max_retries}), retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                logger.error(f"Supabase connection failed after {max_retries} attempts")
                raise

# Tracks the result of the last ingestion run for each source so the status
# endpoint can report actual counts rather than just "triggered".
_last_run_info: dict[str, dict] = {
    "twitter": {},
    "news": {},
    "reddit": {},
    "gnews": {},
}


 
async def _process_and_store(
    text: str,
    source: str,
    location_hint: str | None = None,
    source_id: str | None = None,
    source_url: str | None = None,
    published_at: str | None = None,
    domain: str | None = None,
):
    """Process a single text entry through the NLP pipeline and store it.
 
    Call flow (1 Bytez call total per new article):
      1. ingest_guard.should_process()  — skip if already in DB (free)
      2. score_sentiment(text)          — calls nlp_service.analyze_text()
                                          which runs ONE combined Bytez prompt:
                                          sentiment + entities + relationships
                                          and caches the entity result
      3. store to sentiment_entries     — as before
      4. process_entry_for_entities()  — reads entity result from cache (FREE)
                                          stores entities + cross-domain edges
    """
    from datetime import datetime, timezone
    from app.services.ingest_guard import should_process
 
    sb = get_supabase_admin()
    loop = asyncio.get_event_loop()
 
    # ── Step 1: Dedup via ingest_guard (replaces the 3 manual dedup checks) ──
    # Uses: in-memory set → DB source_id check → DB text_hash check
    # All three are free — no API call. Returns False if article already exists.
    effective_source_id = source_id or f"{source}_{hash(text[:200])}"
    if not await should_process(effective_source_id, text):
        return None  # already ingested, skip
 
    # ── Step 2: NLP analysis — ONE Bytez call covers sentiment + entities ─────
    # score_sentiment → nlp_service.analyze_text → combined Bytez prompt
    # Entity result is stored in _entity_cache keyed by text hash
    nlp = await score_sentiment(text)
 
    # ── Step 3: Geolocate + topic match (unchanged) ───────────────────────────
    geo = geolocate(text, hints={"location_hint": location_hint} if location_hint else None)
    topic_id = match_topic(text, nlp.topics[0] if nlp.topics else None)
 
    # ── Step 4: Build and store the entry ─────────────────────────────────────
    entry = {
        "id": str(uuid4()),
        "source": source,
        "source_id": source_id,
        "source_url": source_url,
        "original_text": text,
        "cleaned_text": normalize_text(text),
        "language": nlp.language,
        "translated_text": nlp.translation,
        "sentiment": nlp.sentiment,
        "sentiment_score": nlp.sentiment_score,
        "confidence": nlp.confidence,
        "primary_topic_id": topic_id,
        "extracted_keywords": nlp.keywords,
        "domain": domain,
        "state_id": geo.get("state_id"),
        "district_id": geo.get("district_id"),
        "constituency_id": geo.get("constituency_id"),
        "ward_id": geo.get("ward_id"),
        "geo_confidence": geo.get("confidence", "unknown"),
        "urgency_score": nlp.urgency,
        "published_at": published_at or datetime.now(timezone.utc).isoformat(),
        "processed_at": datetime.now(timezone.utc).isoformat(),
    }
 
    await loop.run_in_executor(
        None, lambda: sb.table("sentiment_entries").insert(entry).execute()
    )
 
    # Invalidate cached snapshots
    from app.core.cache import invalidate_for_entry
    invalidate_for_entry(entry.get("state_id"))
 
    # Broadcast to WebSocket clients
    try:
        from app.routers.ws import publish_voice_entry
        publish_voice_entry(entry)
    except Exception:
        pass
 
    # ── Step 5: Store entities + cross-domain edges (0 extra API calls) ───────
    # process_entry_for_entities() calls extract_entities() which reads from
    # the cache populated in step 2 — guaranteed cache hit, no Bytez call.
    try:
        from app.services.entity_service import process_entry_for_entities
        await process_entry_for_entities(
            entry_id=entry["id"],
            text=text,
            sentiment=nlp.sentiment,
            domain=domain,
        )
    except Exception as e:
        # Entity extraction failure must never break ingestion
        import logging
        logging.getLogger("jananaadi.ingest").warning(
            f"Entity extraction failed for entry {entry['id']}: {e}"
        )
 
    return entry


@router.post("/manual")
async def ingest_manual(
    req: ManualEntryRequest,
    user: dict = Depends(require_admin),
):
    """Submit a single manual entry for processing."""
    entry = await _process_and_store(req.text, "manual", req.location_hint)
    if entry is None:
        return {"status": "duplicate", "entry_id": None}
    return {"status": "ok", "entry_id": entry["id"]}


@router.post("/csv", response_model=CSVUploadResponse)
async def ingest_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: dict = Depends(require_admin),
):
    """Upload CSV survey data for batch processing."""
    # Validate file type before reading content
    allowed_types = {"text/csv", "application/csv", "text/plain", "application/octet-stream"}
    filename = file.filename or ""
    if not filename.lower().endswith(".csv"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Only .csv files are allowed.")
    if file.content_type and file.content_type not in allowed_types:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")

    sb = get_supabase_admin()
    content = await file.read()
    text_content = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text_content))
    rows = list(reader)

    upload_id = str(uuid4())
    upload_record = {
        "id": upload_id,
        "uploaded_by": user["id"],
        "filename": file.filename or "upload.csv",
        "row_count": len(rows),
        "status": "processing",
    }
    sb.table("survey_uploads").insert(upload_record).execute()

    async def process_csv_rows():
        processed = 0
        for row in rows:
            text = row.get("text") or row.get("feedback") or row.get("comment", "")
            if not text or len(text.strip()) < 5:
                continue
            location_hint = row.get("location") or row.get("area")
            try:
                await _process_and_store(text, "csv", location_hint)
                processed += 1
            except Exception:
                continue
        sb.table("survey_uploads").update(
            {"status": "completed", "processed_count": processed}
        ).eq("id", upload_id).execute()

    background_tasks.add_task(process_csv_rows)

    return CSVUploadResponse(
        upload_id=upload_id,
        filename=file.filename or "upload.csv",
        row_count=len(rows),
        status="processing",
    )


@router.post("/twitter")
async def ingest_twitter(
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_admin),
):
    """Trigger Twitter ingestion job."""
    from app.ingesters.twitter_ingester import TwitterIngester

    from datetime import datetime, timezone

    async def run_twitter_tracked():
        ingester = TwitterIngester()
        entries = await ingester.fetch()
        count = 0
        for entry in entries:
            try:
                result = await _process_and_store(
                    entry["text"],
                    "twitter",
                    location_hint=entry.get("location"),
                    source_id=entry.get("source_id"),
                    source_url=f"https://twitter.com/i/status/{entry.get('source_id', '')}" if entry.get("source_id") else None,
                )
                if result:
                    count += 1
            except Exception:
                continue
        _last_run_info["twitter"] = {
            "ran_at": datetime.now(timezone.utc).isoformat(),
            "count": count,
        }

    background_tasks.add_task(run_twitter_tracked)
    return {"status": "triggered", "source": "twitter"}


@router.post("/news")
async def ingest_news(
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_admin),
):
    """Trigger RSS news ingestion job."""
    from app.ingesters.news_ingester import NewsIngester

    from datetime import datetime, timezone

    async def run_news_tracked():
        ingester = NewsIngester()
        entries = await ingester.fetch()
        count = 0
        for entry in entries:
            try:
                result = await _process_and_store(
                    entry["text"],
                    "news",
                    location_hint=entry.get("location"),
                    source_id=entry.get("source_id"),
                    source_url=entry.get("source_url"),
                )
                if result:
                    count += 1
            except Exception:
                continue
        _last_run_info["news"] = {
            "ran_at": datetime.now(timezone.utc).isoformat(),
            "count": count,
        }

    background_tasks.add_task(run_news_tracked)
    return {"status": "triggered", "source": "news"}


@router.post("/reddit")
async def ingest_reddit(
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_admin),
):
    """Trigger Reddit ingestion job."""
    from app.ingesters.reddit_ingester import RedditIngester
    from datetime import datetime, timezone

    async def run_reddit_tracked():
        ingester = RedditIngester()
        entries = await ingester.fetch()
        count = 0
        for entry in entries:
            try:
                result = await _process_and_store(
                    entry["text"],
                    "reddit",
                    location_hint=entry.get("location"),
                    source_id=entry.get("source_id"),
                    source_url=entry.get("source_url"),
                )
                if result:
                    count += 1
            except Exception:
                continue
        _last_run_info["reddit"] = {
            "ran_at": datetime.now(timezone.utc).isoformat(),
            "count": count,
        }

    background_tasks.add_task(run_reddit_tracked)
    return {"status": "triggered", "source": "reddit"}


@router.post("/gnews")
async def ingest_gnews(
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_admin),
):
    """Trigger Google News RSS ingestion job."""
    from app.ingesters.gnews_ingester import GNewsIngester
    from datetime import datetime, timezone

    async def run_gnews_tracked():
        ingester = GNewsIngester()
        entries = await ingester.fetch()
        count = 0
        for entry in entries:
            try:
                result = await _process_and_store(
                    entry["text"],
                    "news",
                    location_hint=entry.get("location"),
                    source_id=entry.get("source_id"),
                    source_url=entry.get("source_url"),
                    published_at=entry.get("published_at"),
                )
                if result:
                    count += 1
            except Exception:
                continue
        _last_run_info["gnews"] = {
            "ran_at": datetime.now(timezone.utc).isoformat(),
            "count": count,
        }

    background_tasks.add_task(run_gnews_tracked)
    return {"status": "triggered", "source": "gnews"}


@router.get("/status", response_model=IngestStatus)
async def ingest_status(user: dict = Depends(require_admin)):
    """Get ingestion status overview with retry logic for transient connection errors."""
    sb = get_supabase_admin()
    from datetime import datetime, timedelta, timezone

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Total entries today - wrapped in retry
    total_today_res = _retry_supabase_query(
        lambda: sb.table("sentiment_entries")
        .select("id", count="exact")
        .gte("ingested_at", today_start.isoformat())
        .execute()
    )

    # Per-source counts from DB today (reflects scheduler + manual) - wrapped in retry
    source_counts: dict[str, int] = {}
    for src in ("twitter", "news", "reddit", "csv", "manual"):
        res = _retry_supabase_query(
            lambda src=src: sb.table("sentiment_entries")
            .select("id", count="exact")
            .eq("source", src)
            .gte("ingested_at", today_start.isoformat())
            .execute()
        )
        source_counts[src] = res.count or 0

    tw = _last_run_info.get("twitter", {})
    nw = _last_run_info.get("news", {})
    rd = _last_run_info.get("reddit", {})
    gn = _last_run_info.get("gnews", {})

    return IngestStatus(
        twitter_last_run=tw.get("ran_at"),
        news_last_run=nw.get("ran_at"),
        reddit_last_run=rd.get("ran_at"),
        gnews_last_run=gn.get("ran_at"),
        twitter_last_count=tw.get("count"),
        news_last_count=nw.get("count"),
        reddit_last_count=rd.get("count"),
        gnews_last_count=gn.get("count"),
        total_today=total_today_res.count or 0,
        queue_size=0,
        source_counts=source_counts,
    )
