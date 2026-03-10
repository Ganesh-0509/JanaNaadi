"""
Quick script to populate the Knowledge Graph with entities.

This extracts entities from existing sentiment entries to build the graph.
"""

import asyncio
import httpx

API_URL = "http://localhost:8000"

async def populate_graph():
    """Extract entities from recent entries."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        print("🔄 Starting entity extraction from sentiment entries...")
        print("This may take 30-60 seconds...\n")
        
        # Extract from 50 most recent entries
        response = await client.post(
            f"{API_URL}/api/ontology/extract-batch?limit=50"
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Extraction complete!\n")
            print(f"📊 Results:")
            print(f"   - Entries processed: {result['entries_processed']}")
            print(f"   - Entries skipped: {result['entries_skipped']}")
            print(f"   - Errors: {result['errors']}")
            print(f"   - Entities created: {result['total_entities_created']}")
            print(f"   - Relationships created: {result['total_relationships_created']}")
            print("\n🎉 Your Knowledge Graph is now populated!")
            print("   Visit http://localhost:5173/ontology to explore\n")
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)

if __name__ == "__main__":
    asyncio.run(populate_graph())
