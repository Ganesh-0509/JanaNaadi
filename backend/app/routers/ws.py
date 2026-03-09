"""WebSocket endpoint — streams live national pulse to all connected clients."""

import asyncio
import json
import logging
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


def _ensure_caches() -> None:
    """Populate state and topic name caches lazily (sync — called from sync context)."""
    global _state_names, _topic_names
    if _state_names and _topic_names:
        return
    try:
        sb = get_supabase_admin()
        if not _state_names:
            rows = sb.table("states").select("id, name").execute()
            _state_names = {r["id"]: r["name"] for r in rows.data or []}
        if not _topic_names:
            rows = sb.table("topic_taxonomy").select("id, name").execute()
            _topic_names = {r["id"]: r["name"] for r in rows.data or []}
    except Exception as e:
        logger.warning(f"WS cache load failed: {e}")


def publish_voice_entry(entry: dict) -> None:
    """Called by ingest.py after storing a new entry. Non-blocking."""
    _ensure_caches()
    state_id = entry.get("state_id")
    topic_id = entry.get("primary_topic_id")
    payload = {
        "type": "entry",
        "text": (entry.get("original_text") or "")[:280],
        "sentiment": entry.get("sentiment", "neutral"),
        "sentiment_score": entry.get("sentiment_score", 0),
        "topic": _topic_names.get(topic_id) if topic_id else None,
        "state_id": state_id,
        "state": _state_names.get(state_id) if state_id else None,
        "source": entry.get("source", "unknown"),
        "language": entry.get("language", "en"),
    }
    try:
        _entry_queue.put_nowait(payload)
    except asyncio.QueueFull:
        pass  # Drop entry if queue is full — this is non-critical


async def _get_pulse() -> dict:
    """Build the national pulse payload (same data as /api/public/national-pulse)."""
    try:
        sb = get_supabase_admin()
        snapshot = await get_or_compute_snapshot("national", None, period_hours=24)
        topics = {t["id"]: t["name"] for t in (sb.table("topic_taxonomy").select("id, name").execute().data or [])}
        top_3 = [
            {"topic": topics.get(t["topic_id"], "Unknown"), "count": t["count"]}
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
    """Broadcast national pulse every 30 seconds, and flush voice entry queue as entries arrive."""
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

        # Every 30 ticks (30 seconds) send a national pulse broadcast
        if tick % 30 == 0:
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
        # 1. Send an immediate national pulse snapshot
        payload = await _get_pulse()
        await websocket.send_text(json.dumps(payload))

        # 2. Replay last 20 entries from DB so the page is never empty on open
        try:
            _ensure_caches()
            sb = get_supabase_admin()
            result = (
                sb.table("sentiment_entries")
                .select("original_text, sentiment, sentiment_score, primary_topic_id, state_id, source, language")
                .order("ingested_at", desc=True)
                .limit(20)
                .execute()
            )
            # Send in chronological order so newest appears at top after frontend prepends
            for row in reversed(result.data or []):
                state_id = row.get("state_id")
                topic_id = row.get("primary_topic_id")
                hist = {
                    "type": "entry",
                    "text": (row.get("original_text") or "")[:280],
                    "sentiment": row.get("sentiment", "neutral"),
                    "sentiment_score": row.get("sentiment_score") or 0,
                    "topic": _topic_names.get(topic_id) if topic_id else None,
                    "state_id": state_id,
                    "state": _state_names.get(state_id) if state_id else None,
                    "source": row.get("source", "unknown"),
                    "language": row.get("language", "en"),
                    "historical": True,
                }
                await websocket.send_text(json.dumps(hist))
        except Exception as e:
            logger.warning(f"WS history replay failed: {e}")

        # 3. Keep connection alive — wait for pings
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning(f"WS client error: {e}")
    finally:
        _connections.discard(websocket)
        logger.info(f"WS client disconnected. Total: {len(_connections)}")
