"""Data ingestion endpoints — admin only."""

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
from app.services.dedup_service import normalize_text

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


async def _process_and_store(
    text: str,
    source: str,
    location_hint: str | None = None,
    source_id: str | None = None,
    source_url: str | None = None,
    published_at: str | None = None,
):
    """Process a single text entry through the NLP pipeline and store it."""
    from app.services.dedup_service import text_hash
    from datetime import datetime, timezone

    sb = get_supabase_admin()

    # Dedup: skip if exact duplicate exists
    entry_hash = text_hash(text)
    existing = (
        sb.table("sentiment_entries")
        .select("id")
        .eq("cleaned_text", normalize_text(text))
        .eq("source", source)
        .limit(1)
        .execute()
    )
    if existing.data:
        return None  # Skip duplicate

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
        "state_id": geo.get("state_id"),
        "district_id": geo.get("district_id"),
        "constituency_id": geo.get("constituency_id"),
        "ward_id": geo.get("ward_id"),
        "geo_confidence": geo.get("confidence", "unknown"),
        "urgency_score": nlp.urgency,
        "published_at": published_at or datetime.now(timezone.utc).isoformat(),
        "processed_at": datetime.now(timezone.utc).isoformat(),
    }
    sb.table("sentiment_entries").insert(entry).execute()
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

    async def run_twitter():
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

    background_tasks.add_task(run_twitter)
    return {"status": "triggered", "source": "twitter"}


@router.post("/news")
async def ingest_news(
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_admin),
):
    """Trigger RSS news ingestion job."""
    from app.ingesters.news_ingester import NewsIngester

    async def run_news():
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

    background_tasks.add_task(run_news)
    return {"status": "triggered", "source": "news"}


@router.get("/status", response_model=IngestStatus)
async def ingest_status(user: dict = Depends(require_admin)):
    """Get ingestion status overview."""
    sb = get_supabase_admin()
    from datetime import datetime, timedelta, timezone

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    total_today = (
        sb.table("sentiment_entries")
        .select("id", count="exact")
        .gte("ingested_at", today_start.isoformat())
        .execute()
    )

    return IngestStatus(
        total_today=total_today.count or 0,
        queue_size=0,
    )
