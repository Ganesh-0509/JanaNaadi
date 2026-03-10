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


async def call_bytez_model(prompt: str, max_tokens: int = 1024) -> str:
    """Send a prompt to Bytez with token limit and return raw text response.
    
    Args:
        prompt: The prompt to send to the model
        max_tokens: Maximum tokens in response (default: 1024)
        
    Returns:
        Raw text response from the model
    """
    model = _get_model()
    messages = [
        {"role": "user", "content": prompt}
    ]
    # Note: Bytez SDK may not support max_tokens directly in all models
    # Using it as a guide, actual truncation depends on model support
    result = model.run(messages)

    if result.error:
        raise RuntimeError(f"Bytez error: {result.error}")

    output = result.output
    if isinstance(output, dict):
        text = output.get("content", "").strip()
    else:
        text = str(output).strip()
    
    # If response is too long, truncate to approximate token limit
    # (rough estimate: 4 chars per token)
    max_chars = max_tokens * 4
    if len(text) > max_chars:
        text = text[:max_chars] + "..."
    
    return text
