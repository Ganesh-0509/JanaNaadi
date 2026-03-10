# JanaNaadi - Quick Start Guide for Global Ontology Engine (PS#1)

## 🚀 Quick Setup (5 Minutes)

### Step 1: Run Database Migrations

Open your Supabase SQL Editor and run these two scripts:

**Script 1: Knowledge Graph Tables**
```sql
-- Copy and paste the entire content from:
backend/knowledge_graph_schema.sql
```

**Script 2: Add Domain Field**
```sql
-- Copy and paste the entire content from:
backend/add_domain_field_migration.sql
```

### Step 2: Restart Backend

The backend already has all the code integrated. Just restart:

```bash
cd backend
uvicorn app.main:app --reload
```

✅ Check: Visit http://localhost:8000/docs - you should see new `/api/ontology/*` endpoints

---

## 📖 Using the Ontology Engine

### 1⃣ Ingest Domain-Specific Intelligence

**Option A: Test with Sample Entry**

```bash
curl -X POST http://localhost:8000/api/ingest/manual \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Defense Minister announces new border security initiative in Kashmir. Indian Army deploys advanced surveillance technology along LOC.",
    "source": "manual",
    "domain": "defense"
  }'
```

**Option B: Fetch Real Domain Data with Python Script**

Create `test_domain_ingest.py`:

```python
import asyncio
from app.ingesters.domain_ingester import DomainIngester
from app.routers.ingest import _process_and_store
from app.services.entity_service import process_entry_for_entities

async def test_domain_ingestion():
    ingester = DomainIngester()
    
    # Fetch defense news
    defense_entries = await ingester.fetch_domain("defense", max_items=10)
    
    print(f"Fetched {len(defense_entries)} defense entries")
    
    for entry in defense_entries:
        # Store in database
        result = await _process_and_store(
            text=entry["text"],
            source="news",
            source_id=entry.get("source_id"),
            source_url=entry.get("source_url"),
            location_hint=entry.get("location_hint"),
            domain="defense"  # Tag with domain
        )
        
        if result:
            print(f"✅ Stored entry: {result['id']}")
            
            # Extract entities
            entity_result = await process_entry_for_entities(
                entry_id=result["id"],
                text=entry["text"],
                sentiment=result.get("sentiment")
            )
            
            print(f"   └── Entities: {entity_result}")

if __name__ == "__main__":
    asyncio.run(test_domain_ingestion())
```

Run:
```bash
cd backend
python test_domain_ingest.py
```

---

### 2⃣ Query the Knowledge Graph

**Get Top Entities:**

```bash
# Get top 20 most-mentioned entities
curl http://localhost:8000/api/ontology/entities?min_mentions=1&limit=20

# Get only people
curl http://localhost:8000/api/ontology/entities?entity_type=person&limit=10

# Get climate-related entities
curl http://localhost:8000/api/ontology/entities?domain=climate&limit=10
```

**Get Entity Details:**

```bash
# Get entity with ID 123
curl http://localhost:8000/api/ontology/entities/123

# Get all relationships for entity 123
curl http://localhost:8000/api/ontology/entities/123/relationships?direction=both
```

**Get Knowledge Graph Stats:**

```bash
curl http://localhost:8000/api/ontology/graph/stats
```

Response:
```json
{
  "total_entities": 1547,
  "total_relationships": 892,
  "entities_by_type": {
    "person": 234,
    "organization": 156,
    "location": 89,
    "policy": 67
  },
  "top_entities": [
    {
      "name": "Narendra Modi",
      "type": "person",
      "mention_count": 245,
      "sentiment": 0.12
    }
  ],
  "domain_scores": [...]
}
```

---

### 3⃣ Compute Domain Intelligence

**Analyze Defense Domain:**

```bash
curl -X POST http://localhost:8000/api/ontology/domain/defense/compute
```

Response:
```json
{
  "domain": "defense",
  "risk_score": 0.35,
  "urgency_level": "moderate",
  "entries_analyzed": 145,
  "stored_id": 789
}
```

**Get All Domain Scores:**

```bash
# National level
curl http://localhost:8000/api/ontology/domain/intelligence

# Defense only
curl http://localhost:8000/api/ontology/domain/intelligence?domain=defense

# Climate for specific state
curl http://localhost:8000/api/ontology/domain/intelligence?domain=climate&scope=state&scope_id=10
```

---

### 4⃣ Extract Entities from Existing Entries

If you already have sentiment entries in the database:

```bash
# Extract entities from entry ID 456
curl -X POST http://localhost:8000/api/ontology/extract/456
```

Response:
```json
{
  "entities_stored": 3,
  "mentions_stored": 3,
  "relationships_stored": 2
}
```

---

## 🔄 Automatic Domain Ingestion (Production Setup)

Add this scheduler job to `backend/app/main.py`:

