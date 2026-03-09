"""
JanaNaadi — Database Seeder
Seeds Supabase with geographic data, topic taxonomy, and sample sentiment entries.
Usage: cd backend && python -m data.seed_database
"""

import json
import random
import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
    exit(1)

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

DATA_DIR = Path(__file__).parent.parent / "app" / "data"

with open(DATA_DIR / "india_locations.json", "r", encoding="utf-8") as f:
    GEO = json.load(f)

with open(DATA_DIR / "topic_taxonomy.json", "r", encoding="utf-8") as f:
    TOPICS = json.load(f)


# ── Step 1: Seed States ──────────────────────────────────────────
def seed_states():
    print("Seeding states...")
    rows = [{"id": s["id"], "name": s["name"], "code": s["code"]} for s in GEO["states"]]
    sb.table("states").upsert(rows, on_conflict="id").execute()
    print(f"  ✅ {len(rows)} states")


# ── Step 2: Seed Districts ───────────────────────────────────────
def seed_districts():
    print("Seeding districts...")
    rows = [{"id": d["id"], "name": d["name"], "state_id": d["state_id"]} for d in GEO["districts"]]
    sb.table("districts").upsert(rows, on_conflict="id").execute()
    print(f"  ✅ {len(rows)} districts")


# ── Step 3: Seed Constituencies ──────────────────────────────────
def seed_constituencies():
    print("Seeding constituencies...")
    rows = [
        {
            "id": c["id"],
            "name": c["name"],
            "district_id": c["district_id"],
            "type": c["type"],
            "lat": c.get("lat"),
            "lng": c.get("lng"),
        }
        for c in GEO["constituencies"]
    ]
    sb.table("constituencies").upsert(rows, on_conflict="id").execute()
    print(f"  ✅ {len(rows)} constituencies")


# ── Step 4: Seed Wards ───────────────────────────────────────────
def seed_wards():
    print("Seeding wards...")
    rows = [
        {
            "id": w["id"],
            "name": w["name"],
            "constituency_id": w["constituency_id"],
            "lat": w.get("lat"),
            "lng": w.get("lng"),
        }
        for w in GEO["wards"]
    ]
    sb.table("wards").upsert(rows, on_conflict="id").execute()
    print(f"  ✅ {len(rows)} wards")


# ── Step 5: Seed Topic Taxonomy ──────────────────────────────────
def seed_topics():
    print("Seeding topic taxonomy...")
    rows = [
        {
            "id": t["id"],
            "name": t["name"],
            "category": t["category"],
            "keywords": t["keywords"],
            "icon": t.get("icon"),
        }
        for t in TOPICS
    ]
    sb.table("topic_taxonomy").upsert(rows, on_conflict="id").execute()
    print(f"  ✅ {len(rows)} topics")


