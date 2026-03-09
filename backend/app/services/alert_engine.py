"""Alert engine — spike detection and alert generation."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4
from app.core.supabase_client import get_supabase_admin


async def check_for_spikes():
    """
    Check recent sentiment data for spikes and generate alerts.

    Spike detection logic:
    - Compare last 6h volume/sentiment vs previous 7-day average
    - If negative sentiment > 2x average → sentiment_spike alert
    - If total volume > 3x average → volume_spike alert
    - If urgency_score avg > 0.7 → urgency_high alert
    """
    sb = get_supabase_admin()
    now = datetime.now(timezone.utc)
    six_hours_ago = now - timedelta(hours=6)
    seven_days_ago = now - timedelta(days=7)

    # Get recent entries (last 6h) grouped by constituency
    recent = (
        sb.table("sentiment_entries")
        .select("constituency_id, sentiment, urgency_score")
        .gte("ingested_at", six_hours_ago.isoformat())
        .execute()
    )

    if not recent.data:
        return []

    # Group by constituency
    constituency_data: dict[int, list] = {}
    for entry in recent.data:
        cid = entry.get("constituency_id")
        if cid:
            constituency_data.setdefault(cid, []).append(entry)

    alerts_created = []

    for cid, entries in constituency_data.items():
        total = len(entries)
        negative_count = sum(1 for e in entries if e["sentiment"] == "negative")
        avg_urgency = sum(e.get("urgency_score", 0) for e in entries) / total

        # Get 7-day baseline for this constituency
        baseline = (
            sb.table("sentiment_entries")
            .select("sentiment, urgency_score", count="exact")
            .eq("constituency_id", cid)
            .gte("ingested_at", seven_days_ago.isoformat())
            .lt("ingested_at", six_hours_ago.isoformat())
            .execute()
        )
        baseline_total = baseline.count or 1
        # Normalize to 6-hour window
        baseline_6h = baseline_total / (7 * 4)  # 4 six-hour windows per day

        # Sentiment spike: negative % is unusually high
        neg_ratio = negative_count / total if total > 0 else 0
        if neg_ratio > 0.6 and total > 5:
            alert = {
                "id": str(uuid4()),
                "alert_type": "sentiment_spike",
                "severity": "high" if neg_ratio > 0.8 else "medium",
                "scope_type": "constituency",
                "scope_id": cid,
                "title": f"Negative sentiment spike in constituency {cid}",
                "description": f"{negative_count}/{total} entries are negative in the last 6 hours ({neg_ratio:.0%}).",
                "sentiment_shift": -neg_ratio,
                "is_read": False,
                "is_resolved": False,
            }
            sb.table("alerts").insert(alert).execute()
            alerts_created.append(alert)

        # Volume spike
        if baseline_6h > 0 and total > baseline_6h * 3 and total > 10:
            volume_change = total / baseline_6h
            alert = {
                "id": str(uuid4()),
                "alert_type": "volume_spike",
                "severity": "high" if volume_change > 5 else "medium",
                "scope_type": "constituency",
                "scope_id": cid,
                "title": f"Volume spike in constituency {cid}",
                "description": f"{total} entries in last 6h vs {baseline_6h:.0f} avg. ({volume_change:.1f}x increase).",
                "volume_change": volume_change,
                "is_read": False,
                "is_resolved": False,
            }
            sb.table("alerts").insert(alert).execute()
            alerts_created.append(alert)

        # Urgency spike
        if avg_urgency > 0.7 and total > 3:
            alert = {
                "id": str(uuid4()),
                "alert_type": "urgency_high",
                "severity": "critical" if avg_urgency > 0.85 else "high",
                "scope_type": "constituency",
                "scope_id": cid,
                "title": f"High urgency detected in constituency {cid}",
                "description": f"Average urgency score: {avg_urgency:.2f} across {total} entries.",
                "is_read": False,
                "is_resolved": False,
            }
            sb.table("alerts").insert(alert).execute()
            alerts_created.append(alert)

    return alerts_created
