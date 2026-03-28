"""WebSocket endpoint — streams live national pulse to all connected clients."""

import asyncio
import json
import logging
import os
from pathlib import Path
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.snapshot_service import get_or_compute_snapshot
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger("jananaadi.ws")

router = APIRouter(tags=["websocket"])

# All connected websocket clients
_connections: set[WebSocket] = set()
_broadcast_task: asyncio.Task | None = None

# Queue for new voice entries to broadcast
_entry_queue: asyncio.Queue = asyncio.Queue(maxsize=500)

# In-memory name caches (loaded once, reused for all WS pushes)
_state_names: dict[int, str] = {}
_topic_names: dict[int, str] = {}
_cache_load_attempts: int = 0
_cache_load_failed: bool = False


def _load_mcd_wards() -> list[dict]:
    candidates = [
        Path(__file__).resolve().parents[3] / "data" / "mcd_wards.json",
        Path(__file__).resolve().parents[2] / "data" / "mcd_wards.json",
        Path(os.getcwd()) / "data" / "mcd_wards.json",
    ]

    for path in candidates:
        try:
            if path.exists():
                with path.open("r", encoding="utf-8") as fh:
                    data = json.load(fh)
                    if isinstance(data, list):
                        return data
        except Exception:
            continue

    return []


_MCD_WARDS = _load_mcd_wards()
_WARD_NAME_BY_ID: dict[int, str] = {
    int(w["id"]): str(w.get("name") or f"Ward {w['id']}")
    for w in _MCD_WARDS
    if w.get("id") is not None
}
_WARD_KEYWORDS: list[tuple[int, str, str]] = []
for ward_id, ward_name in _WARD_NAME_BY_ID.items():
    key = ward_name.lower().strip().replace("-", " ")
    if len(key) < 4:
        continue
    _WARD_KEYWORDS.append((ward_id, key, ward_name))


def _resolve_ward(ward_id: int | None, text: str) -> tuple[int | None, str | None]:
    if ward_id is not None:
        return ward_id, _WARD_NAME_BY_ID.get(int(ward_id), f"Ward {ward_id}")

    lowered = (text or "").lower().replace("-", " ")
    for candidate_id, keyword, ward_name in _WARD_KEYWORDS:
        if keyword in lowered:
            return candidate_id, ward_name

    return None, None


def _is_delhi_ward_entry(state_id: int | None, ward_id: int | None, text: str) -> bool:
    resolved_ward_id, _ = _resolve_ward(ward_id, text)
    if resolved_ward_id is not None:
        return True

    if state_id is not None:
        state_name = _state_names.get(int(state_id), "")
        if "delhi" in state_name.lower():
            return True

    return "delhi" in (text or "").lower()


def _ensure_caches() -> None:
    """Populate state and topic name caches lazily with retry logic."""
    global _state_names, _topic_names, _cache_load_attempts, _cache_load_failed
    
    # If caches are already loaded, return
    if _state_names and _topic_names:
        return
    
    # If we've failed too many times, skip to avoid spam
    if _cache_load_failed and _cache_load_attempts > 10:
        return
    
    _cache_load_attempts += 1
    
    try:
        sb = get_supabase_admin()
        
        # Load state names if not cached
        if not _state_names:
            try:
                rows = sb.table("states").select("id, name").execute()
                _state_names = {r["id"]: r["name"] for r in rows.data or []}
                logger.info(f"✅ WS cache: Loaded {len(_state_names)} states")
            except Exception as e:
                logger.debug(f"Failed to load states cache: {e}")
        
        # Load topic names if not cached
        if not _topic_names:
            try:
                rows = sb.table("topic_taxonomy").select("id, name").execute()
                _topic_names = {r["id"]: r["name"] for r in rows.data or []}
                logger.info(f"✅ WS cache: Loaded {len(_topic_names)} topics")
            except Exception as e:
                logger.debug(f"Failed to load topics cache: {e}")
        
        # If we successfully loaded something, reset failure flag
        if _state_names or _topic_names:
            _cache_load_failed = False
            
    except Exception as e:
        _cache_load_failed = True
        # Only log warning every 5 attempts to avoid spam
        if _cache_load_attempts % 5 == 0:
            logger.warning(f"WS cache load failed (attempt {_cache_load_attempts}): {type(e).__name__}")
        else:
            logger.debug(f"WS cache load failed: {e}")


def publish_voice_entry(entry: dict) -> None:
    """Called by ingest.py after storing a new entry. Non-blocking."""
    _ensure_caches()
    state_id = entry.get("state_id")
    topic_id = entry.get("primary_topic_id")
    text = (entry.get("original_text") or "")
    if not _is_delhi_ward_entry(state_id, entry.get("ward_id"), text):
        return
    ward_id, ward_name = _resolve_ward(entry.get("ward_id"), entry.get("original_text") or "")
    payload = {
        "type": "entry",
        "source_id": entry.get("source_id"),
        "entry_id": entry.get("id"),
        "text": text[:280],
        "sentiment": entry.get("sentiment", "neutral"),
        "sentiment_score": entry.get("sentiment_score", 0),
        "topic": _topic_names.get(topic_id) if topic_id else None,
        "state_id": state_id,
        "state": _state_names.get(state_id) if state_id else None,
        "ward_id": ward_id,
        "ward": ward_name,
        "source": entry.get("source", "unknown"),
        "source_url": entry.get("source_url"),
        "language": entry.get("language", "en"),
        # Preserve source ingest timestamp so UI relative time is not reset on reconnect.
        "ingested_at": entry.get("ingested_at") or entry.get("processed_at") or entry.get("published_at"),
    }
    try:
        _entry_queue.put_nowait(payload)
    except asyncio.QueueFull:
        pass  # Drop entry if queue is full — this is non-critical


