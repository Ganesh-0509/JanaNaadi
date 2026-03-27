"""Geographic location engine — maps text to India's democratic geography."""

import json
import pathlib
import re

DATA_DIR = pathlib.Path(__file__).resolve().parent.parent / "data"

_locations: dict | None = None


def _load_locations() -> dict:
    global _locations
    if _locations is None:
        path = DATA_DIR / "india_locations.json"
        if path.exists():
            with open(path, encoding="utf-8") as f:
                _locations = json.load(f)
        else:
            _locations = {"states": [], "districts": [], "constituencies": [], "wards": []}
    return _locations


def geolocate(text: str, hints: dict | None = None) -> dict:
    """
    Attempt to geolocate text to state/district/constituency/ward.

    Strategy:
    1. Check explicit location mentions in text
    2. Use source metadata hints
    3. Match known area keywords
    """
    locations = _load_locations()
    text_lower = text.lower()
    result = {
        "state_id": None,
        "district_id": None,
        "constituency_id": None,
        "ward_id": None,
        "confidence": "unknown",
    }

    # Signal 1: Match state names
    for state in locations.get("states", []):
        names = [state["name"].lower()]
        if "aliases" in state:
            names.extend(a.lower() for a in state["aliases"])
        for name in names:
            if re.search(r"\b" + re.escape(name) + r"\b", text_lower):
                result["state_id"] = state["id"]
                result["confidence"] = "inferred"
                break
        if result["state_id"]:
            break

    # Signal 2: Match district names (within matched state or all)
    for district in locations.get("districts", []):
        if result["state_id"] and district.get("state_id") != result["state_id"]:
            continue
        if re.search(r"\b" + re.escape(district["name"].lower()) + r"\b", text_lower):
            result["district_id"] = district["id"]
            result["state_id"] = district.get("state_id", result["state_id"])
            result["confidence"] = "inferred"
            break

    # Signal 3: Match constituency names
    for constituency in locations.get("constituencies", []):
        if result["district_id"] and constituency.get("district_id") != result["district_id"]:
            continue
        if re.search(r"\b" + re.escape(constituency["name"].lower()) + r"\b", text_lower):
            result["constituency_id"] = constituency["id"]
            result["confidence"] = "exact"
            break

    # Signal 4: Match ward names directly
    for ward in locations.get("wards", []):
        if result["constituency_id"] and ward.get("constituency_id") != result["constituency_id"]:
            continue
        if re.search(r"\b" + re.escape(ward["name"].lower()) + r"\b", text_lower):
            result["ward_id"] = ward["id"]
            result["constituency_id"] = ward.get("constituency_id", result["constituency_id"])
            result["confidence"] = "exact"
            break

    # Signal 5: Use hints from source metadata
    if hints:
        # Match location_hint text to state/district names
        hint_text = (hints.get("location_hint") or "").lower().strip()
        if hint_text and not result["state_id"]:
            for state in locations.get("states", []):
                names = [state["name"].lower()]
                if "aliases" in state:
                    names.extend(a.lower() for a in state["aliases"])
                if hint_text in names or any(hint_text in n or n in hint_text for n in names):
                    result["state_id"] = state["id"]
                    result["confidence"] = "estimated"
                    break

        if hints.get("state_id") and not result["state_id"]:
            result["state_id"] = hints["state_id"]
            result["confidence"] = "estimated"
        if hints.get("district_id") and not result["district_id"]:
            result["district_id"] = hints["district_id"]
        if hints.get("constituency_id") and not result["constituency_id"]:
            result["constituency_id"] = hints["constituency_id"]
        if hints.get("ward_id") and not result["ward_id"]:
            result["ward_id"] = hints["ward_id"]
            result["confidence"] = "exact"

    # Signal 6: Backfill hierarchy from ward/constituency IDs
    if result["ward_id"] and not result["constituency_id"]:
        for ward in locations.get("wards", []):
            if ward.get("id") == result["ward_id"]:
                result["constituency_id"] = ward.get("constituency_id")
                break

    if result["constituency_id"] and not result["district_id"]:
        for constituency in locations.get("constituencies", []):
            if constituency.get("id") == result["constituency_id"]:
                result["district_id"] = constituency.get("district_id")
                break

    if result["district_id"] and not result["state_id"]:
        for district in locations.get("districts", []):
            if district.get("id") == result["district_id"]:
                result["state_id"] = district.get("state_id")
                break

    return result
