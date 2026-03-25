"""AI Policy Brief generator — Bytez primary, Gemini fallback."""

import logging
from uuid import uuid4
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger("jananaadi.briefs")


async def _call_llm_for_brief(prompt: str) -> dict:
    """Try Bytez first, fall back to Gemini."""
    try:
        from app.services.bytez_service import call_bytez
        result = await call_bytez(prompt)
        logger.info("Brief generated via Bytez")
        return result
    except Exception as e:
        logger.warning(f"Bytez failed for brief: {e}, falling back to Gemini")
    from app.services.gemini_service import call_gemini
    return await call_gemini(prompt)


BRIEF_PROMPT = """You are a governance analyst. Generate a policy brief based on citizen sentiment data.

Region: {region_name} ({scope_type})
Period: {period}
Total entries analyzed: {total}
Positive: {positive} | Negative: {negative} | Neutral: {neutral}
Average sentiment score: {avg_score:.2f} (scale: -1 to +1)

Top issues mentioned:
{top_issues}

Sample citizen voices (negative):
{negative_samples}

Sample citizen voices (positive):
{positive_samples}

Generate a policy brief in this EXACT JSON format:
{{
  "title": "Policy Brief: [Region] — [Period]",
  "summary": "2-3 sentence executive summary",
  "key_findings": [
    {{"finding": "description", "sentiment": "positive/negative", "topic": "topic name", "evidence_count": number}},
    {{"finding": "description", "sentiment": "positive/negative", "topic": "topic name", "evidence_count": number}},
    {{"finding": "description", "sentiment": "positive/negative", "topic": "topic name", "evidence_count": number}}
  ],
  "recommendations": [
    {{"action": "specific action", "priority": "high/medium/low", "rationale": "brief reason"}},
    {{"action": "specific action", "priority": "high/medium/low", "rationale": "brief reason"}},
    {{"action": "specific action", "priority": "high/medium/low", "rationale": "brief reason"}}
  ]
}}"""


async def generate_brief(scope_type: str, scope_id: int | None, period: str) -> dict:
    """Generate an AI policy brief for a given scope and period."""
    import hashlib
    sb = get_supabase_admin()

    # Determine period range
    period_days = {"daily": 1, "weekly": 7, "monthly": 30}.get(period, 7)

    # Fetch entries for scope
    query = sb.table("sentiment_entries").select("*")
    if scope_type == "state" and scope_id:
        query = query.eq("state_id", scope_id)
    elif scope_type == "district" and scope_id:
        query = query.eq("district_id", scope_id)
    elif scope_type == "constituency" and scope_id:
        query = query.eq("constituency_id", scope_id)
    elif scope_type == "ward" and scope_id:
        query = query.eq("ward_id", scope_id)

    from datetime import datetime, timedelta, timezone
    since = (datetime.now(timezone.utc) - timedelta(days=period_days)).isoformat()
    entries = query.gte("ingested_at", since).limit(500).execute()

    data = entries.data or []
    total = len(data)
    positive = sum(1 for e in data if e["sentiment"] == "positive")
    negative = sum(1 for e in data if e["sentiment"] == "negative")
    neutral = total - positive - negative
    avg_score = sum(e.get("sentiment_score", 0) for e in data) / max(total, 1)

    # Extract top issues from primary_topic_id
    topic_counts: dict[str, int] = {}
    for e in data:
        kws = e.get("extracted_keywords") or []
        for k in kws[:2]:
            topic_counts[k] = topic_counts.get(k, 0) + 1
    top_issues = sorted(topic_counts.items(), key=lambda x: -x[1])[:5]
    top_issues_str = "\n".join(f"- {t}: {c} mentions" for t, c in top_issues) or "- No data"

    # Sample voices
    neg_samples = [e["cleaned_text"][:200] for e in data if e["sentiment"] == "negative"][:3]
    pos_samples = [e["cleaned_text"][:200] for e in data if e["sentiment"] == "positive"][:3]

    # Resolve region name for all scope types
    region_name = "National" if not scope_id else f"{scope_type} #{scope_id}"
    if scope_id:
        table_map = {
            "state": "states",
            "district": "districts",
            "constituency": "constituencies",
            "ward": "wards",
        }
        table = table_map.get(scope_type)
        if table:
            row = sb.table(table).select("name").eq("id", scope_id).limit(1).execute()
            if row.data:
                region_name = row.data[0]["name"]

    prompt = BRIEF_PROMPT.format(
        region_name=region_name,
        scope_type=scope_type,
        period=period,
        total=total,
        positive=positive,
        negative=negative,
        neutral=neutral,
        avg_score=avg_score,
        top_issues=top_issues_str,
        negative_samples="\n".join(f'- "{s}"' for s in neg_samples) or "- None",
        positive_samples="\n".join(f'- "{s}"' for s in pos_samples) or "- None",
    )

    # Caching: Use a hash of the prompt as the cache key
    cache_key = hashlib.sha256(prompt.encode()).hexdigest()
    if not hasattr(generate_brief, "_brief_cache"):
        generate_brief._brief_cache = {}
    cache = generate_brief._brief_cache
    if cache_key in cache:
        logger.info(f"Brief cache HIT for {region_name} {period}")
        result = cache[cache_key]
    else:
        result = await _call_llm_for_brief(prompt)
        cache[cache_key] = result

    # Store brief
    brief = {
        "id": str(uuid4()),
        "scope_type": scope_type,
        "scope_id": scope_id,
        "period": period,
        "title": result.get("title", f"Brief: {region_name}"),
        "summary": result.get("summary", ""),
        "key_findings": result.get("key_findings", []),
        "recommendations": result.get("recommendations", []),
        "raw_stats": {
            "total": total,
            "positive": positive,
            "negative": negative,
            "neutral": neutral,
            "avg_score": avg_score,
        },
    }
    sb.table("policy_briefs").insert(brief).execute()

    return brief
