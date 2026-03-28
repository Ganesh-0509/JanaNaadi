#!/usr/bin/env python3
"""Quick test of domain normalization and ingestion fix."""

import asyncio
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

backend_dir = os.path.join(os.path.dirname(__file__), "..")
env_file = os.path.join(backend_dir, ".env")
load_dotenv(env_file)
sys.path.insert(0, backend_dir)

async def test_domain_fix():
    print("Testing Domain Normalization Fix\n")
    print("=" * 60)
    
    # Test the normalization function
    from app.routers.ingest import _normalize_domain
    
    test_cases = [
        ("infrastructure", "society"),
        ("civic", "society"),
        ("water", "society"),
        ("transportation", "society"),
        ("technology", "technology"),
        ("defense", "defense"),
        (None, None),
        ("", "society"),  # Empty gets defaulted
        ("unknown_domain", "general"),
    ]
    
    print("\n[TEST 1] Domain Normalization Function")
    all_pass = True
    for input_val, expected in test_cases:
        result = _normalize_domain(input_val)
        status = "PASS" if result == expected else "FAIL"
        if status == "FAIL":
            all_pass = False
        print(f"  [{status}] _normalize_domain({input_val!r}) -> {result!r} (expected: {expected!r})")
    
    # Test actual ingestion
    print("\n[TEST 2] Full Ingestion with Domain Validation")
    from app.routers.ingest import _process_and_store
    from datetime import datetime, timezone
    
    test_text = "Infrastructure crisis: Power outages in Rohini ward leave residents angry"
    
    try:
        print(f"\n  Input text: '{test_text[:50]}...'")
        print(f"  Domain: 'infrastructure' (will be normalized to 'society')")
        
        entry_id = await _process_and_store(
            text=test_text,
            source="news",  # Valid: twitter, news, reddit, survey, csv, manual
            source_id=f"test_domain_fix_{hash(test_text)}",
            domain="infrastructure",  # This should be normalized
            published_at=datetime.now(timezone.utc).isoformat(),
        )
        
        if entry_id:
            print(f"\n  [PASS] Entry stored successfully!")
            print(f"  Entry ID: {entry_id}")
            
            # Verify in database
            from app.core.supabase_client import get_supabase_admin
            sb = get_supabase_admin()
            result = sb.table("sentiment_entries").select("*").eq("id", entry_id).execute()
            
            if result.data:
                entry = result.data[0]
                actual_domain = entry.get("domain")
                print(f"  Stored domain: {actual_domain}")
                
                if actual_domain == "society":
                    print(f"\n  [PASS] Domain correctly normalized to 'society'")
                    all_pass = all_pass and True
                else:
                    print(f"\n  [FAIL] Domain should be 'society' but is '{actual_domain}'")
                    all_pass = False
            else:
                print(f"\n  [FAIL] Entry not found in database")
                all_pass = False
        else:
            print(f"  [INFO] Entry was deduplicated (already existed)")
            all_pass = False  # For clean test, should be new
            
    except Exception as e:
        error_msg = str(e)
        if "domain_check" in error_msg or "violates check constraint" in error_msg:
            print(f"\n  [FAIL] Domain constraint still violated!")
            print(f"  Error: {error_msg[:100]}")
            all_pass = False
        else:
            print(f"\n  [ERROR] Unexpected error: {error_msg[:100]}")
            all_pass = False
    
    print("\n" + "=" * 60)
    if all_pass:
        print("RESULT: All tests PASSED - Domain fix is working!")
        return True
    else:
        print("RESULT: Some tests FAILED - Review the output above")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_domain_fix())
    sys.exit(0 if result else 1)
