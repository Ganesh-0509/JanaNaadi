
"""Local LLM service ΓÇö runs inference through Ollama on localhost.

Replaces all Bytez/Gemini cloud calls with a local model.
Install: https://ollama.com
Then:    ollama pull mistral
"""

import json
import re
import logging
import httpx

from app.core.settings import get_settings

logger = logging.getLogger("jananaadi.local_llm")

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        s = get_settings()
        _client = httpx.AsyncClient(
            base_url=s.ollama_base_url,
            timeout=httpx.Timeout(
                connect=10.0,
                read=180.0,
                write=10.0,
                pool=10.0,
            ),
        )
    return _client


async def generate_json(prompt: str, max_tokens: int = 1024) -> dict:
    """Send prompt to Ollama, force JSON output, return parsed dict."""
    s = get_settings()
    client = _get_client()

    payload = {
        "model": s.ollama_model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "format": "json",
        "options": {
            "num_predict": max_tokens,
            "temperature": 0.3,
        },
    }

    try:
        resp = await client.post("/api/chat", json=payload)
        resp.raise_for_status()
    except httpx.ConnectError:
        raise RuntimeError(
            "Cannot connect to Ollama. Is it running? "
            "Start it with: ollama serve"
        )
    except httpx.HTTPStatusError as e:
        raise RuntimeError(
            f"Ollama HTTP {e.response.status_code}: {e.response.text[:300]}"
        )

    data = resp.json()
    text = data.get("message", {}).get("content", "").strip()

    if not text:
        raise RuntimeError("Ollama returned empty response")

    # Strip markdown fences if model ignores format flag
    if text.startswith("```"):
        text = re.sub(r"```(?:json)?\n?", "", text).strip()

    # Find outermost JSON object
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        text = match.group()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse failed. Raw response:\n{text[:500]}")
        raise RuntimeError(f"Local LLM returned invalid JSON: {e}")


async def generate_text(prompt: str, max_tokens: int = 1024) -> str:
    """Send prompt to Ollama, return free-form text."""
    s = get_settings()
    client = _get_client()

    payload = {
        "model": s.ollama_model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "options": {
            "num_predict": max_tokens,
            "temperature": 0.4,
        },
    }

    try:
        resp = await client.post("/api/chat", json=payload)
        resp.raise_for_status()
    except httpx.ConnectError:
        raise RuntimeError(
            "Cannot connect to Ollama. Is it running? "
            "Start it with: ollama serve"
        )
    except httpx.HTTPStatusError as e:
        raise RuntimeError(
            f"Ollama HTTP {e.response.status_code}: {e.response.text[:300]}"
        )

    data = resp.json()
    text = data.get("message", {}).get("content", "").strip()

    if not text:
        raise RuntimeError("Ollama returned empty response")

    return text


async def check_health() -> dict:
    """Verify Ollama is reachable and model is available."""
    s = get_settings()
    client = _get_client()

    try:
        resp = await client.get("/api/tags")
        resp.raise_for_status()
        models = resp.json().get("models", [])
        model_names = [m.get("name", "").split(":")[0] for m in models]
        target = s.ollama_model.split(":")[0]
        available = target in model_names

        return {
            "ollama_reachable": True,
            "model_requested": s.ollama_model,
            "model_available": available,
            "installed_models": [m.get("name") for m in models],
            "hint": None if available else f"Run: ollama pull {s.ollama_model}",
        }
    except httpx.ConnectError:
        return {
            "ollama_reachable": False,
            "model_requested": s.ollama_model,
            "model_available": False,
            "installed_models": [],
            "hint": "Start Ollama with: ollama serve",
        }


async def generate_action_recommendations(
    alert_type: str,
    severity: str,
    region_name: str,
    top_topics: list[str],
    stats: dict,
) -> dict:
    """Generate structured government action recommendations for an alert."""
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
Make actions specific to India's governance structure ΓÇö mention departments like PWD, BSNL, PHC, TNEB, MSEDCL, Municipal Corporation, Gram Panchayat etc. as appropriate."""

    return await generate_json(prompt)
