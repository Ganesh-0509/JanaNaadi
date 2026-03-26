import os
import json
import uuid
from datetime import datetime, timedelta
import random

# 🏛️ Load Factual MCD Wards Data (Extracted from 2022 Gazette)
WARDS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "mcd_wards.json")

def load_wards():
    with open(WARDS_FILE, "r") as f:
        return json.load(f)

WARDS = load_wards()

LEADERSHIP = [
    {"name": "Raja Iqbal Singh", "role": "Mayor of Delhi (MCD)", "type": "PERSON"},
    {"name": "Ashwani Kumar", "role": "MCD Commissioner", "type": "PERSON"},
    {"name": "Atishi", "role": "Chief Minister of Delhi", "type": "PERSON"},
    {"name": "Saurabh Bharadwaj", "role": "Urban Development Minister", "type": "PERSON"},
]

SCHEMES = [
    {"name": "Mohalla Clinic", "type": "HEALTH", "domain": "society", "context": "Universal primary healthcare for Delhi residents."},
    {"name": "MCD Smart Schools", "type": "EDUCATION", "domain": "society", "context": "Modernization of municipal primary education."},
    {"name": "Green Delhi App", "type": "ENV", "domain": "climate", "context": "Unified portal for pollution complaints."},
    {"name": "Farishtay Dilli Ke", "type": "SOCIAL", "domain": "society", "context": "Emergency healthcare assistance scheme."},
    {"name": "Nirmal Delhi", "type": "SANITATION", "domain": "society", "context": "MCD waste management and cleanliness drive."}
]

# Real-world subjects for Delhi Pulse
SUBJECTS = [
    "Heavy air pollution reporting in {ward} ({ac} AC) area.",
    "Sanitation workers cleared garbage efficiently in {ward}.",
    "Water supply issues reported near {ward} Ward Office.",
    "MCD Smart School in {ward} ({ac}) showing high attendance.",
    "Repair needed for PWD roads in {ac} AC, specifically near {ward}.",
    "Green Delhi App usage is high in {ward} for dust complaints.",
    "Ward Councilor visit in {ward} appreciated by local residents."
]

def calculate_priority(ward, sentiment_score):
    """
    HEURISTIC PRIORITY ENGINE (Hackathon Winner Logic)
    Higher population + Lower sentiment = Higher priority.
    """
    score = (abs(sentiment_score) * 0.4) + (ward['population'] / 100000 * 0.6)
    
    # Social Equity Bonus: If Ward has high SC population, priority increases
    if ward.get('sc_population', 0) > 15000:
        score += 0.2
        
    return min(1.0, score)

def seed():
    print("🚀 Generating STRATEGIC Delhi MCD Seed (2022 Delimitation Real Data)...")
    
    data = {
        "metadata": {
            "source": "State Election Commission (Delhi) - Delimitation 2022",
            "total_wards_mapped": len(WARDS),
            "engine": "Strategic Priority Simulator v1.0"
        },
        "wards": WARDS,
        "leadership": LEADERSHIP,
        "schemes": SCHEMES,
        "mock_pulse": []
    }

    # Generate 500 factual-context entries with Strategic Priority
    for _ in range(500):
        ward = random.choice(WARDS)
        text = random.choice(SUBJECTS).format(ward=ward["name"], ac=ward["ac"])
        
        sent = random.uniform(-0.8, 1.0) # Bias slightly positive
        if any(bad in text for bad in ["pollution", "issues", "Repair"]):
            sent = random.uniform(-1.0, -0.3)

        priority = calculate_priority(ward, sent)

        data["mock_pulse"].append({
            "id": str(uuid.uuid4()),
            "text": text,
            "sentiment": "positive" if sent > 0.2 else "negative" if sent < -0.2 else "neutral",
            "sentiment_score": sent,
            "priority_score": round(priority, 2),
            "ward_id": ward["id"],
            "ward_name": ward["name"],
            "ac_name": ward["ac"],
            "domain": random.choice(["society", "climate", "economics"]),
            "timestamp": (datetime.now() - timedelta(hours=random.randint(0, 168))).isoformat(),
            "is_strategic_alert": priority > 0.75
        })

    output_file = "strategic_delhi_mcd_seed.json"
    with open(output_file, "w") as f:
        json.dump(data, f, indent=2)
    
    print(f"✅ Success! Generated {output_file}")
    print(f"💡 Intelligence: {sum(1 for x in data['mock_pulse'] if x['is_strategic_alert'])} Wards identified as 'High Priority' based on Population & Sentiment.")

if __name__ == "__main__":
    seed()
