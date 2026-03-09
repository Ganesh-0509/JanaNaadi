"""Bytez API service — primary LLM provider using google/gemini-2.5-flash."""

import json
import logging
from bytez import Bytez
from app.core.settings import get_settings

logger = logging.getLogger("jananaadi.bytez")

_client = None
_model = None


def _get_model():
    global _client, _model
    if _model is None:
        s = get_settings()
        if not s.bytez_api_key:
            raise RuntimeError("BYTEZ_API_KEY not configured")
        _client = Bytez(s.bytez_api_key)
        _model = _client.model(s.bytez_model)
    return _model


async def call_bytez(prompt: str) -> dict:
    """Send a prompt to Bytez (gemini-2.5-flash) and parse JSON response."""
    model = _get_model()
    messages = [
        {"role": "user", "content": prompt}
    ]
    result = model.run(messages)

    if result.error:
        raise RuntimeError(f"Bytez error: {result.error}")

    # Output is {"role": "assistant", "content": "..."}
    output = result.output
    if isinstance(output, dict):
        text = output.get("content", "")
    else:
        text = str(output)

    text = text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)
    return json.loads(text)


async def call_bytez_text(prompt: str) -> str:
    """Send a prompt to Bytez and return raw text response."""
    model = _get_model()
    messages = [
        {"role": "user", "content": prompt}
    ]
    result = model.run(messages)

    if result.error:
        raise RuntimeError(f"Bytez error: {result.error}")

    output = result.output
    if isinstance(output, dict):
        return output.get("content", "").strip()
    return str(output).strip()