# ── Step 6: Seed Sentiment Entries ───────────────────────────────
SAMPLE_TEXTS = {
    1: {  # Water Supply
        "positive": [
            "New Jal Jeevan Mission pipeline has finally reached our village!",
            "Clean drinking water now available 24/7 in our ward",
            "Water ATM installed near bus stand, very convenient",
        ],
        "negative": [
            "No water supply for 3 days in our area, very frustrating",
            "Contaminated water causing illness in our colony",
            "Water tanker mafia charging Rs 500 per tank",
        ],
        "neutral": [
            "Water tanker scheduled for tomorrow morning",
            "New water treatment plant under construction",
        ],
    },
    2: {  # Roads
        "positive": [
            "Excellent new flyover connecting two major junctions",
            "Smart city project has transformed our neighborhood streets",
            "NH bypass road completed ahead of schedule",
        ],
        "negative": [
            "Potholes everywhere on NH-44, accidents happening daily",
            "Bridge still incomplete after 2 years, waste of public money",
            "Footpath encroached by hawkers, pedestrians forced on road",
        ],
        "neutral": [
            "Road widening work started on MG Road",
            "New metro line inauguration next month",
        ],
    },
    3: {  # Healthcare
        "positive": [
            "Ayushman Bharat card helped my family get free treatment",
            "New PHC opened in our village, great initiative",
            "Free health camp organized, 500 people benefited",
        ],
        "negative": [
            "Hospital has no beds available, patients turned away",
            "Medicine shortage in government hospital",
            "Only 1 doctor for 50,000 population, shameful",
        ],
        "neutral": [
            "Vaccination drive scheduled for next week",
            "New ASHA workers appointed in the district",
        ],
    },
    4: {  # Education
        "positive": [
            "Digital classrooms set up in all government schools!",
            "Free coaching helped my daughter clear NEET",
            "Library renovation completed, students very happy",
        ],
        "negative": [
            "School building roof leaking, dangerous for students",
            "Teacher shortage, children not getting quality education",
            "Mid-day meal quality is very poor, kids falling sick",
        ],
        "neutral": [
            "School admissions open for new session",
            "Board exam results out today",
        ],
    },
    5: {  # Corruption
        "positive": [
            "Vigilance department caught corrupt official, good job!",
            "Online system reduced corruption in certificate process",
        ],
        "negative": [
            "Bribes demanded for basic municipal services",
            "Tender process rigged, same contractor gets all projects",
            "Ration card office asking for Rs 2000 bribe",
        ],
        "neutral": [
            "RTI response received after 2 months",
            "Lokpal investigating corruption complaint",
        ],
    },
    6: {  # Public Safety
        "positive": [
            "CCTV installation has reduced crime significantly",
            "Women helpline response time improved to 5 minutes",
        ],
        "negative": [
            "Chain snatching incidents increasing, police not responding",
            "No street lights, women feel unsafe at night",
            "Cyber fraud cases rising, need awareness campaigns",
        ],
        "neutral": [
            "New police station inaugurated in the suburb",
            "Traffic police drive against helmet violators",
        ],
    },
    7: {  # Electricity
        "positive": [
            "Solar panels installed under PM Surya Ghar scheme",
            "24/7 electricity supply now, very happy",
        ],
        "negative": [
            "Power cut for 8 hours daily in summer, unbearable",
            "Electricity bill doubled without explanation",
            "Transformer damaged, no repair for 5 days",
        ],
        "neutral": [
            "New electricity meter installation in progress",
            "Scheduled power maintenance on Sunday",
        ],
    },
    8: {  # Sanitation
        "positive": [
            "Swachh Bharat Mission transformed our ward!",
            "New community toilet built, very clean and maintained",
        ],
        "negative": [
            "Garbage not collected for a week, stench unbearable",
            "Open drain causing health hazards in our area",
            "Sewage overflowing on main road after rain",
        ],
        "neutral": [
            "New garbage collection schedule announced",
            "Dry and wet waste segregation campaign launched",
        ],
    },
    9: {  # Employment
        "positive": [
            "New IT park creating 5000 jobs in our city!",
            "Skill development centre opened, free training available",
        ],
        "negative": [
            "Factory closed, 200 workers jobless overnight",
            "Youth unemployment at all-time high in our district",
            "Contract workers not getting minimum wage",
        ],
        "neutral": [
            "Government recruitment notification published",
            "Skill development camp next Saturday",
        ],
    },
    10: {  # Housing
        "positive": [
            "PMAY house allotted to our family, very grateful",
            "Slum rehabilitation project providing modern flats",
        ],
        "negative": [
            "Rent increased 50% in one year, unaffordable",
            "PMAY application pending for 3 years, no response",
            "Illegal construction causing safety concerns",
        ],
        "neutral": [
            "Housing board lottery results announced",
            "Property registration now available online",
        ],
    },
    11: {  # Public Transport
        "positive": [
            "New metro line reduced my commute by 40 minutes!",
            "Electric buses launched, clean and comfortable",
        ],
        "negative": [
            "Bus frequency reduced, waiting 1 hour at stop",
            "Auto drivers refusing meter, demanding double fare",
            "Railway station has no proper platform shelters",
        ],
        "neutral": [
            "Metro fare revision under discussion",
            "New bus route announced for suburban area",
        ],
    },
    13: {  # Agriculture
        "positive": [
            "MSP increased for wheat, farmers happy",
            "Drip irrigation subsidy saved my crop this season",
        ],
        "negative": [
            "Crop destroyed by unseasonal rain, no compensation",
            "Fertilizer shortage at peak sowing season",
            "Farm loan waiver promise not fulfilled",
        ],
        "neutral": [
            "Kisan Samman Nidhi installment credited",
            "Agricultural fair starting next week",
        ],
    },
    14: {  # Environment
        "positive": [
            "Tree plantation drive planted 10000 saplings!",
            "Air quality improved after industrial regulations",
        ],
        "negative": [
            "River pollution killing fish, locals worried",
            "AQI crosses 400 in our city, health emergency",
            "Illegal mining destroying local ecology",
        ],
        "neutral": [
            "Environment department conducting pollution survey",
            "Electric vehicle charging stations being installed",
        ],
    },
}

