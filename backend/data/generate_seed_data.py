"""
JanaNaadi — Seed Data Generator
Generates realistic sentiment entries across Indian geography for demo/testing.
Usage: python -m data.generate_seed_data
"""

import json
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path
import hashlib

# Load geography data
DATA_DIR = Path(__file__).parent.parent / "app" / "data"
with open(DATA_DIR / "india_locations.json", "r", encoding="utf-8") as f:
    GEO = json.load(f)

with open(DATA_DIR / "topic_taxonomy.json", "r", encoding="utf-8") as f:
    TOPICS = json.load(f)

STATES = GEO["states"]
DISTRICTS = GEO["districts"]
CONSTITUENCIES = GEO["constituencies"]
WARDS = GEO["wards"]

SOURCES = ["twitter", "news", "reddit", "survey"]
LANGUAGES = ["en", "hi", "ta", "te", "bn", "mr", "kn", "ml", "gu"]

# Sample texts by topic and sentiment (English/Hindi mix)
SAMPLE_TEXTS = {
    "Water Supply": {
        "positive": [
            "New Jal Jeevan Mission pipeline has finally reached our village!",
            "जल जीवन मिशन से गाँव में पानी की समस्या दूर हुई",
            "Clean drinking water now available 24/7 in our ward, great work by municipality",
            "બોર શુદ્ધ પાણીની સુવિધા ખૂબ સારી",
        ],
        "negative": [
            "No water supply for 3 days in our area, very frustrating",
            "पानी की बहुत किल्लत है, टैंकर भी नहीं आ रहा",
            "Contaminated water causing illness in our colony, urgent action needed",
            "தண்ணீர் பிரச்சனை தீர்க்கப்படவில்லை",
        ],
        "neutral": [
            "Water tanker scheduled for tomorrow morning in sector 5",
            "पानी का बिल ₹200 आया है इस महीने",
            "New water treatment plant under construction near Yamuna",
        ],
    },
    "Roads & Infrastructure": {
        "positive": [
            "Excellent new flyover connecting two major junctions, traffic improved",
            "सड़क का काम बहुत अच्छा हो रहा है",
            "Smart city project has transformed our neighborhood streets",
        ],
        "negative": [
            "Potholes everywhere on NH-44, accidents happening daily",
            "सड़कें बहुत खराब हैं, गड्ढों से भरी हुई",
            "Bridge still incomplete after 2 years, waste of public money",
            "রাস্তার অবস্থা একদম খারাপ",
        ],
        "neutral": [
            "Road widening work started on MG Road",
            "New metro line inauguration next month",
        ],
    },
    "Healthcare": {
        "positive": [
            "Ayushman Bharat card helped my family get free treatment",
            "आयुष्मान भारत से बहुत मदद मिली",
            "New PHC opened in our village, great initiative by govt",
        ],
        "negative": [
            "Hospital has no beds available, patients turned away",
            "अस्पताल में डॉक्टर ही नहीं है, बहुत बुरी हालत",
            "Medicine shortage in government hospital, forced to buy expensive drugs",
        ],
        "neutral": [
            "Vaccination drive scheduled for next week",
            "New ASHA workers appointed in the district",
        ],
    },
    "Education": {
        "positive": [
            "Digital classrooms set up in all government schools, amazing!",
            "सरकारी स्कूल में कंप्यूटर लैब खुल गई",
            "Free coaching helped my daughter clear NEET",
        ],
        "negative": [
            "School building in terrible condition, roof leaking",
            "शिक्षकों की भारी कमी है, बच्चों की पढ़ाई खराब हो रही",
            "Mid-day meal quality is very poor",
        ],
        "neutral": [
            "School admissions open for new session",
            "Board exam results out today",
        ],
    },
    "Public Safety": {
        "positive": [
            "CCTV installation in our area has reduced crime significantly",
            "पुलिस पेट्रोलिंग बढ़ गई है, महिलाएं सुरक्षित महसूस कर रही हैं",
        ],
        "negative": [
            "Chain snatching incidents increasing, police not responding",
            "रात में सड़कों पर अंधेरा है, स्ट्रीट लाइट नहीं",
            "Cyber fraud cases rising, need awareness campaigns",
        ],
        "neutral": [
            "New police station inaugurated in the suburb",
            "Traffic police drive against helmet violators",
        ],
    },
    "Employment": {
        "positive": [
            "New IT park creating 5000 jobs in our city, great news!",
            "मनरेगा से गाँव में रोजगार मिल रहा है",
        ],
        "negative": [
            "Factory closed, 200 workers jobless overnight",
            "बेरोजगारी बहुत बढ़ गई है, नौजवान परेशान",
            "Contract workers not getting minimum wage",
        ],
        "neutral": [
            "Skill development camp next Saturday at ITI college",
            "Government recruitment notification published",
        ],
    },
    "Corruption": {
        "negative": [
            "Bribes demanded for basic municipal services, disgusting",
            "भ्रष्टाचार चरम पर है, बिना रिश्वत काम नहीं होता",
            "Tender process rigged, same contractor gets all projects",
            "ఈ అవినీతి ఎప్పటికీ ఆగదా",
        ],
        "neutral": [
            "Lokpal investigating corruption complaint filed last month",
            "RTI response received after 2 months",
        ],
        "positive": [
            "Vigilance department caught corrupt official red-handed, good job!",
        ],
    },
    "Electricity": {
        "positive": [
            "Solar panels installed in our village under PM Surya Ghar scheme",
            "बिजली अब 24 घंटे आ रही है, बहुत अच्छा",
        ],
        "negative": [
            "Power cut for 8 hours daily in summer, unbearable",
            "बिजली का बिल दोगुना हो गया है, कोई सुनवाई नहीं",
            "Transformer damaged, no repair for 5 days",
        ],
        "neutral": [
            "New electricity meter installation drive in progress",
            "Scheduled power maintenance on Sunday",
        ],
    },
    "Sanitation": {
        "positive": [
            "Swachh Bharat Mission transformed our ward, clean streets now!",
            "शौचालय निर्माण से गाँव की स्थिति बहुत सुधरी",
        ],
        "negative": [
            "Garbage not collected for a week, stench unbearable",
            "नाला बंद है, गंदा पानी सड़क पर बह रहा है",
            "Open defecation still a problem despite ODF declaration",
        ],
        "neutral": [
            "New garbage collection schedule announced by municipality",
            "Dry and wet waste segregation campaign launched",
        ],
    },
    "Digital Services": {
        "positive": [
            "DigiLocker saved me from carrying documents, fantastic service",
            "ऑनलाइन सर्टिफिकेट मिनटों में मिल गया, बहुत बढ़िया",
        ],
        "negative": [
            "Government portal always down when you need it",
            "आधार अपडेट में 6 महीने लग गए, कोई समाधान नहीं",
        ],
        "neutral": [
            "New e-governance portal launched for certificate services",
            "UPI transaction volume crossed 15 billion this month",
        ],
    },
}

