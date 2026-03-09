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
