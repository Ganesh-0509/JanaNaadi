"""Data ingestion endpoints — admin only."""

import asyncio
import csv
import io
from uuid import uuid4
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks
from app.core.auth import require_admin
from app.core.supabase_client import get_supabase_admin
from app.models.schemas import IngestStatus, ManualEntryRequest, CSVUploadResponse
from app.services.sentiment_engine import score_sentiment
from app.services.geo_engine import geolocate
from app.services.topic_engine import match_topic
from app.services.dedup_service import normalize_text, is_near_duplicate

router = APIRouter(prefix="/api/ingest", tags=["ingest"])

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
    domain: str | None = None,  # NEW: intelligence domain tag
):
    """Process a single text entry through the NLP pipeline and store it."""
    from datetime import datetime, timezone

    sb = get_supabase_admin()
    loop = asyncio.get_event_loop()

    # Fast-path dedup: if we have a source_id, check it first (O(1) indexed lookup)
    if source_id:
        sid_check = await loop.run_in_executor(
            None,
            lambda: sb.table("sentiment_entries").select("id").eq("source_id", source_id).eq("source", source).limit(1).execute(),
        )
        if sid_check.data:
            return None  # Already ingested this exact item

    # Exact text dedup: same cleaned text + same source
    cleaned = normalize_text(text)
    existing = await loop.run_in_executor(
        None,
        lambda: sb.table("sentiment_entries").select("id").eq("cleaned_text", cleaned).eq("source", source).limit(1).execute(),
    )
    if existing.data:
        return None  # Skip exact duplicate

    # Near-duplicate check against the 100 most recent entries from same source
    recent = await loop.run_in_executor(
        None,
        lambda: sb.table("sentiment_entries").select("cleaned_text").eq("source", source).order("published_at", desc=True).limit(100).execute(),
    )
    for row in recent.data or []:
        if is_near_duplicate(cleaned, row["cleaned_text"], normalized=True):
            return None  # Skip near-duplicate

    nlp = await score_sentiment(text)

    # Geolocate
    geo = geolocate(text, hints={"location_hint": location_hint} if location_hint else None)

    # Match topic
    topic_id = match_topic(text, nlp.topics[0] if nlp.topics else None)

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
        "domain": domain,  # NEW: intelligence domain
        "state_id": geo.get("state_id"),
        "district_id": geo.get("district_id"),
        "constituency_id": geo.get("constituency_id"),
        "ward_id": geo.get("ward_id"),
        "geo_confidence": geo.get("confidence", "unknown"),
        "urgency_score": nlp.urgency,
        "published_at": published_at or datetime.now(timezone.utc).isoformat(),
        "processed_at": datetime.now(timezone.utc).isoformat(),
    }
    await loop.run_in_executor(None, lambda: sb.table("sentiment_entries").insert(entry).execute())

    # Invalidate cached snapshots so dashboards reflect the new entry
    from app.core.cache import invalidate_for_entry
    invalidate_for_entry(entry.get("state_id"))

    # Broadcast to live-stream WebSocket clients
    try:
        from app.routers.ws import publish_voice_entry
        publish_voice_entry(entry)
    except Exception:
        pass  # Non-critical — never fail ingestion because of WS

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
    """Get ingestion status overview."""
    sb = get_supabase_admin()
    from datetime import datetime, timedelta, timezone

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Total entries today
    total_today_res = (
        sb.table("sentiment_entries")
        .select("id", count="exact")
        .gte("ingested_at", today_start.isoformat())
        .execute()
    )

    # Per-source counts from DB today (reflects scheduler + manual)
    source_counts: dict[str, int] = {}
    for src in ("twitter", "news", "reddit", "csv", "manual"):
        res = (
            sb.table("sentiment_entries")
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