SOURCES = ["twitter", "news", "reddit", "survey", "manual"]
LANGUAGES = ["en", "hi", "ta", "te", "bn", "mr", "kn", "ml", "gu"]

SENTIMENT_SCORES = {
    "positive": lambda: round(random.uniform(0.3, 0.95), 3),
    "negative": lambda: round(random.uniform(-0.95, -0.3), 3),
    "neutral": lambda: round(random.uniform(-0.15, 0.15), 3),
}


def seed_sentiment_entries(count=500):
    """Seed sample sentiment entries."""
    print(f"Seeding {count} sentiment entries...")
    now = datetime.now(timezone.utc)
    entries = []

    for _ in range(count):
        # Random geography
        state = random.choice(GEO["states"])
        state_districts = [d for d in GEO["districts"] if d["state_id"] == state["id"]]
        district = random.choice(state_districts) if state_districts else None
        district_consts = [c for c in GEO["constituencies"] if district and c["district_id"] == district["id"]]
        constituency = random.choice(district_consts) if district_consts else None
        const_wards = [w for w in GEO["wards"] if constituency and w["constituency_id"] == constituency["id"]]
        ward = random.choice(const_wards) if const_wards else None

        # Random topic
        topic_id = random.choice(list(SAMPLE_TEXTS.keys()))
        topic_texts = SAMPLE_TEXTS[topic_id]

        # Weighted sentiment
        sentiment = random.choices(
            ["positive", "negative", "neutral"],
            weights=[0.35, 0.40, 0.25],
            k=1,
        )[0]

        available = topic_texts.get(sentiment, topic_texts.get("neutral", ["General feedback"]))
        text = random.choice(available)

        # Add location variation
        if random.random() < 0.2 and district:
            text += f" - {district['name']}"

        score = SENTIMENT_SCORES[sentiment]()
        confidence = round(random.uniform(0.65, 0.98), 3)
        language = random.choices(LANGUAGES, weights=[30, 25, 15, 10, 5, 5, 4, 3, 3], k=1)[0]
        source = random.choice(SOURCES)
        hours_ago = random.randint(0, 30 * 24)
        published = now - timedelta(hours=hours_ago)
        urgency = round(random.uniform(0.0, 0.9), 2) if sentiment == "negative" else round(random.uniform(0.0, 0.3), 2)

        cleaned = text.lower().strip()
        keywords = [w for w in cleaned.split() if len(w) > 4][:5]

        entry = {
            "id": str(uuid.uuid4()),
            "source": source,
            "source_id": f"{source}_{uuid.uuid4().hex[:8]}",
            "original_text": text,
            "cleaned_text": cleaned,
            "language": language,
            "sentiment": sentiment,
            "sentiment_score": score,
            "confidence": confidence,
            "primary_topic_id": topic_id,
            "extracted_keywords": keywords,
            "state_id": state["id"],
            "district_id": district["id"] if district else None,
            "constituency_id": constituency["id"] if constituency else None,
            "ward_id": ward["id"] if ward else None,
            "geo_confidence": random.choice(["exact", "inferred", "estimated"]),
            "urgency_score": urgency,
            "is_duplicate": False,
            "published_at": published.isoformat(),
            "ingested_at": (published + timedelta(seconds=random.randint(1, 60))).isoformat(),
            "processed_at": (published + timedelta(seconds=random.randint(2, 120))).isoformat(),
        }
        entries.append(entry)

    # Insert in batches of 100
    batch_size = 100
    for i in range(0, len(entries), batch_size):
        batch = entries[i : i + batch_size]
        sb.table("sentiment_entries").insert(batch).execute()
        print(f"  Inserted {min(i + batch_size, len(entries))}/{len(entries)}")

    # Stats
    pos = sum(1 for e in entries if e["sentiment"] == "positive")
    neg = sum(1 for e in entries if e["sentiment"] == "negative")
    neu = sum(1 for e in entries if e["sentiment"] == "neutral")
    print(f"  ✅ {len(entries)} entries (pos={pos}, neg={neg}, neu={neu})")


# ── Main ─────────────────────────────────────────────────────────
def main():
    print("🌱 JanaNaadi Database Seeder")
    print("=" * 40)

    seed_states()
    seed_districts()
    seed_constituencies()
    seed_wards()
    seed_topics()
    seed_sentiment_entries(500)

    print("\n" + "=" * 40)
    print("✅ Database seeded successfully!")
    print("Refresh your dashboard to see data.")


if __name__ == "__main__":
    main()
