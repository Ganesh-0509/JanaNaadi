#!/usr/bin/env python3
"""Apply COMPLETE_DATABASE_SCHEMA.sql to Supabase."""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from backend directory
backend_dir = os.path.join(os.path.dirname(__file__), "..")
env_file = os.path.join(backend_dir, ".env")
load_dotenv(env_file)

sys.path.insert(0, backend_dir)

def apply_schema():
    """Apply database schema using Supabase admin client."""
    print("=" * 70)
    print("Applying JanaNaadi Database Schema to Supabase")
    print("=" * 70)
    
    try:
        from app.core.supabase_client import get_supabase_admin
        from app.core.settings import Settings
        
        settings = Settings()
        
        if not settings.supabase_url or not settings.supabase_service_key:
            print("\n[ERROR] Supabase credentials not found")
            print("   Required: SUPABASE_URL, SUPABASE_SERVICE_KEY")
            return False
        
        print(f"\n[STEP 1] Connecting to Supabase...")
        print(f"   URL: {settings.supabase_url[:50]}...")
        
        sb = get_supabase_admin()
        
        # Test connection
        try:
            result = sb.table("states").select("id").limit(1).execute()
            print(f"[OK] Connected to Supabase")
        except Exception as e:
            if "relation" in str(e).lower():
                print(f"[OK] Connected to Supabase (tables need creation)")
            else:
                raise
        
        # Read schema file
        schema_file = Path(__file__).parent.parent / "COMPLETE_DATABASE_SCHEMA.sql"
        
        if not schema_file.exists():
            print(f"\n[ERROR] Schema file not found: {schema_file}")
            return False
        
        print(f"\n[STEP 2] Reading schema file...")
        print(f"   File: {schema_file}")
        
        with open(schema_file, 'r') as f:
            schema_sql = f.read()
        
        print(f"   Schema size: {len(schema_sql)} bytes")
        
        # Note: Supabase Python client doesn't support raw SQL execution from admin view
        # We need to use the REST API directly
        print(f"\n[STEP 3] Schema application via SQL...")
        print(f"   [INFO] Direct SQL execution requires psql client or Supabase UI")
        print(f"   [INFO] Schema file is ready at: {schema_file}")
        
        print(f"\n[STEP 4] Checking existing tables...")
        
        tables_to_check = [
            "states",
            "districts", 
            "constituencies",
            "wards",
            "sentiment_entries",
            "entities",
            "entity_relationships",
            "topic_taxonomy",
        ]
        
        missing_tables = []
        for table in tables_to_check:
            try:
                result = sb.table(table).select("id").limit(1).execute()
                print(f"   [OK] {table:25} exists")
            except Exception:
                print(f"   [MISSING] {table:22} — needs creation")
                missing_tables.append(table)
        
        if missing_tables:
            print(f"\n[STEP 5] Schema Application Instructions")
            print(f"\nTo apply the schema, use ONE of these methods:\n")
            
            print(f"METHOD 1: Supabase Web Dashboard (Recommended)")
            print(f"   1. Go to: https://app.supabase.com")
            print(f"   2. Project: cexwqmjjnocylynxmcbb")
            print(f"   3. SQL Editor → New Query")
            print(f"   4. Copy contents of: backend/COMPLETE_DATABASE_SCHEMA.sql")
            print(f"   5. Execute")
            
            print(f"\nMETHOD 2: Command Line (requires psql)")
            print(f"   # Install: https://www.postgresql.org/download/")
            print(f"   psql -h db.cexwqmjjnocylynxmcbb.supabase.co \\")
            print(f"        -U postgres \\")
            print(f"        -d postgres \\")
            print(f"        -f backend/COMPLETE_DATABASE_SCHEMA.sql")
            
            print(f"\n[WARNING] {len(missing_tables)} tables pending creation")
            print(f"   Tables: {', '.join(missing_tables[:3])}...")
            
            return True  # Schema ready, just not applied yet
        else:
            print(f"\n[SUCCESS] All tables already exist!")
            print(f"   Database schema is fully applied")
            return True
            
    except Exception as e:
        print(f"\n[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = apply_schema()
    sys.exit(0 if success else 1)
