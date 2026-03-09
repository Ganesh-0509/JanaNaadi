"""NLP service — sentiment, topic extraction, translation via Bytez (primary) + Gemini (fallback)."""

import logging
from app.models.schemas import NLPAnalysisResult

logger = logging.getLogger("jananaadi.nlp")


SENTIMENT_PROMPT = """Analyze this citizen feedback about governance/public services in India.

Text: "{text}"

Return ONLY valid JSON (no extra text):
{{
  "language": "ISO 639-1 code (e.g. en, hi, ta, te, bn, mr, kn, ml, gu)",
  "language_name": "English/Hindi/Tamil/etc",
  "english_translation": "translation if not English, else null",
  "sentiment": "positive or negative or neutral",
  "sentiment_score": "float between -1.0 (very negative) and 1.0 (very positive)",
  "confidence": "float between 0 and 1",
  "primary_topic": "one of: Water Supply, Roads & Infrastructure, Healthcare, Education, Corruption, Public Safety, Electricity, Sanitation, Employment, Housing, Public Transport, Digital Services, Agriculture, Environment, Women Safety, Law & Order, Economic Policy, Other",
  "secondary_topics": ["topic2"],
  "keywords": ["extracted", "keywords"],
  "urgency": "float 0 to 1 (0=casual opinion, 1=emergency)"
}}"""


async def _call_llm(prompt: str) -> dict:
    """Try Bytez first (primary/heavy), fall back to Gemini (secondary/light)."""
    # 1. Try Bytez (primary — gemini-2.5-flash via Bytez)
    try:
        from app.services.bytez_service import call_bytez
        result = await call_bytez(prompt)
        logger.info("NLP via Bytez (primary)")
        return result
    except Exception as e:
        logger.warning(f"Bytez failed: {e}, falling back to Gemini")

    # 2. Fall back to Gemini (secondary — direct API)
    from app.services.gemini_service import call_gemini
    result = await call_gemini(prompt)
    logger.info("NLP via Gemini (fallback)")
    return result


async def analyze_text(text: str) -> NLPAnalysisResult:
    """Full NLP analysis — Bytez primary, Gemini fallback."""
    prompt = SENTIMENT_PROMPT.format(text=text[:2000])
    result = await _call_llm(prompt)

    return NLPAnalysisResult(
        sentiment=result.get("sentiment", "neutral"),
        sentiment_score=float(result.get("sentiment_score", 0)),
        confidence=float(result.get("confidence", 0.5)),
        topics=[result.get("primary_topic", "Other")]
        + result.get("secondary_topics", []),
        keywords=result.get("keywords", []),
        language=result.get("language", "en"),
        language_name=result.get("language_name", "English"),
        translation=result.get("english_translation"),
        urgency=float(result.get("urgency", 0)),
    )


async def batch_analyze(texts: list[str]) -> list[NLPAnalysisResult]:
    """Analyze multiple texts sequentially (Gemini doesn't support true batch)."""
    results = []
    for text in texts:
        try:
            r = await analyze_text(text)
            results.append(r)
        except Exception:
            # Append a neutral fallback on failure
            results.append(
                NLPAnalysisResult(
                    sentiment="neutral",
                    sentiment_score=0.0,
                    confidence=0.0,
                    topics=["Other"],
                    keywords=[],
                    language="en",
                    language_name="English",
                    translation=None,
                    urgency=0.0,
                )
            )
    return results