```python
async def _scheduled_domain_ingestion():
    """Background job: fetch domain-specific intelligence."""
    try:
        from app.ingesters.domain_ingester import DomainIngester
        from app.routers.ingest import _process_and_store, _last_run_info
        from app.services.entity_service import process_entry_for_entities
        from datetime import datetime, timezone
        
        ingester = DomainIngester()
        domain_data = await ingester.fetch_all_domains(max_items_per_feed=15)
        
        total_count = 0
        entities_extracted = 0
        
        # Process each domain
        for domain, entries in domain_data.items():
            count = 0
            for entry in entries:
                try:
                    result = await _process_and_store(
                        entry["text"], "news",
                        location_hint=entry.get("location_hint"),
                        source_id=entry.get("source_id"),
                        source_url=entry.get("source_url"),
                        domain=domain
                    )
                    if result:
                        count += 1
                        total_count += 1
                        
                        # Extract entities
                        entity_result = await process_entry_for_entities(
                            entry_id=result["id"],
                            text=entry["text"],
                            sentiment=result.get("sentiment")
                        )
                        if entity_result:
                            entities_extracted += entity_result.get("entities_stored", 0)
                except Exception:
                    continue
                await asyncio.sleep(0)
            
            logger.info(f"Domain {domain}: {count} new entries")
        
        _last_run_info["domains"] = {
            "ran_at": datetime.now(timezone.utc).isoformat(),
            "count": total_count,
            "entities": entities_extracted
        }
        logger.info(f"Domain ingestion: {total_count} entries, {entities_extracted} entities")
    except Exception as e:
        logger.error(f"Domain ingestion failed: {e}")
```

Then in the `lifespan()` function add:

```python
# Domain ingestion: every 4 hours
scheduler.add_job(_scheduled_domain_ingestion, "interval", hours=4, id="domain_ingest")
# Run once at startup
asyncio.create_task(_scheduled_domain_ingestion())
```

---

## 📊 Example Use Cases

### Use Case 1: Track Defense Sentiment Over Time

```python
# 1. Compute defense intelligence for last 7 days
for day in range(7):
    cutoff = datetime.now() - timedelta(days=day)
    # Filter entries by date and compute
    
# 2. Query defense entities
entities = GET /api/ontology/entities?domain=defense

# 3. Track specific entity (e.g., "Indian Army")
entity_id = 123
relationships = GET /api/ontology/entities/123/relationships

# Result: See who/what supports/opposes Indian Army, sentiment trends
```

### Use Case 2: Climate Crisis Monitoring

```python
# 1. Ingest climate data
climate_entries = await ingester.fetch_domain("climate", max_items=50)

# 2. Compute climate risk score
POST /api/ontology/domain/climate/compute

# 3. Get top climate entities
GET /api/ontology/entities?domain=climate&min_mentions=10

# Result: Identify pollution hotspots, disaster-prone areas, policy impacts
```

### Use Case 3: Cross-Domain Impact Analysis

```python
# 1. Get economics entities
econ_entities = GET /api/ontology/entities?domain=economics

# 2. For each entity, get relationships
relationships = GET /api/ontology/entities/{id}/relationships

# 3. Find cross-domain connections
# Example: "Oil Price" (economics) → "impacts" → "Pollution" (climate)

# Result: Understand how economic events affect other domains
```

---

## 🎯 Next Steps

### For Hackathon/Demo:

1. **Run domain ingestion** to populate knowledge graph
2. **Test API endpoints** with Postman/curl
3. **Show graph stats** - total entities, relationships
4. **Demo entity extraction** - from sample news article
5. **Show domain intelligence** - risk scores for each domain

### For Production:

1. **Enable automatic domain ingestion** (scheduler every 4 hours)
2. **Build frontend graph visualization** (D3.js/Cytoscape)
3. **Add entity detail pages** on frontend
4. **Create multi-domain dashboard** with risk gauges
5. **Set up alerts** for high-risk domain scores

---

## 🐛 Troubleshooting

**Issue: "cannot import name 'call_bytez_model'"**
- ✅ **Fixed**: Updated `bytez_service.py` with the function

**Issue: No entities being extracted**
- Check: Did you run the database migrations?
- Check: Is Bytez API key set in `.env`?
- Check: Are you calling `process_entry_for_entities()` after storing entry?

**Issue: Domain field is NULL**
- Check: Did you run `add_domain_field_migration.sql`?
- Check: Are you passing `domain=` parameter to `_process_and_store()`?

**Issue: Graph stats showing 0 entities**
- Check: Did you run any ingestion yet?
- Try: Run `test_domain_ingest.py` to populate some data

---

## 📚 Documentation

- **Full Ontology README**: `ONTOLOGY_README.md`
- **API Docs**: http://localhost:8000/docs
- **Database Schema**: `backend/knowledge_graph_schema.sql`
- **Entity Service**: `backend/app/services/entity_service.py`
- **Domain Ingester**: `backend/app/ingesters/domain_ingester.py`
- **Ontology API**: `backend/app/routers/ontology.py`

---

**You're now ready to demo JanaNaadi as a Global Ontology Engine! 🚀**
