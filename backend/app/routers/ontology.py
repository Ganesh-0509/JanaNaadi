"""Knowledge Graph & Multi-Domain Intelligence API."""

import logging
import asyncio
from fastapi import APIRouter, Query, Path, HTTPException, Request
from app.core.supabase_client import get_supabase_admin
from app.core.rate_limiter import limiter
from app.models.entity_schemas import (
    Entity, EntityRelationship, KnowledgeGraphStats, 
    DomainIntelligenceScore, IntelligenceDomain
)
from app.services.entity_service import process_entry_for_entities
from app.services.explainability_service import (
    get_relationship_explanation,
    get_entity_explanation
)
from datetime import datetime, timedelta, timezone

logger = logging.getLogger("jananaadi.ontology")
router = APIRouter(prefix="/api/ontology", tags=["ontology"])


@router.get("/entities", response_model=list[Entity])
async def get_entities(
    entity_type: str | None = Query(None, description="Filter by type"),
    domain: str | None = Query(None, description="Filter by intelligence domain"),
    min_mentions: int = Query(0, description="Minimum mention count"),
    limit: int = Query(50, le=200),
):
    """Get entities from knowledge graph."""
    sb = get_supabase_admin()
    
    query = sb.table("entities").select("*")
    
    if entity_type:
        query = query.eq("entity_type", entity_type)
    
    if min_mentions > 0:
        query = query.gte("mention_count", min_mentions)
    
    query = query.order("mention_count", desc=True).limit(limit)
    
    result = query.execute()
    return result.data


