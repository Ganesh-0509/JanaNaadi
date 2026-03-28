# PHASE 3: ONTOLOGY & ENTITY RELATIONSHIP RECONSTRUCTION

## Overview
Phase 3 reconstructs the knowledge graph by enabling entity extraction and relationship mapping. This connects individual sentiment entries into a unified ontology showing how civic issues, locations, and stakeholders interact.

## Current State Assessment

### Entity Service Status
- ✅ `extract_entities()` reads from cache (populated by nlp_service)
- ✅ Cache is shared between nlp_service and entity_service
- ✅ Zero additional API calls for entities (cached after initial NLP call)
- ✅ Relationship type normalization working
- ✅ Database schema ready (entity_relationships, entities tables defined)

### Known Constraints
- Supabase connection required for entity storage
- Entity cache currently in-memory (500-entry eviction policy)
- Relationship types normalized (supports, opposes, impacts, etc.)

---

## Phase 3 Implementation Plan

### Step 1: Enable Entity Extraction in Ingestion Pipeline
**File**: `backend/app/routers/ingest.py` (modify `_process_and_store` function)

**Current Flow**:
```
1. Fetch article
2. Dedup check (ingest_guard)
3. NLP analysis (sentiment + topics + entities)
4. Store entry in sentiment_entries
5. Broadcast via WebSocket
6. [MISSING] Store entities and relationships
```

**Required Change**:
```python
async def _process_and_store(entry: dict):
    # ... existing code ...
    
    # After sentiment_entries stored:
    if entry_id:
        await entity_service.process_entry_for_entities(
            text=entry['text'],
            entry_id=entry_id,
            domain='society'  # or derive from topic
        )
```

### Step 2: Populate Entities Table
**File**: `backend/app/services/entity_service.py` (enable `store_entities_and_relationships`)

**Logic**:
1. Extract entities from text (already cached)
2. For each entity, check if exists in `entities` table
3. If new, create record
4. Create `entity_relationships` entries linking entities to entry

**Example**:
```
Text: "Water shortage in Rohini ward affects 50,000 residents"

Entities extracted:
- "Rohini ward" (type: location)
- "water shortage" (type: infrastructure_issue)
- "residents" (type: stakeholder)

Relationships:
- (water shortage) --impacts--> (residents)
- (Rohini ward) --located_in--> (Delhi)
```

### Step 3: Enable Knowledge Graph Queries
**Files to Create**:
- `backend/app/routers/ontology.py` (new endpoints)

**Endpoints**:
```
GET /api/ontology/entities?ward_id=123
GET /api/ontology/relationships?domain=society
GET /api/ontology/graph?source_entity=rohini_ward
GET /api/ontology/summary
```

### Step 4: Wire Frontend to Knowledge Graph
**File**: `frontend/src/pages/KnowledgeGraph.tsx` (update data source)

**Current State**: Uses mock data
**Required Change**: Fetch from `/api/ontology/entities` endpoint

---

## Implementation Priority

### CRITICAL (Unblocks downstream)
1. ✅ Configure entity cache sharing (nlp_service ↔ entity_service)
2. ✅ Entity extraction caching working
3. 🔄 **Enable entity storage in ingestion flow** (NEXT)

### HIGH (Enables visualization)
4. Create ontology API endpoints
5. Wire frontend KnowledgeGraph component
6. Add ward-level entity filtering

### MEDIUM (Performance optimization)
7. Implement entity deduplication (same person/location with typos)
8. Add relationship inference engine (cross-domain edges)
9. Cache frequently accessed graphs

---

## Quick Activation (No Database Required)

For testing without Supabase, verify entity extraction works:

```python
# Test script
from app.services.nlp_service import analyze_text
from app.services.entity_service import extract_entities

text = "The Rohini ward bridge project faces delays costing residents 2 hours daily."

# NLP call (stores result + entities in cache)
result = await analyze_text(text)
print("Sentiment:", result.sentiment)

# Entity extraction (reads from cache, zero API calls)
entities = await extract_entities(text)
print("Entities found:", entities)
```

---

## Files to Modify

### Priority 1: Enable Entity Flow
- `backend/app/routers/ingest.py` - Add entity processing after NLP
- `backend/app/services/entity_service.py` - Add store_entities_and_relationships call (currently commented)

### Priority 2: Create API Layer
- `backend/app/routers/ontology.py` - NEW file with graph endpoints

### Priority 3: Connect Frontend
- `frontend/src/pages/KnowledgeGraph.tsx` - Replace mock data with API calls

### Optional: Inference & Optimization
- `backend/app/services/inference_engine.py` - Relationship inference (already exists)
- `backend/app/services/nlp_service.py` - Add entity dedup logic

---

## Success Criteria

✅ Entity extraction works end-to-end (text → entities → database)
✅ Relationships created and queryable
✅ Frontend displays live entity graph
✅ Knowledge graph updates with each new article
✅ Ward-level entity filtering works

---

## Estimated Implementation Time

- Step 1 (Enable entity flow): 15 min
- Step 2 (Populate entities): 20 min
- Step 3 (Create API): 25 min
- Step 4 (Wire frontend): 20 min
- Testing & verification: 20 min

**Total**: ~100 minutes (can parallelize some steps)