SENTIMENT_SCORES = {
    "positive": lambda: round(random.uniform(0.3, 0.95), 3),
    "negative": lambda: round(random.uniform(-0.95, -0.3), 3),
    "neutral": lambda: round(random.uniform(-0.2, 0.2), 3),
}


def generate_entries(count: int = 20000) -> list[dict]:
    """Generate realistic sentiment entries."""
    entries = []
    now = datetime.utcnow()

    for _ in range(count):
        # Pick random geography
        state = random.choice(STATES)
        state_districts = [d for d in DISTRICTS if d["state_id"] == state["id"]]
        district = random.choice(state_districts) if state_districts else None
        
        district_constituencies = []
        if district:
            district_constituencies = [c for c in CONSTITUENCIES if c["district_id"] == district["id"]]
        constituency = random.choice(district_constituencies) if district_constituencies else None
        
        const_wards = []
        if constituency:
            const_wards = [w for w in WARDS if w["constituency_id"] == constituency["id"]]
        ward = random.choice(const_wards) if const_wards else None

        # Pick topic and sentiment
        available_topics = list(SAMPLE_TEXTS.keys())
        topic_name = random.choice(available_topics)
        topic_data = SAMPLE_TEXTS[topic_name]
        sentiment_options = list(topic_data.keys())
        
        # Weighted sentiment: slightly more negative for realism
        weights = []
        for s in sentiment_options:
            if s == "negative":
                weights.append(0.4)
            elif s == "positive":
                weights.append(0.35)
            else:
                weights.append(0.25)
        sentiment = random.choices(sentiment_options, weights=weights, k=1)[0]

        texts = topic_data[sentiment]
        text = random.choice(texts)
        
        # Add some variation
        if random.random() < 0.3:
            text += f" #{topic_name.replace(' ', '').replace('&', '')}"
        if random.random() < 0.2 and district:
            text += f" - {district['name']}"

        score = SENTIMENT_SCORES[sentiment]()
        language = random.choice(LANGUAGES[:4])  # Heavily weight EN/HI/TA/TE
        source = random.choice(SOURCES)
        
        # Random time in last 30 days
        hours_ago = random.randint(0, 30 * 24)
        created = now - timedelta(hours=hours_ago)

        # Find topic ID
        topic_entry = next((t for t in TOPICS["topics"] if t["name"] == topic_name), None)
        topic_id = topic_entry["id"] if topic_entry else None

        text_hash = hashlib.md5(text.encode()).hexdigest()

        entry = {
            "id": str(uuid.uuid4()),
            "text": text,
            "text_hash": text_hash,
            "source": source,
            "language": language,
            "sentiment": sentiment,
            "sentiment_score": score,
            "topic_id": topic_id,
            "state_id": state["id"],
            "district_id": district["id"] if district else None,
            "constituency_id": constituency["id"] if constituency else None,
            "ward_id": ward["id"] if ward else None,
            "latitude": (ward or constituency or district or state)["lat"] + random.uniform(-0.05, 0.05),
            "longitude": (ward or constituency or district or state)["lng"] + random.uniform(-0.05, 0.05),
            "created_at": created.isoformat() + "Z",
            "processed_at": (created + timedelta(seconds=random.randint(1, 30))).isoformat() + "Z",
            "gemini_raw": None,
        }
        entries.append(entry)

    return entries


