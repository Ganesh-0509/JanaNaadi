"""Seed Delhi districts, constituencies, and all MCD wards from 2022 delimitation data."""

from __future__ import annotations

import json
import os
import random
from collections import defaultdict
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError("Set SUPABASE_URL and SUPABASE_SERVICE_KEY in your backend .env first")

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

DELHI_STATE_ID = 1

DELHI_DISTRICTS = [
    {"id": 101, "name": "Central Delhi", "state_id": DELHI_STATE_ID},
    {"id": 102, "name": "East Delhi", "state_id": DELHI_STATE_ID},
    {"id": 103, "name": "New Delhi", "state_id": DELHI_STATE_ID},
    {"id": 104, "name": "North Delhi", "state_id": DELHI_STATE_ID},
    {"id": 105, "name": "North East Delhi", "state_id": DELHI_STATE_ID},
    {"id": 106, "name": "North West Delhi", "state_id": DELHI_STATE_ID},
    {"id": 107, "name": "Shahdara", "state_id": DELHI_STATE_ID},
    {"id": 108, "name": "South Delhi", "state_id": DELHI_STATE_ID},
    {"id": 109, "name": "South East Delhi", "state_id": DELHI_STATE_ID},
    {"id": 110, "name": "South West Delhi", "state_id": DELHI_STATE_ID},
    {"id": 111, "name": "West Delhi", "state_id": DELHI_STATE_ID},
]

# Explicit mapping for common AC names. Others will be inferred via keyword heuristic.
AC_DISTRICT_MAP = {
    "Chandni Chowk": 101,
    "Matia Mahal": 101,
    "Ballimaran": 101,
    "Karol Bagh": 101,
    "Patel Nagar": 101,
    "Sadar Bazar": 101,
    "Adarsh Nagar": 104,
    "Badli": 104,
    "Burari": 104,
    "Timarpur": 104,
    "Rithala": 106,
    "Bawana": 106,
    "Rohini": 106,
    "Shalimar Bagh": 106,
    "Shakur Basti": 106,
    "Wazirpur": 104,
    "Model Town": 104,
    "Mundka": 111,
    "Kirari": 111,
    "Rajouri Garden": 111,
    "Hari Nagar": 111,
    "Tilak Nagar": 111,
    "Janakpuri": 110,
    "Dwarka": 110,
    "Matiala": 110,
    "Najafgarh": 110,
    "Delhi Cantt": 110,
    "Mehrauli": 108,
    "Chhatarpur": 108,
    "Deoli": 108,
    "Ambedkar Nagar": 108,
    "Sangam Vihar": 108,
    "Greater Kailash": 108,
    "Malviya Nagar": 108,
    "Kalkaji": 109,
    "Tughlakabad": 109,
    "Badarpur": 109,
    "Okhla": 109,
    "Jangpura": 109,
    "Trilokpuri": 102,
    "Kondli": 102,
    "Patparganj": 102,
    "Laxmi Nagar": 102,
    "Vishwas Nagar": 102,
    "Krishna Nagar": 102,
    "Gandhi Nagar": 102,
    "Shahdara": 107,
    "Rohtas Nagar": 107,
    "Ghonda": 107,
    "Seemapuri": 105,
    "Seelampur": 105,
    "Babarpur": 105,
    "Gokalpur": 105,
    "Mustafabad": 105,
    "Karawal Nagar": 105,
    "New Delhi": 103,
    "Kasturba Nagar": 103,
    "RK Puram": 110,
}


def _ward_file_path() -> Path:
    # Preferred source is workspace-level factual data file.
    candidates = [
        Path(__file__).resolve().parents[2] / "data" / "mcd_wards.json",
        Path(__file__).resolve().parent / "mcd_wards.json",
    ]
    for path in candidates:
        if path.exists():
            return path
    raise FileNotFoundError("Could not locate data/mcd_wards.json")


