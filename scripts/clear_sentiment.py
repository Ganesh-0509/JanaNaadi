import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
sb: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

def clear_mock_sentiment():
    print("🗑️ Purging Mock Sentiment Data surgically (Batch Delete)...")
    count = 0
    while True:
        # Get IDs of first 1000
        res = sb.table("sentiment_entries").select("id").limit(1000).execute()
        if not res.data: break
        
        ids = [r["id"] for r in res.data]
        sb.table("sentiment_entries").delete().in_("id", ids).execute()
        count += len(ids)
        print(f"   - Purged {count} Mock Pulses...")
        
    print(f"✅ Database Pure: Total {count} Mock Pulses Cleared.")

if __name__ == "__main__":
    clear_mock_sentiment()
