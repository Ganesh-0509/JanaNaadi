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


def is_near_duplicate(
    text1: str,
    text2: str,
    threshold: float = 0.85,
    normalized: bool = False,
) -> bool:
    """Check if two texts are near-duplicates using Jaccard similarity.

    Pass ``normalized=True`` when both inputs are already the output of
    :func:`normalize_text` to avoid redundant re-processing.
    """
    t1 = text1 if normalized else normalize_text(text1)
    t2 = text2 if normalized else normalize_text(text2)
    words1 = set(t1.split())
    words2 = set(t2.split())
    if not words1 or not words2:
        return False
    intersection = words1 & words2
    union = words1 | words2
    similarity = len(intersection) / len(union)
    return similarity >= threshold
