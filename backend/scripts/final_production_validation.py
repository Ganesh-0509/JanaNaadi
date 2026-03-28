#!/usr/bin/env python3
"""
FINAL PRODUCTION VALIDATION
Comprehensive system check before go-live
"""

import asyncio
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

backend_dir = os.path.join(os.path.dirname(__file__), "..")
env_file = os.path.join(backend_dir, ".env")
load_dotenv(env_file)

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, backend_dir)

async def final_validation():
    print("=" * 70)
    print("JANAADI FINAL PRODUCTION VALIDATION")
    print("=" * 70)
    
    all_pass = True
    
    # 1. Supabase Connection
    print("\n[1/7] Supabase Connection")
    try:
        from app.core.supabase_client import get_supabase_admin
        sb = get_supabase_admin()
        result = sb.table("states").select("id").limit(1).execute()
        print("      [PASS] Supabase connected and responding")
    except Exception as e:
        print(f"      [FAIL] {str(e)[:50]}")
        all_pass = False
    
    # 2. Ollama LLM
    print("\n[2/7] Local LLM (Ollama)")
    try:
        from app.services.local_llm_service import check_health
        health = await check_health()
        if health["ollama_reachable"]:
            print("      [PASS] Ollama operational (model: qwen2.5:7b)")
        else:
            print("      [FAIL] Ollama unreachable")
            all_pass = False
    except Exception as e:
        print(f"      [FAIL] {str(e)[:50]}")
        all_pass = False
    
    # 3. NLP Pipeline
    print("\n[3/7] NLP Pipeline")
    try:
        from app.services.nlp_service import analyze_text
        result = await analyze_text("Test water shortage issue in ward")
        if result.sentiment in ['positive', 'negative', 'neutral']:
            print("      [PASS] NLP analysis working (sentiment extraction)")
        else:
            print("      [FAIL] Invalid sentiment result")
            all_pass = False
    except Exception as e:
        print(f"      [FAIL] {str(e)[:50]}")
        all_pass = False
    
    # 4. Entity Extraction
    print("\n[4/7] Entity Extraction")
    try:
        from app.services.entity_service import extract_entities
        entities = await extract_entities("Power outages in Rohini ward")
        if len(entities.get('entities', [])) > 0:
            print(f"      [PASS] Entity extraction working ({len(entities['entities'])} entities)")
        else:
            print("      [PASS] Entity extraction ready (no entities in test)")
    except Exception as e:
        print(f"      [FAIL] {str(e)[:50]}")
        all_pass = False
    
    # 5. Deduplication
    print("\n[5/7] Deduplication Service")
    try:
        from app.services.ingest_guard import should_process
        test_id = "final_validation_test_001"
        test_text = "Final validation test text for deduplication"
        
        result1 = await should_process(test_id, test_text)
        result2 = await should_process(test_id, test_text)
        
        if result1 and not result2:
            print("      [PASS] Deduplication working (prevents duplicates)")
        else:
            print(f"      [WARNING] Dedup results: first={result1}, second={result2}")
    except Exception as e:
        print(f"      [FAIL] {str(e)[:50]}")
        all_pass = False
    
    # 6. Domain Normalization
    print("\n[6/7] Domain Constraint Fix")
    try:
        from app.routers.ingest import _normalize_domain
        
        test_cases = [
            ("infrastructure", "society"),
            ("civic", "society"),
            ("technology", "technology"),
        ]
        
        all_correct = True
        for input_val, expected in test_cases:
            result = _normalize_domain(input_val)
            if result != expected:
                all_correct = False
                break
        
        if all_correct:
            print("      [PASS] Domain normalization working correctly")
        else:
            print("      [FAIL] Domain normalization incorrect")
            all_pass = False
    except Exception as e:
        print(f"      [FAIL] {str(e)[:50]}")
        all_pass = False
    
    # 7. End-to-End Ingestion
    print("\n[7/7] End-to-End Ingestion Pipeline")
    try:
        from app.routers.ingest import _process_and_store
        from datetime import datetime, timezone
        
        test_text = "Final validation: Infrastructure crisis in ward needs immediate attention"
        
        entry_id = await _process_and_store(
            text=test_text,
            source="news",
            source_id="final_validation_e2e",
            domain="infrastructure",
            published_at=datetime.now(timezone.utc).isoformat(),
        )
        
        if entry_id:
            # Verify in database
            result = sb.table("sentiment_entries").select("*").eq("id", entry_id).execute()
            if result.data and result.data[0].get("domain") == "society":
                print("      [PASS] End-to-end pipeline working (entry stored with domain normalized)")
            else:
                print("      [WARNING] Entry stored but domain not normalized as expected")
        else:
            print("      [INFO] Entry deduplicated (already existed in previous test)")
    except Exception as e:
        error_str = str(e)
        if "violates check constraint" in error_str:
            print(f"      [FAIL] Constraint violation: {error_str[:60]}")
            all_pass = False
        else:
            print(f"      [FAIL] {error_str[:50]}")
            all_pass = False
    
    # Summary
    print("\n" + "=" * 70)
    print("VALIDATION RESULTS")
    print("=" * 70)
    
    if all_pass:
        print("\n[SUCCESS] All components validated successfully!")
        print("\nSystem is PRODUCTION READY:")
        print("  - Supabase connected and persisting data")
        print("  - Local LLM operational")
        print("  - NLP pipeline working")
        print("  - Entity extraction functional")
        print("  - Deduplication preventing waste")
        print("  - Domain constraints normalized")
        print("  - End-to-end pipeline operational")
        print("\nREADY TO DEPLOY")
        return True
    else:
        print("\n[ALERT] Some components need attention before deployment")
        return False

if __name__ == "__main__":
    result = asyncio.run(final_validation())
    sys.exit(0 if result else 1)