def generate_sql_inserts(entries: list[dict]) -> str:
    """Generate SQL INSERT statements for Supabase."""
    lines = ["-- JanaNaadi Seed Data", f"-- Generated: {datetime.utcnow().isoformat()}Z", f"-- Entries: {len(entries)}", ""]
    
    # Batch inserts (500 per batch)
    batch_size = 500
    for i in range(0, len(entries), batch_size):
        batch = entries[i:i + batch_size]
        lines.append("INSERT INTO sentiment_entries (id, text, text_hash, source, language, sentiment, sentiment_score, topic_id, state_id, district_id, constituency_id, ward_id, latitude, longitude, created_at, processed_at) VALUES")
        
        values = []
        for e in batch:
            escaped_text = e["text"].replace("'", "''")
            val = (
                f"('{e['id']}', '{escaped_text}', '{e['text_hash']}', "
                f"'{e['source']}', '{e['language']}', '{e['sentiment']}', "
                f"{e['sentiment_score']}, "
                f"{'NULL' if e['topic_id'] is None else e['topic_id']}, "
                f"{e['state_id']}, "
                f"{'NULL' if e['district_id'] is None else e['district_id']}, "
                f"{'NULL' if e['constituency_id'] is None else e['constituency_id']}, "
                f"{'NULL' if e['ward_id'] is None else e['ward_id']}, "
                f"{e['latitude']:.6f}, {e['longitude']:.6f}, "
                f"'{e['created_at']}', '{e['processed_at']}')"
            )
            values.append(val)
        
        lines.append(",\n".join(values) + ";\n")
    
    return "\n".join(lines)


def main():
    print("🌱 JanaNaadi Seed Data Generator")
    print("Generating 20,000 sentiment entries...")
    
    entries = generate_entries(20000)
    
    # Write SQL file
    output_dir = Path(__file__).parent
    sql = generate_sql_inserts(entries)
    sql_path = output_dir / "seed_data.sql"
    sql_path.write_text(sql, encoding="utf-8")
    print(f"✅ SQL file: {sql_path} ({len(sql) // 1024} KB)")
    
    # Write JSON file (for API testing)
    json_path = output_dir / "seed_data.json"
    json_path.write_text(json.dumps(entries[:1000], indent=2), encoding="utf-8")
    print(f"✅ JSON sample (1000 entries): {json_path}")
    
    # Print stats
    sentiments = {"positive": 0, "negative": 0, "neutral": 0}
    sources = {}
    states_count = {}
    for e in entries:
        sentiments[e["sentiment"]] += 1
        sources[e["source"]] = sources.get(e["source"], 0) + 1
        states_count[e["state_id"]] = states_count.get(e["state_id"], 0) + 1
    
    print(f"\n📊 Distribution:")
    for s, c in sentiments.items():
        print(f"  {s}: {c} ({c/len(entries)*100:.1f}%)")
    print(f"\n📡 Sources:")
    for s, c in sorted(sources.items()):
        print(f"  {s}: {c}")
    print(f"\n🗺️ States covered: {len(states_count)}")
    print(f"\nTotal entries: {len(entries)}")


if __name__ == "__main__":
    main()
