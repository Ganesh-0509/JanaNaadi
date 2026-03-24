"""Explainability Engine - Makes every relationship and insight traceable and transparent.

Provides human-readable explanations with evidence linking for all entity relationships,
including direct connections and multi-hop reasoning chains.
"""

import logging
import asyncio
from typing import Optional, Dict, List, Any
from datetime import datetime
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger("jananaadi.explainability")


async def get_entities_by_names(entity_a_name: str, entity_b_name: str) -> tuple[Optional[str], Optional[str]]:
    """Fetch entity IDs by name from database."""
    sb = get_supabase_admin()
    
    try:
        entities = await asyncio.gather(
            asyncio.to_thread(
                lambda: sb.table("entities")
                .select("id")
                .eq("name", entity_a_name)
                .limit(1)
                .execute()
            ),
            asyncio.to_thread(
                lambda: sb.table("entities")
                .select("id")
                .eq("name", entity_b_name)
                .limit(1)
                .execute()
            )
        )
        
        id_a = entities[0].data[0]["id"] if entities[0].data else None
        id_b = entities[1].data[0]["id"] if entities[1].data else None
        
        return id_a, id_b
    except Exception as e:
        logger.warning(f"Failed to fetch entities: {e}")
        return None, None


async def get_direct_relationship(entity_id_a: str, entity_id_b: str) -> Optional[Dict[str, Any]]:
    """
    Fetch direct relationship between two entities.
    
    Returns: relationship object with all fields or None
    """
    sb = get_supabase_admin()
    
    try:
        result = await asyncio.to_thread(
            lambda: sb.table("entity_relationships")
            .select("*")
            .eq("source_entity_id", entity_id_a)
            .eq("target_entity_id", entity_id_b)
            .limit(1)
            .execute()
        )
        
        return result.data[0] if result.data else None
    except Exception as e:
        logger.warning(f"Failed to fetch direct relationship: {e}")
        return None


async def get_evidence_entries(evidence_entry_ids: List[str], limit: int = 5) -> List[Dict[str, Any]]:
    """
    Fetch evidence entries from sentiment_entries table.
    
    Args:
        evidence_entry_ids: List of entry IDs
        limit: Max entries to return (top 5 by default)
    
    Returns: List of evidence dicts with text, source, sentiment, date
    """
    if not evidence_entry_ids:
        return []
    
    sb = get_supabase_admin()
    
    try:
        # Fetch up to 'limit' entries, ordered by most recent
        result = await asyncio.to_thread(
            lambda: sb.table("sentiment_entries")
            .select("id, text, source, sentiment, published_at")
            .in_("id", evidence_entry_ids[:10])  # Fetch more than needed
            .order("published_at", desc=True)
            .limit(limit)
            .execute()
        )
        
        # Transform to explainability format
        evidence = []
        for entry in result.data:
            evidence.append({
                "id": entry.get("id"),
                "text": entry.get("text", "")[:200],  # Truncate to 200 chars
                "source": entry.get("source", "unknown"),
                "sentiment": entry.get("sentiment", "neutral"),
                "date": entry.get("published_at", "unknown")
            })
        
        return evidence
    except Exception as e:
        logger.warning(f"Failed to fetch evidence entries: {e}")
        return []


async def find_multi_hop_path(
    entity_id_a: str,
    entity_id_b: str,
    max_depth: int = 2
) -> Optional[List[Dict[str, Any]]]:
    """
    Find multi-hop reasoning path from A to B via intermediate entities.
    
    Returns: List of edges in the path, or None if no path found
    
    Example:
        A → B → C becomes [edge_A_B, edge_B_C]
    """
    sb = get_supabase_admin()
    
    if max_depth != 2:
        return None  # Only support 2-hop for now
    
    try:
        # Find all edges from A
        edges_from_a = await asyncio.to_thread(
            lambda: sb.table("entity_relationships")
            .select("*")
            .eq("source_entity_id", entity_id_a)
            .limit(100)
            .execute()
        )
        
        if not edges_from_a.data:
            return None
        
        # For each intermediate entity B, check if B → C exists
        for edge_ab in edges_from_a.data:
            mid_entity = edge_ab.get("target_entity_id")
            
            edge_bc = await asyncio.to_thread(
                lambda: sb.table("entity_relationships")
                .select("*")
                .eq("source_entity_id", mid_entity)
                .eq("target_entity_id", entity_id_b)
                .limit(1)
                .execute()
            )
            
            if edge_bc.data:
                # Found path A → B → C
                return [edge_ab, edge_bc.data[0]]
        
        return None
    
    except Exception as e:
        logger.warning(f"Failed to find multi-hop path: {e}")
        return None


