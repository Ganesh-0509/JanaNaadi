"""Check if entities exist in the knowledge graph."""

from app.core.supabase_client import get_supabase_admin

sb = get_supabase_admin()

# Count entities
entities_result = sb.table("entities").select("*", count="exact").execute()
print(f"\n✨ Knowledge Graph Status:")
print(f"   Total entities: {entities_result.count}")

if entities_result.count > 0:
    # Show top entities
    top = sb.table("entities")\
        .select("name, entity_type, mention_count")\
        .order("mention_count", desc=True)\
        .limit(10)\
        .execute()
    
    print(f"\n📊 Top Entities:")
    for e in top.data:
        print(f"   - {e['name']} ({e['entity_type']}) - {e['mention_count']} mentions")
    
    # Count relationships
    rels = sb.table("entity_relationships").select("*", count="exact").execute()
    print(f"\n🔗 Total relationships: {rels.count}")
    
    print("\n✅ Your Knowledge Graph has data! Reload http://localhost:5173/ontology\n")
else:
    print("\n⏳ No entities yet. Extraction may still be running...\n")
