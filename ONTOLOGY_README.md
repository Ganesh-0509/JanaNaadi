# JanaNaadi - AI-Powered Global Ontology Engine

## Problem Statement #1: Digital Democracy - Global Intelligence Graph

**JanaNaadi** is now an AI-powered intelligence platform that collects and understands structured data, unstructured content, and live real-time feeds from multiple domains—and connects them into a single, unified, constantly updating knowledge graph for strategic decision-making.

---

## 🎯 What Has Been Built

### 1. **Knowledge Graph Architecture** ✅

**Database Schema** (`knowledge_graph_schema.sql`):
- `entities` table: Stores people, organizations, locations, events, policies, technologies, infrastructure
- `entity_relationships` table: Connects entities (supports, opposes, impacts, causes, etc.)
- `entity_mentions` table: Links entities to specific sentiment entries
- `domain_intelligence` table: Multi-domain intelligence scores
- Auto-incrementing mention counts, timestamps, and triggers

**Entity Types**:
- Person (politicians, officials, public figures)
- Organization (govt departments, companies, NGOs)
- Location (cities, states, projects)
- Event (elections, protests, disasters)
- Policy (laws, schemes, initiatives)
- Technology (innovations, systems)
- Infrastructure (roads, hospitals, bridges)

**Relationship Types**:
- SUPPORTS, OPPOSES, IMPACTS, RELATED_TO, PART_OF, CAUSES, MENTIONED_IN, LOCATED_IN

---

### 2. **Multi-Domain Intelligence System** ✅

**Six Intelligence Domains**:
- **Geopolitics**: International relations, diplomatic events, border issues
- **Economics**: Markets, inflation, GDP, budget policies
- **Defense**: Military operations, security threats, border incidents
- **Climate**: Weather, pollution, disasters, environmental policies
- **Technology**: Tech policy, cybersecurity, innovation
- **Society**: Healthcare, education, infrastructure, public welfare

**Data Sources** (`config/domain_feeds.json`):
- **Defense**: PIB, MOD, Indian Army, economic times defense section (7 RSS feeds)
- **Climate**: The Hindu environment, Down to Earth, NDTV environment (7 RSS feeds)
- **Technology**: PIB tech, ET Tech, NDTV tech (6 RSS feeds)
- **Economics**: ET Markets, Business Line, Mint, Business Standard (6 RSS feeds)
- **Geopolitics**: PIB external affairs, The Hindu world, Indian Express world (6 RSS feeds)

**Domain Ingester** (`app/ingesters/domain_ingester.py`):
- Fetches all 32 domain-specific RSS feeds
- Tags entries with intelligence domain
- Concurrent batch processing (10 feeds at a time)
- HTML tag stripping and entity decoding
- Stable source_id generation for deduplication

---

### 3. **AI Entity Extraction Service** ✅

**Entity Service** (`app/services/entity_service.py`):

**`extract_entities(text)`**:
- Uses Bytez AI (Google Gemini 2.5 Flash)
- Extracts all important entities from text
- Detects entity type, description, aliases, sentiment
- Identifies relationships between entities
- Returns structured JSON

**`store_entities_and_relationships()`**:
- Stores entities in database with deduplication
- Links entities to sentiment entries (entity_mentions)
- Creates/updates relationships with strength scores
- Calculates weighted sentiment scores per entity
- Auto-increments mention counts

**`process_entry_for_entities()`**:
- End-to-end pipeline for processing sentiment entries
- Extract → Store → Link in one function call

---

### 4. **Ontology API Endpoints** ✅

**Router** (`app/routers/ontology.py`):

**Entity Management**:
- `GET /api/ontology/entities` - List entities with filters
  - Filter by type, domain, minimum mentions
  - Ordered by mention count (most important first)
- `GET /api/ontology/entities/{id}` - Get entity details
- `GET /api/ontology/entities/{id}/relationships` - Get entity connections
  - Direction: incoming, outgoing, or both
  - Returns source/target entity info

**Knowledge Graph Stats**:
- `GET /api/ontology/graph/stats` - Graph statistics
  - Total entities and relationships
  - Breakdown by type
  - Top 10 entities by mentions
  - Latest domain intelligence scores