def _infer_district_id(ac_name: str) -> int:
    if ac_name in AC_DISTRICT_MAP:
        return AC_DISTRICT_MAP[ac_name]

    ac_lower = ac_name.lower()
    if any(k in ac_lower for k in ["rohini", "bawana", "rithala", "shalimar", "mangol", "shakur"]):
        return 106
    if any(k in ac_lower for k in ["dwarka", "najafgarh", "matiala", "cantt", "palam"]):
        return 110
    if any(k in ac_lower for k in ["karol", "chandni", "matia", "ballimaran", "patel", "sadar"]):
        return 101
    if any(k in ac_lower for k in ["okhla", "kalkaji", "tughlak", "badarpur", "jangpura"]):
        return 109
    if any(k in ac_lower for k in ["malviya", "mehrauli", "deoli", "ambedkar", "sangam"]):
        return 108
    if any(k in ac_lower for k in ["laxmi", "patpar", "trilok", "kondli", "krishna", "vishwas"]):
        return 102
    if any(k in ac_lower for k in ["seelampur", "mustafabad", "karawal", "seemapuri", "gokalpur"]):
        return 105
    if any(k in ac_lower for k in ["shahdara", "rohtas", "ghonda"]):
        return 107
    if any(k in ac_lower for k in ["adarsh", "badli", "burari", "timarpur", "wazirpur", "model"]):
        return 104
    if any(k in ac_lower for k in ["rajouri", "hari", "tilak", "vikaspuri", "uttam", "moti", "madipur", "nangloi", "kirari", "mundka"]):
        return 111
    return 103


def _synthetic_lat_lng(seed_key: str, idx: int) -> tuple[float, float]:
    rng = random.Random(f"{seed_key}-{idx}")
    lat = round(28.40 + rng.random() * 0.45, 6)
    lng = round(76.85 + rng.random() * 0.50, 6)
    return lat, lng


def _load_delhi_hierarchy() -> tuple[list[dict], list[dict]]:
    with open(_ward_file_path(), "r", encoding="utf-8") as handle:
        wards_raw = json.load(handle)

    # Build constituency IDs from AC names in deterministic sorted order.
    ac_names = sorted({row["ac"].strip() for row in wards_raw if row.get("ac")})
    constituency_id_map = {name: 1001 + i for i, name in enumerate(ac_names)}

    constituency_rows = []
    for ac_name in ac_names:
        district_id = _infer_district_id(ac_name)
        lat, lng = _synthetic_lat_lng(ac_name, constituency_id_map[ac_name])
        constituency_rows.append(
            {
                "id": constituency_id_map[ac_name],
                "name": ac_name,
                "district_id": district_id,
                "type": "assembly",
                "lat": lat,
                "lng": lng,
            }
        )

    ward_rows = []
    grouped_coords: dict[int, list[tuple[float, float]]] = defaultdict(list)
    for raw in wards_raw:
        ward_id = int(raw["id"])
        ward_name = str(raw["name"]).strip()
        ac_name = str(raw["ac"]).strip()
        constituency_id = constituency_id_map[ac_name]

        lat, lng = _synthetic_lat_lng(ward_name, ward_id)
        grouped_coords[constituency_id].append((lat, lng))

        ward_rows.append(
            {
                "id": ward_id,
                "name": f"{ward_name} Ward" if not ward_name.lower().endswith("ward") else ward_name,
                "constituency_id": constituency_id,
                "lat": lat,
                "lng": lng,
            }
        )

    # Replace constituency coordinates with centroid of member wards.
    for constituency in constituency_rows:
        coords = grouped_coords.get(constituency["id"], [])
        if not coords:
            continue
        constituency["lat"] = round(sum(c[0] for c in coords) / len(coords), 6)
        constituency["lng"] = round(sum(c[1] for c in coords) / len(coords), 6)

    return constituency_rows, ward_rows


def seed_delhi() -> None:
    print("Seeding Delhi geographic hierarchy...")

    # Ensure Delhi state exists.
    sb.table("states").upsert([{"id": DELHI_STATE_ID, "name": "Delhi", "code": "DL"}], on_conflict="id").execute()

    sb.table("districts").upsert(DELHI_DISTRICTS, on_conflict="id").execute()
    print(f"  seeded districts: {len(DELHI_DISTRICTS)}")

    constituencies, wards = _load_delhi_hierarchy()

    sb.table("constituencies").upsert(constituencies, on_conflict="id").execute()
    print(f"  seeded constituencies: {len(constituencies)}")

    sb.table("wards").upsert(wards, on_conflict="id").execute()
    print(f"  seeded wards: {len(wards)}")

    print("Delhi hierarchy seeding complete.")


if __name__ == "__main__":
    seed_delhi()