async def get_relationship_explanation(
    entity_a_name: str,
    entity_b_name: str
) -> Dict[str, Any]:
    """
    Get full explainable explanation for relationship between two entities.
    
    Tries direct relationship first, then multi-hop reasoning.
    
    Returns:
    {
        "found": bool,
        "insight": str,
        "confidence": float,
        "relationship_type": str,
        "chain_depth": int,
        "inferred": bool,
        "evidence": [{"text": ..., "source": ..., "sentiment": ..., "date": ...}],
        "reasoning": str,
        "reasoning_chain": [{"entity": ..., "type": ...}]  # For multi-hop
    }
    """
    
    # Step 1: Resolve entity names to IDs
    entity_id_a, entity_id_b = await get_entities_by_names(entity_a_name, entity_b_name)
    
    if not entity_id_a or not entity_id_b:
        return {
            "found": False,
            "error": f"Could not find entities: {entity_a_name} or {entity_b_name}"
        }
    
    # Step 2: Try direct relationship
    direct_rel = await get_direct_relationship(entity_id_a, entity_id_b)
    
    if direct_rel:
        # Found direct relationship
        evidence_ids = direct_rel.get("evidence_entry_ids", [])
        evidence = await get_evidence_entries(evidence_ids)
        
        confidence = direct_rel.get("confidence", 0.5)
        if confidence is None:
            confidence = direct_rel.get("strength", 0.5)
        
        return {
            "found": True,
            "insight": f"{entity_a_name} {direct_rel.get('relationship_type', 'relates to')} {entity_b_name}",
            "confidence": round(float(confidence), 2),
            "relationship_type": direct_rel.get("relationship_type", "related_to"),
            "chain_depth": direct_rel.get("chain_depth", 1),
            "inferred": direct_rel.get("inferred", False),
            "evidence": evidence,
            "reasoning": f"{entity_a_name} → {direct_rel.get('relationship_type', 'relates to')} → {entity_b_name}",
            "context": direct_rel.get("context", "")
        }
    
    # Step 3: Try multi-hop reasoning
    path_edges = await find_multi_hop_path(entity_id_a, entity_id_b)
    
    if path_edges and len(path_edges) == 2:
        edge_1 = path_edges[0]
        edge_2 = path_edges[1]
        
        # Get intermediate entity name
        sb = get_supabase_admin()
        try:
            mid_entity_result = await asyncio.to_thread(
                lambda: sb.table("entities")
                .select("name")
                .eq("id", edge_1.get("target_entity_id"))
                .limit(1)
                .execute()
            )
            mid_entity_name = mid_entity_result.data[0]["name"] if mid_entity_result.data else "Unknown"
        except:
            mid_entity_name = "Unknown"
        
        # Combine evidence from both edges
        evidence_ids_1 = edge_1.get("evidence_entry_ids", [])
        evidence_ids_2 = edge_2.get("evidence_entry_ids", [])
        combined_evidence_ids = list(set(evidence_ids_1 + evidence_ids_2))
        
        evidence = await get_evidence_entries(combined_evidence_ids)
        
        # Average confidence
        conf_1 = float(edge_1.get("confidence", edge_1.get("strength", 0.5)))
        conf_2 = float(edge_2.get("confidence", edge_2.get("strength", 0.5)))
        avg_confidence = round((conf_1 + conf_2) / 2, 2)
        
        return {
            "found": True,
            "insight": f"{entity_a_name} indirectly impacts {entity_b_name} through {mid_entity_name}",
            "confidence": avg_confidence,
            "relationship_type": "indirect_impact",
            "chain_depth": 2,
            "inferred": True,
            "evidence": evidence,
            "reasoning": (
                f"{entity_a_name} → {edge_1.get('relationship_type', 'relates to')} → "
                f"{mid_entity_name} → {edge_2.get('relationship_type', 'relates to')} → {entity_b_name}"
            ),
            "reasoning_chain": [
                {
                    "entity": entity_a_name,
                    "relationship": edge_1.get("relationship_type", "relates_to"),
                    "target": mid_entity_name,
                    "confidence": round(conf_1, 2)
                },
                {
                    "entity": mid_entity_name,
                    "relationship": edge_2.get("relationship_type", "relates_to"),
                    "target": entity_b_name,
                    "confidence": round(conf_2, 2)
                }
            ]
        }
    
    # No relationship found
    return {
        "found": False,
        "error": f"No relationship found between {entity_a_name} and {entity_b_name}"
    }


