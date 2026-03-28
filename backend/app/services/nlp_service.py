"""NLP service: one-pass analysis with local-first execution and entity-cache population."""

import asyncio
import hashlib
import logging
from typing import Any

from app.models.schemas import NLPAnalysisResult

logger = logging.getLogger("jananaadi.nlp")

try:
    from app.services.entity_service import _entity_cache
except ImportError:
    _entity_cache = {}

_COMBINED_PROMPT = """Analyze this text and return ONLY valid JSON.

Text: "__INPUT_TEXT__"

{
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
    {"name": "string", "type": "person|organization|location|event|policy|technology|infrastructure", "description": "string", "sentiment": "positive|negative|neutral"}
  ],
  "relationships": [
    {"source": "string", "target": "string", "type": "supports|opposes|impacts|related_to|causes|part_of", "context": "string"}
  ]
}
"""


def _text_hash(text: str) -> str:
    """Use same hash strategy as entity_service to guarantee cache hits."""
    return hashlib.md5(text[:1500].encode("utf-8", errors="ignore")).hexdigest()


def _normalize_analysis(result: dict[str, Any], text: str) -> NLPAnalysisResult:
    sentiment = str(result.get("sentiment", "neutral")).lower().strip()
    if sentiment not in {"positive", "negative", "neutral"}:
        sentiment = "neutral"

    score = float(result.get("sentiment_score", 0.0) or 0.0)
    confidence = float(result.get("confidence", 0.4) or 0.4)
    urgency = float(result.get("urgency", 0.0) or 0.0)

    primary = (result.get("primary_topic") or "Other").strip()
    secondary = result.get("secondary_topics") or []
    topics = [primary] + [t for t in secondary if isinstance(t, str) and t.strip() and t != primary]

    keywords = result.get("keywords") or []
    if not isinstance(keywords, list):
        keywords = []
    keywords = [str(k).strip() for k in keywords if str(k).strip()][:20]

    language = str(result.get("language", "en") or "en")
    language_name = str(result.get("language_name", "English") or "English")
    translation = result.get("english_translation")

    return NLPAnalysisResult(
        sentiment=sentiment,
        sentiment_score=max(min(score, 1.0), -1.0),
        confidence=max(min(confidence, 1.0), 0.0),
        topics=topics if topics else ["Other"],
        keywords=keywords,
        language=language,
        language_name=language_name,
        translation=translation,
        urgency=max(min(urgency, 1.0), 0.0),
    )


def _keyword_fallback(text: str) -> NLPAnalysisResult:
    text_lower = text.lower()
    pos_words = {
        "good", "great", "excellent", "thank", "happy", "improved", "clean",
        "better", "wonderful", "appreciate", "development", "progress", "benefit",
    }
    neg_words = {
        "bad", "terrible", "worst", "corrupt", "broken", "dirty", "angry", "fail",
        "crisis", "flood", "drought", "accident", "protest", "scam", "pollution",
        "shortage", "unemployment", "inflation",
    }

    words = set(text_lower.replace("\n", " ").split())
    pos = len(words & pos_words)
    neg = len(words & neg_words)

    if pos > neg:
        sentiment, score = "positive", min(0.3 + pos * 0.08, 1.0)
    elif neg > pos:
        sentiment, score = "negative", max(-0.3 - neg * 0.08, -1.0)
    else:
        sentiment, score = "neutral", 0.0

    return NLPAnalysisResult(
        sentiment=sentiment,
        sentiment_score=score,
        confidence=0.35,
        topics=["Other"],
        keywords=[],
        language="en",
        language_name="English",
        translation=None,
        urgency=0.0,
    )


async def _analyze_with_llm(text: str) -> dict[str, Any]:
    from app.core.settings import get_settings

    settings = get_settings()
    # Do not use str.format here because the JSON schema in the prompt contains braces.
    prompt = _COMBINED_PROMPT.replace("__INPUT_TEXT__", text)

    # Local-first mode
    if settings.use_local_llm:
        from app.services.local_llm_service import generate_json

        try:
            result = await generate_json(prompt)
            logger.info("NLP via Ollama")
            return result
        except Exception as e:
            if not settings.allow_cloud_fallback:
                raise RuntimeError(f"Local-only NLP failed: {e}")
            logger.warning("Ollama failed: %s - trying cloud fallback", e)

    # Cloud mode (or local with fallback enabled)
    for attempt in range(2):
        try:
            from app.services.bytez_service import call_bytez
            result = await call_bytez(prompt)
            logger.info("NLP via Bytez (attempt %d)", attempt + 1)
            return result
        except Exception as e:
            logger.warning("Bytez failed (attempt %d): %s", attempt + 1, e)

    from app.services.gemini_service import call_gemini
    result = await call_gemini(prompt)
    logger.info("NLP via Gemini fallback")
    return result


async def analyze_text(text: str) -> NLPAnalysisResult:
    """Analyze one text and populate entity cache for later entity_service reads."""
    if not text or len(text.strip()) < 3:
        return _keyword_fallback(text)

    if not hasattr(analyze_text, "_nlp_cache"):
        analyze_text._nlp_cache = {}
    cache: dict[str, NLPAnalysisResult] = analyze_text._nlp_cache

    cache_key = hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()
    if cache_key in cache:
        return cache[cache_key]

    try:
        raw = await _analyze_with_llm(text)
        analysis = _normalize_analysis(raw, text)

        # Populate shared entity cache using SAME key strategy as entity_service.
        entity_key = _text_hash(text)
        _entity_cache[entity_key] = {
            "entities": raw.get("entities") or [],
            "relationships": raw.get("relationships") or [],
        }
        if len(_entity_cache) > 2000:
            oldest = list(_entity_cache.keys())[:200]
            for k in oldest:
                _entity_cache.pop(k, None)

        cache[cache_key] = analysis
        if len(cache) > 5000:
            oldest = list(cache.keys())[:500]
            for k in oldest:
                cache.pop(k, None)

        return analysis

    except Exception as e:
        logger.warning("NLP failed, using keyword fallback: %s", e)
        return _keyword_fallback(text)


async def batch_analyze(texts: list[str]) -> list[NLPAnalysisResult]:
    """Analyze a batch with bounded concurrency for stability."""

    sem = asyncio.Semaphore(3)

    async def _guarded(text: str) -> NLPAnalysisResult:
        async with sem:
            return await analyze_text(text)

    return list(await asyncio.gather(*(_guarded(t) for t in texts)))
