"""Gemini API wrapper for all LLM operations."""

import json
import google.generativeai as genai
from app.core.settings import get_settings

_model = None


def _get_model():
    global _model
    if _model is None:
        s = get_settings()
        genai.configure(api_key=s.gemini_api_key)
        _model = genai.GenerativeModel(s.gemini_model)
    return _model


async def call_gemini(prompt: str) -> dict:
    """Send a prompt to Gemini and parse JSON response."""
    model = _get_model()
    response = model.generate_content(prompt)
    text = response.text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)
    return json.loads(text)


async def call_gemini_text(prompt: str) -> str:
    """Send a prompt to Gemini and return raw text response."""
    model = _get_model()
    response = model.generate_content(prompt)
    return response.text.strip()


async def generate_action_recommendations(
    alert_type: str,
    severity: str,
    region_name: str,
    top_topics: list[str],
    stats: dict,
) -> dict:
    """Ask Gemini to generate structured government action recommendations for an alert."""
    neg_pct = round(stats.get("neg_pct", 0) * 100, 1)
    volume = stats.get("volume", 0)
    urgency = round(stats.get("urgency", 0), 2)
    topics_str = ", ".join(top_topics) if top_topics else "General governance"

    alert_desc = {
        "sentiment_spike": f"Negative sentiment has spiked to {neg_pct}% of voices",
        "volume_spike": f"Citizen complaint volume surged ({volume} entries in 6h)",
        "urgency_high": f"Urgency score is critically high at {urgency}",
    }.get(alert_type, f"Alert type: {alert_type}")

    prompt = f"""You are a senior government policy advisor for India. A real-time citizen sentiment platform has detected a {severity.upper()} alert.

Alert Details:
- Region: {region_name}
- Issue: {alert_desc}
- Top citizen concerns: {topics_str}
- Volume: {volume} voices in last 6 hours
- Urgency score: {urgency}/1.0

Generate 4 specific, actionable government recommendations for this situation. Respond ONLY with valid JSON in this exact format:
{{
  "summary": "2-sentence crisis summary for the minister",
  "actions": [
    {{
      "priority": "immediate",
      "department": "Name of responsible government department",
      "action": "Specific action to take",
      "rationale": "Why this action addresses the citizen concern",
      "kpi": "Measurable outcome within a timeframe"
    }}
  ]
}}

Priority must be one of: "immediate" (within 24h), "short_term" (1-2 weeks), "long_term" (1-3 months).
Make actions specific to India's governance structure — mention departments like PWD, BSNL, PHC, TNEB, MSEDCL, Municipal Corporation, Gram Panchayat etc. as appropriate."""

    return await call_gemini(prompt)