**Domain Intelligence**:
- `GET /api/ontology/domain/intelligence` - Get domain scores
  - Filter by domain, scope (national/state/district)
  - Risk scores, sentiment trends, urgency levels
- `POST /api/ontology/domain/{domain}/compute` - Compute intelligence
  - Analyzes last 24h of domain-tagged entries
  - Calculates risk score from sentiment + urgency
  - Assigns urgency level (low, moderate, high, critical)
  - Stores results in domain_intelligence table

**Entity Extraction**:
- `POST /api/ontology/extract/{entry_id}` - Manually extract entities from entry

---

### 5. **Database Migrations Ready** ✅

**Files to run on Supabase**:
1. `knowledge_graph_schema.sql` - Create all 4 knowledge graph tables
2. `add_domain_field_migration.sql` - Add domain column to sentiment_entries

---

### 6. **Schema Updates** ✅

**Updated Models** (`app/models/`):
- `entity_schemas.py` - New file with Entity, EntityRelationship, DomainIntelligenceScore models
- `schemas.py` - Added `domain` field to SentimentEntryOut and SentimentEntryBrief

---

## 🚀 How to Deploy & Use

### Step 1: Database Setup

Run these SQL scripts in your Supabase SQL editor:

```bash
# 1. Add knowledge graph tables
Run: backend/knowledge_graph_schema.sql

# 2. Add domain field to sentiment_entries
Run: backend/add_domain_field_migration.sql
```

### Step 2: Backend Already Integrated

The backend is already set up with:
- Ontology router registered in `main.py`
- Entity service ready to use
- Domain ingester ready to fetch

### Step 3: Start Ingesting Domain-Specific Data

**Option 1: Via API** (manual trigger):
```bash
POST http://localhost:8000/api/ontology/domain/defense/compute
POST http://localhost:8000/api/ontology/domain/climate/compute
```

**Option 2: Add to Scheduler** (automatic every 4 hours):

Add this to `main.py`:

```python
async def _scheduled_domain_ingestion():
    """Background job: fetch domain-specific intelligence."""
    try:
        from app.ingesters.domain_ingester import DomainIngester
        from app.routers.ingest import _process_and_store, _last_run_info
        from datetime import datetime, timezone
        
        ingester = DomainIngester()
        domain_data = await ingester.fetch_all_domains(max_items_per_feed=15)
        
        total_count = 0
        # Process each domain
        for domain, entries in domain_data.items():
            count = 0
            for entry in entries:
                try:
                    # Store entry with domain tag
                    result = await _process_and_store(
                        entry["text"], "news",
                        location_hint=entry.get("location_hint"),
                        source_id=entry.get("source_id"),
                        source_url=entry.get("source_url"),
                        domain=domain  # IMPORTANT: tag with domain
                    )
                    if result:
                        count += 1
                        total_count += 1
                        
                        # Extract entities from this entry
                        from app.services.entity_service import process_entry_for_entities
                        await process_entry_for_entities(
                            entry_id=result["id"],
                            text=entry["text"],
                            sentiment=result.get("sentiment")
                        )
                except Exception:
                    continue
                await asyncio.sleep(0)
            
            logger.info(f"Domain {domain}: {count} new entries")
        
        _last_run_info["domains"] = {
            "ran_at": datetime.now(timezone.utc).isoformat(),
            "count": total_count
        }
        logger.info(f"Scheduled domain ingestion: {total_count} total entries")
    except Exception as e:
        logger.error(f"Scheduled domain ingestion failed: {e}")

# In lifespan function:
scheduler.add_job(_scheduled_domain_ingestion, "interval", hours=4, id="domain_ingest")
```

### Step 4: Query the Knowledge Graph

**Get Top Entities**:
```bash
GET /api/ontology/entities?min_mentions=5&limit=20
```

**Get Graph Stats**:
```bash
GET /api/ontology/graph/stats
```

**Get Domain Intelligence**:
```bash
GET /api/ontology/domain/intelligence?domain=defense
GET /api/ontology/domain/intelligence?domain=climate&scope=state&scope_id=10
```

**Get Entity Relationships**:
```bash
GET /api/ontology/entities/123/relationships?direction=both
```

---