async def _get_pulse() -> dict:
    """Build the national pulse payload (same data as /api/public/national-pulse)."""
    try:
        _ensure_caches()
        snapshot = await get_or_compute_snapshot("national", None, period_hours=24)
        top_3 = [
            {"topic": _topic_names.get(t["topic_id"], "Unknown"), "count": t["count"]}
            for t in snapshot.get("top_topics", [])[:3]
        ]
        return {
            "type": "pulse",
            "avg_sentiment": snapshot["avg_sentiment_score"],
            "total_entries_24h": snapshot["total_entries"],
            "positive_count": snapshot["positive_count"],
            "negative_count": snapshot["negative_count"],
            "neutral_count": snapshot["neutral_count"],
            "top_3_issues": top_3,
        }
    except Exception as e:
        logger.error(f"WS pulse error: {e}")
        return {"type": "pulse", "error": str(e)}


async def _broadcast_loop():
    """Broadcast national pulse every 10 seconds, and flush voice entry queue as entries arrive."""
    tick = 0
    while True:
        await asyncio.sleep(1)
        tick += 1

        if not _connections:
            # Drain queue to avoid build-up when no one is watching
            while not _entry_queue.empty():
                try:
                    _entry_queue.get_nowait()
                except Exception:
                    break
            continue

        # Flush new voice entries immediately to all WS clients
        while not _entry_queue.empty():
            try:
                entry_payload = _entry_queue.get_nowait()
                msg = json.dumps(entry_payload)
                dead: set[WebSocket] = set()
                for ws in list(_connections):
                    try:
                        await ws.send_text(msg)
                    except Exception:
                        dead.add(ws)
                _connections.difference_update(dead)
            except Exception:
                break

        # Every 10 ticks (10 seconds) send a national pulse broadcast
        if tick % 10 == 0:
            payload = await _get_pulse()
            msg = json.dumps(payload)
            dead2: set[WebSocket] = set()
            for ws in list(_connections):
                try:
                    await ws.send_text(msg)
                except Exception:
                    dead2.add(ws)
            _connections.difference_update(dead2)


@router.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    """WebSocket endpoint — immediately sends recent history + streams updates live."""
    global _broadcast_task
    await websocket.accept()
    _connections.add(websocket)
    logger.info(f"WS client connected. Total: {len(_connections)}")

    # Start the broadcast loop if not running
    if _broadcast_task is None or _broadcast_task.done():
        _broadcast_task = asyncio.create_task(_broadcast_loop())

    try:
        # 1. Replay last N entries from DB first so the page has immediate real-time context.
        try:
            from app.core.settings import get_settings
            s = get_settings()
            _ensure_caches()
            sb = get_supabase_admin()
            loop = asyncio.get_event_loop()

            def _fetch_history():
                return (
                    sb.table("sentiment_entries")
                    .select("id, source_id, original_text, sentiment, sentiment_score, primary_topic_id, state_id, ward_id, source, source_url, language, ingested_at")
                    .order("ingested_at", desc=True)
                    .limit(s.ws_history_limit)
                    .execute()
                )

            result = await asyncio.wait_for(loop.run_in_executor(None, _fetch_history), timeout=4.0)
            # Send in chronological order so newest appears at top after frontend prepends
            for row in reversed(result.data or []):
                state_id = row.get("state_id")
                topic_id = row.get("primary_topic_id")
                text = (row.get("original_text") or "")
                if not _is_delhi_ward_entry(state_id, row.get("ward_id"), text):
                    continue
                ward_id, ward_name = _resolve_ward(row.get("ward_id"), row.get("original_text") or "")
                hist = {
                    "type": "entry",
                    "source_id": row.get("source_id"),
                    "entry_id": row.get("id"),
                    "text": text[:280],
                    "sentiment": row.get("sentiment", "neutral"),
                    "sentiment_score": row.get("sentiment_score") or 0,
                    "topic": _topic_names.get(topic_id) if topic_id else None,
                    "state_id": state_id,
                    "state": _state_names.get(state_id) if state_id else None,
                    "ward_id": ward_id,
                    "ward": ward_name,
                    "source": row.get("source", "unknown"),
                    "source_url": row.get("source_url"),
                    "language": row.get("language", "en"),
                    "ingested_at": row.get("ingested_at"),
                    "historical": True,
                }
                await websocket.send_text(json.dumps(hist))
        except Exception as e:
            logger.warning(f"WS history replay failed: {e}")

        # 2. Send an immediate national pulse snapshot.
        payload = await _get_pulse()
        await websocket.send_text(json.dumps(payload))

        # 3. Keep connection alive — wait for pings
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
            except asyncio.TimeoutError:
                continue
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning(f"WS client error: {e}")
    finally:
        _connections.discard(websocket)
        logger.info(f"WS client disconnected. Total: {len(_connections)}")