@router.get("/entities/{entity_id}", response_model=Entity)
async def get_entity(entity_id: int):
    """Get a specific entity with full details."""
    sb = get_supabase_admin()
    
    result = sb.table("entities").select("*").eq("id", entity_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    return result.data[0]


@router.get("/entities/{entity_id}/relationships")
async def get_entity_relationships(entity_id: int, direction: str = Query("both")):
    """Get relationships for an entity.
    
    Args:
        direction: 'outgoing', 'incoming', or 'both'
    """
    import time
    from httpx import ReadError, ConnectError, TimeoutException
    
    relationships = []
    
    # Retry logic with exponential backoff
    for attempt in range(3):
        try:
            sb = get_supabase_admin()
            
            if direction in ["outgoing", "both"]:
                outgoing = sb.table("entity_relationships")\
                    .select("*, source:source_entity_id(name, entity_type), target:target_entity_id(name, entity_type)")\
                    .eq("source_entity_id", entity_id)\
                    .execute()
                relationships.extend(outgoing.data or [])
            
            if direction in ["incoming", "both"]:
                incoming = sb.table("entity_relationships")\
                    .select("*, source:source_entity_id(name, entity_type), target:target_entity_id(name, entity_type)")\
                    .eq("target_entity_id", entity_id)\
                    .execute()
                relationships.extend(incoming.data or [])
            
            return relationships
            
        except (ReadError, ConnectError, TimeoutException, ConnectionError) as e:
            if attempt < 2:  # Don't sleep on last attempt
                await asyncio.sleep(0.5 * (attempt + 1))  # 0.5s, 1s
                continue
            # On final failure, return empty list instead of crashing
            logger.warning(f"Failed to fetch relationships for entity {entity_id} after 3 attempts: {e}")
            return []
        except Exception as e:
            # For other errors, return empty list to prevent crashes
            logger.error(f"Unexpected error fetching relationships for entity {entity_id}: {e}")
            return []
    
    return relationships

@router.get("/graph/stats", response_model=KnowledgeGraphStats)
async def get_graph_stats():
    """Get knowledge graph statistics."""
    sb = get_supabase_admin()
    
    # Count entities
    entities_count = sb.table("entities").select("*", count="exact").execute()
    total_entities = entities_count.count or 0
    
    # Count relationships
    rels_count = sb.table("entity_relationships").select("*", count="exact").execute()
    total_relationships = rels_count.count or 0
    
    # Count mentions
    mentions_count = sb.table("entity_mentions").select("*", count="exact").execute()
    total_mentions = mentions_count.count or 0
    
    # Entities by type - simple query instead of RPC
    entities_by_type = {}
    all_entities = sb.table("entities").select("entity_type").execute()
    if all_entities.data:
        for entity in all_entities.data:
            entity_type = entity.get("entity_type", "other")
            entities_by_type[entity_type] = entities_by_type.get(entity_type, 0) + 1
    
    # Relationship types - count by relationship_type
    relationship_types = {}
    all_rels = sb.table("entity_relationships").select("relationship_type").execute()
    if all_rels.data:
        for rel in all_rels.data:
            rel_type = rel.get("relationship_type", "other")
            relationship_types[rel_type] = relationship_types.get(rel_type, 0) + 1
    
    # Top entities
    top_entities_result = sb.table("entities")\
        .select("name, entity_type, mention_count, sentiment_score")\
        .order("mention_count", desc=True)\
        .limit(10)\
        .execute()
    
    top_entities = [
        {
            "name": e["name"],
            "type": e["entity_type"],
            "mention_count": e["mention_count"],
            "sentiment": e.get("sentiment_score", 0)
        }
        for e in top_entities_result.data
    ]
    
    return {
        "total_entities": total_entities,
        "total_relationships": total_relationships,
        "total_mentions": total_mentions,
        "entities_by_type": entities_by_type,
        "relationship_types": relationship_types,
        "top_entities": top_entities
    }


@router.get("/domain/intelligence", response_model=list[DomainIntelligenceScore])
async def get_domain_intelligence(
    domain: str | None = Query(None),
    scope: str = Query("national"),
    scope_id: int | None = Query(None),
):
    """Get multi-domain intelligence scores.
    
    Domains: geopolitics, economics, defense, climate, technology, society
    """
    sb = get_supabase_admin()
    
    query = sb.table("domain_intelligence").select("*").eq("scope", scope)
    
    if domain:
        query = query.eq("domain", domain)
    
    if scope_id:
        query = query.eq("scope_id", scope_id)
    
    query = query.order("computed_at", desc=True).limit(20)
    
    result = query.execute()
    return result.data


@router.post("/domain/{domain}/compute")
async def compute_domain_intelligence(
    domain: str,
    scope: str = "national",
    scope_id: int | None = None
):
    """Compute intelligence score for a specific domain.
    
    This analyzes recent sentiment entries tagged with the domain
    and calculates risk scores, sentiment trends, and key factors.
    """
    if domain not in [IntelligenceDomain.GEOPOLITICS, IntelligenceDomain.ECONOMICS,
                      IntelligenceDomain.DEFENSE, IntelligenceDomain.CLIMATE,
                      IntelligenceDomain.TECHNOLOGY, IntelligenceDomain.SOCIETY]:
        raise HTTPException(status_code=400, detail=f"Invalid domain: {domain}")
    
    sb = get_supabase_admin()
    
    # Analyze last 24 hours of data for this domain
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    
    query = sb.table("sentiment_entries")\
        .select("sentiment, sentiment_score, urgency_score, cleaned_text, primary_topic_id")\
        .eq("domain", domain)\
        .gte("ingested_at", cutoff)
    
    if scope == "state" and scope_id:
        query = query.eq("state_id", scope_id)
    elif scope == "district" and scope_id:
        query = query.eq("district_id", scope_id)
    
    entries = query.execute()
    
    if not entries.data:
        return {"message": f"No data for domain {domain}", "count": 0}
    
    # Calculate metrics
    total = len(entries.data)
    avg_sentiment = sum(e["sentiment_score"] for e in entries.data) / total
    avg_urgency = sum(e.get("urgency_score", 0) for e in entries.data) / total
    
    negative_count = sum(1 for e in entries.data if e["sentiment"] == "negative")
    negative_ratio = negative_count / total
    
    # Risk score: combination of negative sentiment and urgency
    risk_score = min((negative_ratio * 0.6 + avg_urgency * 0.4), 1.0)
    
    # Urgency level
    if risk_score >= 0.7:
        urgency_level = "critical"
    elif risk_score >= 0.4:
        urgency_level = "high"
    elif risk_score >= 0.2:
        urgency_level = "moderate"
    else:
        urgency_level = "low"
    
    # Key factors - extract common topics and entities mentioned
    topic_counts = {}
    entity_mentions_local = {}
    
    for entry in entries.data:
        # Count topics
        topic = entry.get("primary_topic_id")
        if topic:
            topic_counts[topic] = topic_counts.get(topic, 0) + 1
        
        # Extract entities from cleaned text (simple keyword matching)
        text = entry.get("cleaned_text", "").lower()
        # This is a simple approach - just get top topic mentions
        # In production, you'd use entity extraction service
    
    # Build key_factors from top topics
    sorted_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)
    key_factors = [{"topic_id": t[0], "mentions": t[1]} for t in sorted_topics[:5]]
    
    # Store the score
    score_data = {
        "domain": domain,
        "scope": scope,
        "scope_id": scope_id,
        "risk_score": risk_score,
        "sentiment_trend": avg_sentiment,
        "urgency_level": urgency_level,
        "key_factors": key_factors,
        "entity_ids": [],
        "metadata": {
            "entries_analyzed": total,
            "negative_ratio": negative_ratio,
            "avg_sentiment": avg_sentiment,
            "avg_urgency": avg_urgency
        },
        "computed_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = sb.table("domain_intelligence").insert(score_data).execute()
    
    return {
        "domain": domain,
        "risk_score": risk_score,
        "urgency_level": urgency_level,
        "entries_analyzed": total,
        "stored_id": result.data[0]["id"] if result.data else None
    }


@router.post("/extract/{entry_id}")
@limiter.limit("20/minute")  # Rate limit: single entry extraction
async def extract_entities_from_entry(request: Request, entry_id: str):
    """Manually trigger entity extraction for a specific sentiment entry.
    
    Rate limited to 20 requests/minute to prevent API quota exhaustion.
    """
    sb = get_supabase_admin()
    
    # Get the entry
    entry = sb.table("sentiment_entries").select("id, cleaned_text, sentiment").eq("id", entry_id).execute()
    
    if not entry.data:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    entry_data = entry.data[0]
    
    # Extract entities
    text_to_use = entry["original_text"] if len(entry.get("cleaned_text", "")) < 100 else entry["cleaned_text"]
    result = await process_entry_for_entities(
        entry_id=entry["id"],
        text=text_to_use,
        sentiment=entry.get("sentiment"),
        domain=entry.get("domain")
    )
    
    return result


@router.post("/extract-batch")
@limiter.limit("10/minute")  # Rate limit: prevents spam, saves API costs
async def extract_entities_batch(
    request: Request,
    limit: int = Query(25, le=100, description="Number of entries to process"),
    domain: str | None = Query(None, description="Filter by domain"),
):
    """Extract entities from recent sentiment entries in batch.
    
    This populates the knowledge graph by processing recent entries.
    Useful for initial setup or catching up on unprocessed data.
    
    Note: Reduced limits (25-100) to prevent connection issues.
    Rate limited to 10 requests/minute to prevent API quota exhaustion.
    """
    sb = get_supabase_admin()
    
    # Get recent entries
    query = sb.table("sentiment_entries")\
        .select("id, original_text, cleaned_text, sentiment, domain")\
        .order("ingested_at", desc=True)\
        .limit(limit)
    
    if domain:
        query = query.eq("domain", domain)
    
    entries = query.execute()
    
    if not entries.data:
        return {"message": "No entries found", "processed": 0}
    
    logger.info(f"Processing {len(entries.data)} entries for entity extraction")
    
    processed = 0
    total_entities = 0
    total_relationships = 0
    errors = 0
    
    # MAX API calls per batch run - change this number to control spend
    MAX_API_CALLS_PER_BATCH = 10  # only 10 Bytez calls per batch request

    api_calls_made = 0

    for i, entry in enumerate(entries.data):
        # Stop if we hit the call limit
        if api_calls_made >= MAX_API_CALLS_PER_BATCH:
            logger.info(f"Hit API call limit ({MAX_API_CALLS_PER_BATCH}), stopping batch")
            break

        try:
            existing_mentions = sb.table("entity_mentions")\
                .select("id")\
                .eq("entry_id", entry["id"])\
                .limit(1)\
                .execute()
            
            if existing_mentions.data:
                logger.debug(f"Entry {entry['id']} already processed, skipping")
                continue

            # Use original_text if cleaned_text is too short
            text_to_use = (
                entry.get("original_text") 
                if len(entry.get("cleaned_text", "")) < 50 
                else entry["cleaned_text"]
            )

            # Skip if still too short after fallback
            if not text_to_use or len(text_to_use.strip()) < 30:
                continue

            result = await process_entry_for_entities(
                entry_id=entry["id"],
                text=text_to_use,
                sentiment=entry.get("sentiment"),
                domain=entry.get("domain")   # ← domain fix also here
            )

            api_calls_made += 1  # count the call
            
        except Exception as e:
            logger.error(f"Failed to process entry {entry['id']}: {e}")
            errors += 1
            continue
    
    return {
        "message": f"Batch extraction complete",
        "entries_processed": processed,
        "entries_skipped": len(entries.data) - processed - errors,
        "errors": errors,
        "total_entities_created": total_entities,
        "total_relationships_created": total_relationships
    }

@router.get("/cross-domain-connections")
async def get_cross_domain_connections(
    domain_a: str | None = Query(None, description="Filter by first domain e.g. defense"),
    domain_b: str | None = Query(None, description="Filter by second domain e.g. economics"),
    min_strength: float = Query(0.0, description="Minimum edge strength 0.0-1.0"),
    limit: int = Query(50, le=200),
):
    """Get cross-domain relationship edges between entities from different domains.
 
    These edges show how entities in one intelligence domain (e.g. defense)
    are connected to entities in another domain (e.g. economics) — forming
    the unified cross-domain intelligence graph.
 
    Example: 'Indian Army' (defense) ↔ 'GDP Growth' (economics)
    """
    sb = get_supabase_admin()
 
    # Fetch cross_domain_impact edges with entity details
    query = (
        sb.table("entity_relationships")
        .select(
            "id, strength, context, created_at, "
            "source:source_entity_id(id, name, entity_type), "
            "target:target_entity_id(id, name, entity_type), "
            "metadata"
        )
        .eq("relationship_type", "cross_domain_impact")
        .gte("strength", min_strength)
        .order("strength", desc=True)
        .limit(limit)
    )
 
    result = query.execute()
 
    if not result.data:
        return {"connections": [], "total": 0}
 
    # Format response and apply optional domain filters
    connections = []
    for row in result.data:
        source = row.get("source") or {}
        target = row.get("target") or {}
        metadata = row.get("metadata") or {}
 
        d_a = metadata.get("domain_a", "unknown")
        d_b = metadata.get("domain_b", "unknown")
 
        # Apply domain filters if provided
        if domain_a and domain_a not in (d_a, d_b):
            continue
        if domain_b and domain_b not in (d_a, d_b):
            continue
 
        connections.append({
            "id": row["id"],
            "entity_a": {
                "id": source.get("id"),
                "name": source.get("name", "Unknown"),
                "type": source.get("entity_type", "other"),
                "domain": d_a,
            },
            "entity_b": {
                "id": target.get("id"),
                "name": target.get("name", "Unknown"),
                "type": target.get("entity_type", "other"),
                "domain": d_b,
            },
            "strength": round(row.get("strength", 0.3), 2),
            "context": row.get("context", ""),
            "created_at": row.get("created_at"),
        })
 
    return {
        "connections": connections,
        "total": len(connections),
        "domains_present": list({c["entity_a"]["domain"] for c in connections}
                                | {c["entity_b"]["domain"] for c in connections}),
    }
 
 
@router.get("/cross-domain-summary")
async def get_cross_domain_summary():
    """Get a summary of how many cross-domain connections exist between each domain pair.
 
    Useful for the dashboard to show which domains are most interconnected.
    Returns pairs like: defense↔economics: 12 connections
    """
    sb = get_supabase_admin()
 
    result = (
        sb.table("entity_relationships")
        .select("metadata, strength")
        .eq("relationship_type", "cross_domain_impact")
        .execute()
    )
 
    if not result.data:
        return {"domain_pairs": [], "total_cross_domain_edges": 0}
 
    # Count connections per domain pair
    pair_counts: dict[str, dict] = {}
    pair_strength: dict[str, list] = {}
 
    for row in result.data:
        metadata = row.get("metadata") or {}
        d_a = metadata.get("domain_a", "unknown")
        d_b = metadata.get("domain_b", "unknown")
 
        # Normalise pair order so defense↔economics == economics↔defense
        pair_key = "↔".join(sorted([d_a, d_b]))
 
        if pair_key not in pair_counts:
            pair_counts[pair_key] = {"domain_a": d_a, "domain_b": d_b, "count": 0}
            pair_strength[pair_key] = []
 
        pair_counts[pair_key]["count"] += 1
        pair_strength[pair_key].append(row.get("strength", 0.3))
 
    domain_pairs = []
    for pair_key, info in pair_counts.items():
        strengths = pair_strength[pair_key]
        domain_pairs.append({
            "pair": pair_key,
            "domain_a": info["domain_a"],
            "domain_b": info["domain_b"],
            "connection_count": info["count"],
            "avg_strength": round(sum(strengths) / len(strengths), 2),
        })
 
    # Sort by connection count descending
    domain_pairs.sort(key=lambda x: x["connection_count"], reverse=True)
 
    return {
        "domain_pairs": domain_pairs,
        "total_cross_domain_edges": sum(p["connection_count"] for p in domain_pairs),
    }
 
# -- EXPLAINABILITY ENGINE ENDPOINTS --------------------------------

@router.get("/explain")
@limiter.limit("30/minute")
async def explain_relationship(
    request: Request,
    entity_a: str = Query(..., description="First entity name"),
    entity_b: str = Query(..., description="Second entity name")
):
    """
    Get full explainable explanation for relationship between two entities.
    
    Returns:
    - Direct relationship with evidence (if found)
    - Multi-hop reasoning chain (if direct not found)
    - Confidence scores
    - Evidence entries with sources
    
    Example:
        GET /api/ontology/explain?entity_a=Flooding&entity_b=Economy
    """
    explanation = await get_relationship_explanation(entity_a, entity_b)
    return explanation


@router.get("/entity-profile/{entity_name}")
@limiter.limit("30/minute")
async def get_entity_profile(
    request: Request,
    entity_name: str = Path(..., description="Entity name")
):
    """
    Get comprehensive profile for a single entity.
    
    Returns:
    - Entity details (type, description, sentiment, mentions)
    - All incoming relationships
    - All outgoing relationships
    - Domain classification
    - First seen / last seen dates
    """
    explanation = await get_entity_explanation(entity_name)
    return explanation