async def get_entity_explanation(entity_name: str) -> Dict[str, Any]:
    """
    Get full explanation for a single entity including its connections.
    
    Returns:
    {
        "entity_name": str,
        "entity_type": str,
        "description": str,
        "sentiment_score": float,
        "mention_count": int,
        "first_seen": date,
        "last_seen": date,
        "incoming_relationships": [...],
        "outgoing_relationships": [...]
    }
    """
    sb = get_supabase_admin()
    
    try:
        # Fetch entity details
        entity_result = await asyncio.to_thread(
            lambda: sb.table("entities")
            .select("*")
            .eq("name", entity_name)
            .limit(1)
            .execute()
        )
        
        if not entity_result.data:
            return {"found": False, "error": f"Entity not found: {entity_name}"}
        
        entity = entity_result.data[0]
        entity_id = entity.get("id")
        
        # Fetch incoming and outgoing relationships
        incoming = await asyncio.to_thread(
            lambda: sb.table("entity_relationships")
            .select("*")
            .eq("target_entity_id", entity_id)
            .order("strength", desc=True)
            .limit(10)
            .execute()
        )
        
        outgoing = await asyncio.to_thread(
            lambda: sb.table("entity_relationships")
            .select("*")
            .eq("source_entity_id", entity_id)
            .order("strength", desc=True)
            .limit(10)
            .execute()
        )
        
        # Get source entity names for incoming
        incoming_rels = []
        for rel in incoming.data or []:
            src_result = await asyncio.to_thread(
                lambda: sb.table("entities")
                .select("name")
                .eq("id", rel.get("source_entity_id"))
                .limit(1)
                .execute()
            )
            src_name = src_result.data[0]["name"] if src_result.data else "Unknown"
            incoming_rels.append({
                "source": src_name,
                "type": rel.get("relationship_type"),
                "strength": rel.get("strength"),
                "confidence": rel.get("confidence")
            })
        
        # Get target entity names for outgoing
        outgoing_rels = []
        for rel in outgoing.data or []:
            tgt_result = await asyncio.to_thread(
                lambda: sb.table("entities")
                .select("name")
                .eq("id", rel.get("target_entity_id"))
                .limit(1)
                .execute()
            )
            tgt_name = tgt_result.data[0]["name"] if tgt_result.data else "Unknown"
            outgoing_rels.append({
                "target": tgt_name,
                "type": rel.get("relationship_type"),
                "strength": rel.get("strength"),
                "confidence": rel.get("confidence")
            })
        
        return {
            "found": True,
            "entity_name": entity.get("name"),
            "entity_type": entity.get("entity_type"),
            "description": entity.get("description", ""),
            "domain": entity.get("domain", "unspecified"),
            "sentiment_score": round(float(entity.get("sentiment_score", 0)), 2),
            "mention_count": entity.get("mention_count", 0),
            "first_seen": entity.get("first_seen"),
            "last_seen": entity.get("last_seen"),
            "incoming_relationships": incoming_rels,
            "outgoing_relationships": outgoing_rels
        }
    
    except Exception as e:
        logger.error(f"Failed to get entity explanation: {e}")
        return {"found": False, "error": str(e)}
