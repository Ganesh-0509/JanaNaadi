"""Ingestion guard — deduplicates articles BEFORE any API call is made.

Drop this into domain_ingester.py's fetch pipeline.
Call should_process(source_id) before passing an article to analyze_text().

Uses two layers:
  1. In-memory set  — instant, no DB hit (catches duplicates within same run)
  2. Supabase check — catches duplicates across runs (articles seen before)

Result: articles already in the DB are silently skipped.
Only truly new articles consume an API call.
"""

import hashlib
import logging
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger("jananaadi.ingest_guard")

# In-memory set for the current process lifetime
_seen_this_run: set[str] = set()


def _make_hash(text: str) -> str:
    return hashlib.md5(text[:500].encode("utf-8", errors="ignore")).hexdigest()


async def should_process(source_id: str, text: str) -> bool:
    """Return True only if this article is new and should be processed.

    Checks (fastest first):
      1. In-memory set  — already seen this run
      2. DB source_id   — already ingested in a previous run
      3. DB text hash   — same content under a different source_id (near-dup)
    """
    # 1. In-memory check (free)
    if source_id in _seen_this_run:
        logger.debug(f"Skip (in-memory dup): {source_id}")
        return False

    text_hash = _make_hash(text)
    if text_hash in _seen_this_run:
        logger.debug(f"Skip (in-memory text dup): {source_id}")
        return False

    # 2. DB source_id check
    try:
        sb = get_supabase_admin()
        existing = (
            sb.table("sentiment_entries")
            .select("id")
            .eq("source_id", source_id)
            .limit(1)
            .execute()
        )
        if existing and existing.data:
            _seen_this_run.add(source_id)
            logger.debug(f"Skip (DB source_id dup): {source_id}")
            return False
    except Exception as e:
        logger.warning(f"DB dedup check failed for {source_id}: {e} — processing anyway")

    # 3. DB text hash check (catches same article with different URL)
    try:
        sb = get_supabase_admin()
        existing = (
            sb.table("sentiment_entries")
            .select("id")
            .eq("text_hash", text_hash)
            .limit(1)
            .execute()
        )
        if existing and existing.data:
            _seen_this_run.add(source_id)
            _seen_this_run.add(text_hash)
            logger.debug(f"Skip (DB text hash dup): {source_id}")
            return False
    except Exception as e:
        logger.warning(f"DB text-hash check failed for {source_id}: {e} — processing anyway")

    # New article — mark as seen and allow processing
    _seen_this_run.add(source_id)
    _seen_this_run.add(text_hash)
    return True


def clear_run_cache():
    """Call this at the start of each scheduled ingestion run."""
    _seen_this_run.clear()
    logger.info("Ingestion run cache cleared")