## 📊 What This Enables

### For Problem Statement #1 - Global Ontology Engine:

✅ **Structured Data**: Database stores entities, relationships, domain scores  
✅ **Unstructured Content**: RSS feeds from 90+ general + 32 domain-specific sources  
✅ **Live Real-Time Feeds**: WebSocket streaming, auto-ingestion every 2-4 hours  
✅ **Multiple Domains**: Geopolitics, Economics, Defense, Climate, Technology, Society  
✅ **Unified Intelligence Graph**: Entities linked via relationships, mentions linked to entries  
✅ **Clear Insights**: Domain risk scores, urgency levels, sentiment trends  
✅ **Strategic Decision-Making**: Top entities, key relationships, pattern detection  
✅ **India-Focused**: All data sources are Indian publications and government feeds  

---

## 🔮 Next Steps for Full PS#1 Completion

### Frontend (In Progress):

1. **Graph Visualization Page** (`/ontology`) - PENDING
   - Interactive D3.js/Cytoscape graph showing entity connections
   - Filter by domain, entity type, relationship type
   - Click entity to see details and connections
   - Zoom, pan, search

2. **Multi-Domain Dashboard** (`/gov` enhancement) - PENDING
   - 6 domain intelligence cards (geopolitics, economics, defense, climate, tech, society)
   - Risk score gauge per domain
   - Trending entities per domain
   - Urgency alerts

3. **Entity Detail Page** (`/entity/{id}`) - PENDING
   - Entity profile: type, description, aliases
   - Mention timeline graph
   - Related entities map
   - Sentiment trend over time
   - All mentioning entries

### Backend Enhancements (Optional):

1. **Historical Analysis** - Track entity sentiment changes over months
2. **Predictive Alerts** - "If X entity sentiment drops, Y event may follow"
3. **Cross-Domain Impact** - "Climate disaster in State A → Economic impact in State B"
4. **Automated Relationship Discovery** - AI finds hidden connections
5. **Policy Simulation** - "If this policy passes, how will these entities react?"

---

## 📁 Files Added/Modified

### New Files Created:
- `backend/app/models/entity_schemas.py`
- `backend/app/services/entity_service.py`
- `backend/app/ingesters/domain_ingester.py`
- `backend/app/routers/ontology.py`
- `backend/config/domain_feeds.json`
- `backend/knowledge_graph_schema.sql`
- `backend/add_domain_field_migration.sql`
- `backend/ONTOLOGY_README.md` (this file)

### Modified Files:
- `backend/app/models/schemas.py` - Added `domain` field
- `backend/app/main.py` - Imported and registered ontology router

---

## 🎓 Technical Stack for Ontology Engine

- **Knowledge Graph**: PostgreSQL with custom entity-relationship schema
- **Entity Extraction**: Bytez AI (Google Gemini 2.5 Flash)  
- **Data Sources**: 90+ general RSS + 32 domain-specific RSS feeds
- **Auto-ingestion**: APScheduler with async processing
- **API**: FastAPI with Pydantic validation
- **Real-time**: WebSocket for live updates
- **Deduplication**: 3-layer (source_id, exact text, near-duplicate)

---

## 🏆 Competitive Advantages

1. **India-First**: All data sources are Indian publications and government feeds
2. **Multi-Domain**: 6 intelligence domains vs competitors' single-domain focus
3. **Entity-Centric**: Track people, organizations, policies over time
4. **Real-Time**: Live updates every 2-4 hours with WebSocket push
5. **AI-Powered**: Automated entity extraction, relationship discovery, sentiment analysis
6. **Scalable**: Built for millions of entries, thousands of entities
7. **Open Source**: Using free-tier LLMs (Bytez) and open databases (Supabase)

---

## 📞 Contact

For questions about the Ontology Engine implementation, check:
- API Docs: http://localhost:8000/docs
- Entity Service: `backend/app/services/entity_service.py`
- Ontology Router: `backend/app/routers/ontology.py`
- Database Schema: `backend/knowledge_graph_schema.sql`

---

**Status**: Backend implementation ✅ COMPLETE | Frontend visualization ⏳ PENDING

**Ready for**: Hackathon demo, investor pitch, government presentation
