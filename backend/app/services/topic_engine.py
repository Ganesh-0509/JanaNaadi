"""Topic taxonomy matching engine."""

import json
import pathlib

_taxonomy: list[dict] | None = None

DATA_DIR = pathlib.Path(__file__).resolve().parent.parent / "data"


def _load_taxonomy() -> list[dict]:
    global _taxonomy
    if _taxonomy is None:
        path = DATA_DIR / "topic_taxonomy.json"
        if path.exists():
            with open(path, encoding="utf-8") as f:
                _taxonomy = json.load(f)
        else:
            _taxonomy = []
    return _taxonomy


def match_topic(text: str, primary_topic_name: str | None = None) -> int | None:
    """Match a topic name to its taxonomy ID using fuzzy matching."""
    taxonomy = _load_taxonomy()
    if not primary_topic_name:
        return None
    name_lower = primary_topic_name.lower().strip()

    # Exact match first
    for topic in taxonomy:
        if topic["name"].lower() == name_lower:
            return topic["id"]

    # Partial/substring match (e.g. "Roads" matches "Roads & Infrastructure")
    for topic in taxonomy:
        topic_lower = topic["name"].lower()
        if name_lower in topic_lower or topic_lower in name_lower:
            return topic["id"]

    # Word overlap match (e.g. "Public Safety" matches "Public Safety")
    query_words = set(name_lower.split())
    best_match = None
    best_overlap = 0
    for topic in taxonomy:
        topic_words = set(topic["name"].lower().split())
        overlap = len(query_words & topic_words)
        if overlap > best_overlap:
            best_overlap = overlap
            best_match = topic["id"]
    if best_overlap >= 1:
        return best_match

    return None


def get_all_topics() -> list[dict]:
    """Return the full topic taxonomy."""
    return _load_taxonomy()
