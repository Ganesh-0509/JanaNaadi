"""Knowledge Graph & Multi-Domain Intelligence API."""

import logging
from fastapi import APIRouter, Query, HTTPException
from app.core.supabase_client import get_supabase_admin
from app.models.entity_schemas import (
    Entity, EntityRelationship, KnowledgeGraphStats, 
    DomainIntelligenceScore, IntelligenceDomain
)
from app.services.entity_service import process_entry_for_entities
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
    sb = get_supabase_admin()
    
    relationships = []
    
    if direction in ["outgoing", "both"]:
        outgoing = sb.table("entity_relationships")\
            .select("*, source:source_entity_id(name, entity_type), target:target_entity_id(name, entity_type)")\
            .eq("source_entity_id", entity_id)\
            .execute()
        relationships.extend(outgoing.data)
    
    if direction in ["incoming", "both"]:
        incoming = sb.table("entity_relationships")\
            .select("*, source:source_entity_id(name, entity_type), target:target_entity_id(name, entity_type)")\
            .eq("target_entity_id", entity_id)\
            .execute()
        relationships.extend(incoming.data)
    
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
    
    # Entities by type
    entities_by_type = {}
    types_result = sb.rpc("count_entities_by_type").execute()
    if types_result.data:
        for row in types_result.data:
            entities_by_type[row["entity_type"]] = row["count"]
    
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
    
    # Latest domain scores
    domain_scores_result = sb.table("domain_intelligence")\
        .select("*")\
        .order("computed_at", desc=True)\
        .limit(6)\
        .execute()
    
    return {
        "total_entities": total_entities,
        "total_relationships": total_relationships,
        "entities_by_type": entities_by_type,
        "relationships_by_type": {},  # TODO: implement
        "top_entities": top_entities,
        "domain_scores": domain_scores_result.data
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
    
    # Key factors (extract common keywords/topics)
    # TODO: Improve with more sophisticated analysis
    key_factors = []
    
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
async def extract_entities_from_entry(entry_id: int):
    """Manually trigger entity extraction for a specific sentiment entry."""
    sb = get_supabase_admin()
    
    # Get the entry
    entry = sb.table("sentiment_entries").select("id, cleaned_text, sentiment").eq("id", entry_id).execute()
    
    if not entry.data:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    entry_data = entry.data[0]
    
    # Extract entities
    result = await process_entry_for_entities(
        entry_id=entry_data["id"],
        text=entry_data["cleaned_text"],
        sentiment=entry_data.get("sentiment")
    )
    
    return result
