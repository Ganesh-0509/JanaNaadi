"""Sentiment scoring engine with ML fallback."""

import re
from app.models.schemas import NLPAnalysisResult


async def score_sentiment(text: str, use_fallback: bool = False) -> NLPAnalysisResult:
    """Score sentiment: Bytez (primary) → Gemini (secondary) → keyword (emergency)."""
    if not use_fallback:
        try:
            from app.services.nlp_service import analyze_text
            return await analyze_text(text)
        except Exception:
            pass
    # Emergency fallback: lightweight keyword-based scoring
    return _keyword_fallback(text)


def _keyword_fallback(text: str) -> NLPAnalysisResult:
    """Simple keyword-based sentiment as emergency fallback."""
    text_lower = text.lower()

    positive_words = {
        "good", "great", "excellent", "thank", "happy", "improved", "clean",
        "better", "wonderful", "appreciate", "proud", "development", "progress",
        "success", "launch", "inaugurate", "boost", "growth", "relief",
        "reform", "award", "achieve", "record", "benefit", "support",
        "accha", "badiya", "shukriya", "nalla", "nandri",
    }
    negative_words = {
        "bad", "terrible", "worst", "corrupt", "broken", "dirty", "angry",
        "shame", "useless", "dangerous", "fail", "poor", "pathetic",
        "crisis", "flood", "drought", "accident", "death", "killed",
        "protest", "scam", "fraud", "violence", "attack", "bomb",
        "pollution", "shortage", "expensive", "inflation", "unemployment",
        "kharab", "ganda", "bekar", "mosam", "kettadhu",
    }

    words = set(re.findall(r"\w+", text_lower))
    pos = len(words & positive_words)
    neg = len(words & negative_words)

    if pos > neg:
        sentiment, score = "positive", min(0.3 + pos * 0.1, 1.0)
    elif neg > pos:
        sentiment, score = "negative", max(-0.3 - neg * 0.1, -1.0)
    else:
        sentiment, score = "neutral", 0.0

    # Basic topic extraction from text keywords
    topic_keywords = {
        "Water Supply": {"water", "flood", "rain", "dam", "river", "pipeline", "tanker", "drinking", "tap"},
        "Roads & Infrastructure": {"road", "highway", "bridge", "flyover", "pothole", "metro", "railway", "infrastructure"},
        "Healthcare": {"hospital", "health", "doctor", "medicine", "disease", "covid", "vaccine", "medical", "patient"},
        "Education": {"school", "college", "university", "student", "exam", "education", "teacher"},
        "Corruption": {"corruption", "scam", "bribe", "fraud", "scandal"},
        "Public Safety": {"crime", "police", "murder", "theft", "safety", "attack", "bomb", "violence"},
        "Electricity": {"electricity", "power", "solar", "energy", "blackout"},
        "Employment": {"job", "employment", "unemployment", "salary", "worker", "labour"},
        "Agriculture": {"farm", "crop", "farmer", "agriculture", "msp", "harvest"},
        "Economic Policy": {"economy", "tax", "gst", "gdp", "inflation", "budget", "trade", "oil", "price", "market"},
        "Environment": {"pollution", "climate", "environment", "forest", "waste", "emission"},
    }
    detected_topic = "Other"
    best_count = 0
    for topic_name, kws in topic_keywords.items():
        count = len(words & kws)
        if count > best_count:
            best_count = count
            detected_topic = topic_name

    return NLPAnalysisResult(
        sentiment=sentiment,
        sentiment_score=score,
        confidence=0.4,
        topics=[detected_topic],
        keywords=list(words & (positive_words | negative_words))[:10],
        language="en",
        language_name="English",
        translation=None,
        urgency=0.0,
    )
