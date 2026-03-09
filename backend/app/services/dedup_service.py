"""Duplicate detection using text similarity."""

import re
import hashlib


def normalize_text(text: str) -> str:
    """Normalize text for comparison."""
    text = text.lower().strip()
    text = re.sub(r"https?://\S+", "", text)  # Remove URLs
    text = re.sub(r"@\w+", "", text)  # Remove mentions
    text = re.sub(r"#\w+", "", text)  # Remove hashtags
    text = re.sub(r"\s+", " ", text).strip()
    return text


def text_hash(text: str) -> str:
    """Generate a hash of normalized text for fast exact-match dedup."""
    normalized = normalize_text(text)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def is_near_duplicate(text1: str, text2: str, threshold: float = 0.85) -> bool:
    """Check if two texts are near-duplicates using Jaccard similarity."""
    words1 = set(normalize_text(text1).split())
    words2 = set(normalize_text(text2).split())
    if not words1 or not words2:
        return False
    intersection = words1 & words2
    union = words1 | words2
    similarity = len(intersection) / len(union)
    return similarity >= threshold
