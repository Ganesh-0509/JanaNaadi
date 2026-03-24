"""NLP service — sentiment + entity extraction in ONE Bytez call per article.

KEY CHANGE: Previously nlp_service and entity_service each made a separate
Bytez call per article (2 calls/article). Now both are merged into a single
combined prompt. entity_service.extract_entities() reads from the cache that
this service populates — zero extra API calls for entities.

Call flow:
  analyze_text(text)
    → 1 Bytez call  (sentiment + entities + relationships combined)
    → stores entity result in _entity_cache keyed by text hash
    → returns NLPAnalysisResult as before

  extract_entities(text)  [called later by entity_service]
    → checks _entity_cache first (ALWAYS a hit now)
    → returns cached result, 0 additional API calls
"""

import hashlib
import logging
from app.models.schemas import NLPAnalysisResult

logger = logging.getLogger("jananaadi.nlp")

# ── Shared cache (populated here, read by entity_service) ─────────────────────
# Import the same cache dict that entity_service uses so both modules share it.
# entity_service.py already has: _entity_cache = {}
# We import it here. If the import order causes issues, just define the cache
# in this file and import it into entity_service instead.
try:
    from app.services.entity_service import _entity_cache
except ImportError:
    _entity_cache = {}  # fallback if circular import — entity_service will still cache itself

# ── Combined prompt ────────────────────────────────────────────────────────────
COMBINED_PROMPT = """Analyze this text. Return ONLY valid JSON, no markdown.

Text: "{text}"

{{
  "sentiment": "positive|negative|neutral",
  "sentiment_score": 0.0,
  "confidence": 0.8,
  "primary_topic": "Water Supply|Roads & Infrastructure|Healthcare|Education|Corruption|Public Safety|Electricity|Sanitation|Employment|Housing|Agriculture|Environment|Economic Policy|Other",
  "secondary_topics": [],
  "keywords": [],
  "urgency": 0.0,
  "language": "en",
  "language_name": "English",
  "english_translation": null,
  "entities": [
    {{"name": "string", "type": "person|organization|location|event|policy|technology", "description": "string", "sentiment": "positive|negative|neutral"}}
  ],
  "relationships": [
    {{"source": "string", "target": "string", "type": "supports|opposes|impacts|related_to|causes", "context": "string"}}
  ]
}}"""

async def _call_llm(prompt: str) -> dict:
    """Try Bytez first, fall back to Gemini, fall back to keyword engine."""
    # 1. Bytez (primary)
    try:
        from app.services.bytez_service import call_bytez
        result = await call_bytez(prompt)
        logger.info("NLP via Bytez (primary)")
        return result
    except Exception as e:
        logger.warning(f"Bytez failed: {e} — trying Gemini fallback")

    # 2. Gemini (secondary)
    try:
        from app.services.gemini_service import call_gemini
        result = await call_gemini(prompt)
        logger.info("NLP via Gemini (fallback)")
        return result
    except Exception as e:
        logger.warning(f"Gemini also failed: {e} — using keyword fallback")
        raise  # let analyze_text handle the final fallback


async def analyze_text(text: str) -> NLPAnalysisResult:
    """Full NLP analysis — ONE API call covers sentiment + entities.

    After this returns, entity_service.extract_entities() on the same text
    will always be a cache hit — no second API call needed.
    """
    text_hash = hashlib.md5(text[:1500].encode("utf-8", errors="ignore")).hexdigest()

    try:
        prompt = COMBINED_PROMPT.format(text=text[:800])
        result = await _call_llm(prompt)

        # ── Cache the entity portion so extract_entities() costs 0 calls ──
        entity_result = {
            "entities": result.get("entities", []),
            "relationships": result.get("relationships", []),
        }
        _entity_cache[text_hash] = entity_result
        # Keep cache size bounded (same logic as entity_service)
        if len(_entity_cache) > 1000:
            oldest = list(_entity_cache.keys())[0]
            del _entity_cache[oldest]

        logger.info(
            f"Combined NLP+Entity call done — "
            f"{len(entity_result['entities'])} entities cached for hash {text_hash[:8]}"
        )

        return NLPAnalysisResult(
            sentiment=result.get("sentiment", "neutral"),
            sentiment_score=float(result.get("sentiment_score", 0)),
            confidence=float(result.get("confidence", 0.5)),
            topics=[result.get("primary_topic", "Other")] + result.get("secondary_topics", []),
            keywords=result.get("keywords", []),
            language=result.get("language", "en"),
            language_name=result.get("language_name", "English"),
            translation=result.get("english_translation"),
            urgency=float(result.get("urgency", 0)),
        )

    except Exception as e:
        logger.warning(f"LLM call failed ({e}), using keyword fallback")
        # Store empty entity result in cache so extract_entities() skips API too
        _entity_cache[text_hash] = {"entities": [], "relationships": []}
        from app.services.sentiment_engine import _keyword_fallback
        return _keyword_fallback(text)


async def batch_analyze(texts: list[str]) -> list[NLPAnalysisResult]:
    """Analyze multiple texts — bounded concurrency to respect rate limits."""
    import asyncio

    _NEUTRAL_FALLBACK = NLPAnalysisResult(
        sentiment="neutral", sentiment_score=0.0, confidence=0.0,
        topics=["Other"], keywords=[], language="en",
        language_name="English", translation=None, urgency=0.0,
    )

    async def _safe(text: str) -> NLPAnalysisResult:
        try:
            return await analyze_text(text)
        except Exception:
            return _NEUTRAL_FALLBACK

    # Max 3 concurrent calls (down from 5) — gentler on free tier quota
    sem = asyncio.Semaphore(3)

    async def _guarded(text: str) -> NLPAnalysisResult:
        async with sem:
            return await _safe(text)

    return list(await asyncio.gather(*(_guarded(t) for t in texts)))