#!/usr/bin/env python3

import json
import pathlib
import sys

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[2]
MCD_WARDS_FILE = PROJECT_ROOT / "data" / "mcd_wards.json"
LOCATIONS_FILE = PROJECT_ROOT / "backend" / "app" / "data" / "india_locations.json"

def migrate_wards():
    if not MCD_WARDS_FILE.exists():
        print(f"❌ MCD wards file not found: {MCD_WARDS_FILE}")
        return False
    
    if not LOCATIONS_FILE.exists():
        print(f"❌ India locations file not found: {LOCATIONS_FILE}")
        return False
    
    with open(MCD_WARDS_FILE, "r", encoding="utf-8") as f:
        mcd_wards = json.load(f)
    
    with open(LOCATIONS_FILE, "r", encoding="utf-8") as f:
        locations = json.load(f)
    
    delhi_state_id = next((s["id"] for s in locations.get("states", []) if s["name"].lower() == "delhi"), None)
    if not delhi_state_id:
        print("❌ Delhi state not found in locations")
        return False
    
    new_wards = []
    processed_acs = set()
    ac_to_constituency_id = {}
    
    for mcd_ward in mcd_wards:
        ward_id = mcd_ward.get("id")
        ward_name = mcd_ward.get("name")
        ac_name = mcd_ward.get("ac")
        
        if not ward_id or not ward_name or not ac_name:
            continue
        
        if ac_name not in processed_acs:
            new_con = {
                "id": 1000 + len(ac_to_constituency_id),
                "name": ac_name,
                "district_id": 1,
                "state_id": delhi_state_id,
                "type": "assembly"
            }
            locations["constituencies"].append(new_con)
            ac_to_constituency_id[ac_name] = new_con["id"]
            processed_acs.add(ac_name)
        
        constituency_id = ac_to_constituency_id[ac_name]
        ward_record = {
            "id": ward_id,
            "name": ward_name,
            "constituency_id": constituency_id,
            "state_id": delhi_state_id,
            "population": mcd_ward.get("population", 0),
            "sc_population": mcd_ward.get("sc_population", 0)
        }
        new_wards.append(ward_record)
    
    locations["wards"] = new_wards
    
    with open(LOCATIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(locations, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Migrated {len(new_wards)} MCD wards from {len(processed_acs)} constituencies")
    print(f"✅ Updated {LOCATIONS_FILE}")
    return True

if __name__ == "__main__":
    success = migrate_wards()
    sys.exit(0 if success else 1)
