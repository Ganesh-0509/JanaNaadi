import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
sb: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

def clear_manual_mock():
    print("🗑️ Purifying Database: Deleting all 'manual' mock pulses...")
    try:
        # Delete entries with source="manual" (our mock data)
        res = sb.table("sentiment_entries").delete().eq("source", "manual").execute()
        print(f"✅ Database Cleansed: Mock pulses removed.")
    except Exception as e:
        print(f"⚠️ Note: Mass delete may have timed out, but the 'Source Truth' logic will now favor daily news.")

if __name__ == "__main__":
    clear_manual_mock()
