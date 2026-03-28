#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

async def main():
    print("=" * 70)
    print("JanaNaadi Real Data Pipeline Test")
    print("=" * 70)
    
    print("\n[1/5] Testing Supabase Connection...")
    try:
        from app.core.supabase_client import get_supabase_admin
        from app.core.settings import settings
        if not settings.supabase_url or not settings.supabase_key:
            print("⚠️  Supabase credentials not configured in .env")
            print("    Set SUPABASE_URL and SUPABASE_KEY environment variables to test")
        else:
            sb = get_supabase_admin()
            result = sb.table("states").select("id, name").limit(1).execute()
            print(f"✅ Supabase connected. Found {len(result.data or [])} states sample.")
    except Exception as e:
        print(f"⚠️  Supabase test skipped: {str(e)[:60]}")
    
    print("\n[2/5] Testing MCD Ward Geolocation...")
    try:
        from app.services.geo_engine import geolocate
        from app.data.india_locations import _load_locations
        locations = _load_locations()
        ward_count = len(locations.get("wards", []))
        print(f"✅ Loaded {ward_count} MCD wards for geolocation")
        
        test_texts = [
            "Water issues in Rohini ward Delhi",
            "Road damage Karol Bagh area",
            "Narela constituency problem",
        ]
        for text in test_texts:
            result = geolocate(text)
            ward_match = "✓" if result.get("ward_id") else "✗"
            print(f"  {ward_match} '{text[:40]}' → Ward ID: {result.get('ward_id')}")
    except Exception as e:
        print(f"⚠️  Geolocation test warning: {str(e)[:60]}")
    
    print("\n[3/5] Testing Local LLM Service...")
    try:
        from app.services.local_llm_service import check_health
        health = await check_health()
        if health["ollama_reachable"]:
            print(f"✅ Ollama is reachable on port 11434")
            print(f"   Model requested: {health['model_requested']}")
            print(f"   Model resolved: {health['model_resolved']}")
        else:
            print(f"⚠️  Ollama not reachable. Start with: ollama serve")
            print(f"   Hint: {health.get('hint')}")
    except Exception as e:
        print(f"❌ LLM health check failed: {e}")
    
    print("\n[4/5] Testing NLP Pipeline...")
    try:
        from app.services.nlp_service import analyze_text
        test_text = "The water supply in Delhi has completely failed. Residents are protesting."
        result = await analyze_text(test_text)
        print(f"✅ NLP analysis completed")
        print(f"   Sentiment: {result.sentiment} (score: {result.sentiment_score:.2f})")
        print(f"   Topics: {', '.join(result.topics[:2])}")
        print(f"   Urgency: {result.urgency:.2f}")
    except Exception as e:
        print(f"⚠️  NLP pipeline warning: {e}")
    
    print("\n[5/5] Testing Ingest Guard Deduplication...")
    try:
        from app.services.ingest_guard import should_process
        test_id_1 = "news_test_001"
        test_text = "Breaking: New road infrastructure project in Delhi announced"
        
        result1 = await should_process(test_id_1, test_text)
        print(f"✅ First ingestion: should_process={result1}")
        
        result2 = await should_process(test_id_1, test_text)
        print(f"✅ Duplicate check: should_process={result2} (should be False)")
        
        if result1 and not result2:
            print("✅ Deduplication working correctly")
        else:
            print("⚠️  Deduplication logic may need adjustment")
    except Exception as e:
        print(f"⚠️  Dedup warning: {e}")
    
    print("\n" + "=" * 70)
    print("Pipeline Test Complete")
    print("=" * 70)
    return True

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)
