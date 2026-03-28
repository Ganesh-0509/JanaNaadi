from typing import List, Dict, Tuple
import logging
import asyncio

logger = logging.getLogger("jananaadi.inference")

ALLOWED_RELATIONSHIP_TYPES = {
    "supports",
    "opposes",
    "impacts",
    "related_to",
    "part_of",
    "causes",
    "mentioned_in",
    "located_in",
    "cross_domain_impact",
}

RELATIONSHIP_TYPE_ALIASES = {
    "affects": "impacts",
    "influences": "impacts",
    "drives": "causes",
    "threatens": "impacts",
    "strains": "impacts",
    "enables": "supports",
    "enhances": "supports",
}


def _normalize_relationship_type(rel_type: str | None) -> str:
    candidate = (rel_type or "related_to").strip().lower()
    mapped = RELATIONSHIP_TYPE_ALIASES.get(candidate, candidate)
    return mapped if mapped in ALLOWED_RELATIONSHIP_TYPES else "related_to"

# ── ENHANCED DOMAIN INFERENCE RULES ─────────────────────────────────
# Format: (domain_a, domain_b) → (relationship_type, confidence)
# Confidence range: 0.65-0.80 (validated domain knowledge)
DOMAIN_RULES = {
    # Climate impacts
    ("climate", "economics"): ("affects", 0.75),
    ("climate", "society"): ("impacts", 0.72),
    ("climate", "defense"): ("threatens", 0.68),
    ("climate", "technology"): ("drives", 0.65),
    
    # Economics impacts
    ("economics", "society"): ("impacts", 0.78),
    ("economics", "technology"): ("drives", 0.70),
    ("economics", "geopolitics"): ("influences", 0.65),
    ("economics", "defense"): ("strains", 0.68),
    
    # Defense impacts
    ("defense", "geopolitics"): ("influences", 0.80),
    ("defense", "economics"): ("strains", 0.70),
    ("defense", "society"): ("affects", 0.68),
    
    # Technology impacts
    ("technology", "economics"): ("drives", 0.75),
    ("technology", "society"): ("enables", 0.70),
    ("technology", "defense"): ("enhances", 0.72),
    
    # Geopolitics impacts
    ("geopolitics", "economics"): ("impacts", 0.70),
    ("geopolitics", "society"): ("influences", 0.68),
    ("geopolitics", "defense"): ("drives", 0.75),
}


def infer_relationship(domain_a: str, domain_b: str) -> Tuple[str, float]:
    """
    Return relationship type + confidence based on domain rules.
    
    Uses bidirectional lookup for symmetric inference.
    """
    # Try forward direction
    key = (domain_a, domain_b)
    if key in DOMAIN_RULES:
        rel_type, confidence = DOMAIN_RULES[key]
        return _normalize_relationship_type(rel_type), confidence
    
    # Try reverse direction
    key_rev = (domain_b, domain_a)
    if key_rev in DOMAIN_RULES:
        rel_type, confidence = DOMAIN_RULES[key_rev]
        return _normalize_relationship_type(rel_type), confidence
    
    # Default fallback
    return "related_to", 0.50


async def generate_inferred_edges(
    entity_id_map: Dict[str, str],
    entity_domain_map: Dict[str, str],
    entry_id: str | None = None
) -> int:
    """
    Generate inferred intelligence edges using domain rules and persist to DB.
    
    When entities from different domains co-occur, apply domain inference rules
    to create weighted inferred relationships encoding domain knowledge.
    
    Returns: Number of inferred edges created or strengthened
    """
    from app.core.supabase_client import get_supabase_admin

    inferred_edges_created = 0
    entity_names = list(entity_id_map.keys())

    async def db_retry(operation, max_retries=3):
        """Retry wrapper for DB operations."""
        for attempt in range(max_retries):
            try:
                sb = get_supabase_admin()
                return operation(sb)
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                logger.warning(f"DB retry {attempt+1}/{max_retries}: {e}")
                await asyncio.sleep(0.5 * (2 ** attempt))
        return None

    # Compare every pair of entities
    for i in range(len(entity_names)):
        for j in range(i + 1, len(entity_names)):
            name_a = entity_names[i]
            name_b = entity_names[j]
            
            domain_a = entity_domain_map.get(name_a)
            domain_b = entity_domain_map.get(name_b)

            # Skip if either domain missing or same
            if not domain_a or not domain_b or domain_a == domain_b:
                continue

            id_a = entity_id_map.get(name_a)
            id_b = entity_id_map.get(name_b)
            if not id_a or not id_b:
                continue

            rel_type, confidence = infer_relationship(domain_a, domain_b)
            if confidence < 0.5:  # Skip low-confidence inferences
                continue

            try:
                # Check if edge exists
                existing = await db_retry(
                    lambda sb: sb.table("entity_relationships")
                    .select("id, confidence")
                    .eq("source_entity_id", id_a)
                    .eq("target_entity_id", id_b)
                    .eq("relationship_type", rel_type)
                    .eq("inferred", True)
                    .limit(1)
                    .execute()
                )
                
                if existing and existing.data:
                    # Strengthen existing edge
                    rel_id = existing.data[0]["id"]
                    current_conf = existing.data[0].get("confidence", 0.6)
                    new_conf = (current_conf + confidence) / 2

                    await db_retry(
                        lambda sb: sb.table("entity_relationships")
                        .update({"confidence": round(new_conf, 2)})
                        .eq("id", rel_id)
                        .execute()
                    )
                    logger.debug(f"Strengthened: {name_a}({domain_a}) → {name_b}({domain_b}) confidence: {round(new_conf, 2)}")
                else:
                    # Create new inferred edge
                    new_edge = {
                        "source_entity_id": id_a,
                        "target_entity_id": id_b,
                        "relationship_type": rel_type,
                        "strength": 0.6,
                        "confidence": round(confidence, 2),
                        "inferred": True,
                        "chain_depth": 1,
                        "source_entry_id": entry_id,
                        "context": f"Inferred: {domain_a} entity impacts {domain_b} entity (domain rule: {rel_type})",
                        "metadata": {
                            "inference_type": "domain_rule",
                            "source_domain": domain_a,
                            "target_domain": domain_b,
                            "confidence": round(confidence, 2)
                        }
                    }
                    
                    await db_retry(
                        lambda sb: sb.table("entity_relationships")
                        .insert(new_edge)
                        .execute()
                    )
                    inferred_edges_created += 1
                    logger.info(
                        f"🧠 Inferred: {name_a}({domain_a}) --[{rel_type}]→ {name_b}({domain_b}) "
                        f"confidence: {confidence}"
                    )
            
            except Exception as e:
                logger.warning(f"Failed to create inferred edge {name_a}→{name_b}: {e}")
                continue

    return inferred_edges_created


# ── MULTI-HOP REASONING (A → B → C) ────────────────────────────────

async def generate_multi_hop_edges() -> int:
    """
    Generate multi-hop edges for reasoning across entity chains.
    
    Logic: If A → B exists (inferred, depth=1) and B → C exists (inferred, depth=1),
    create A → C as "indirect_impact" with depth=2 and averaged confidence.
    
    Returns: Number of multi-hop edges created
    """
    from app.core.supabase_client import get_supabase_admin

    multi_hop_created = 0

    async def db_retry(operation, max_retries=3):
        """Retry wrapper for DB operations."""
        for attempt in range(max_retries):
            try:
                sb = get_supabase_admin()
                return operation(sb)
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                logger.warning(f"DB retry {attempt+1}/{max_retries}: {e}")
                await asyncio.sleep(0.5 * (2 ** attempt))
        return None

    try:
        # Fetch all depth-1 inferred edges
        edges_depth_1 = await db_retry(
            lambda sb: sb.table("entity_relationships")
            .select("id, source_entity_id, target_entity_id, relationship_type, confidence, chain_depth")
            .eq("inferred", True)
            .eq("chain_depth", 1)
            .limit(1000)
            .execute()
        )

        if not edges_depth_1 or not edges_depth_1.data:
            logger.info("No depth-1 inferred edges for multi-hop reasoning")
            return 0

        edges = edges_depth_1.data
        logger.info(f"Found {len(edges)} depth-1 edges for multi-hop expansion")

        # Build outgoing adjacency: source_id → [(target_id, rel_type, confidence), ...]
        outgoing = {}
        for edge in edges:
            src = edge["source_entity_id"]
            tgt = edge["target_entity_id"]
            rel = edge["relationship_type"]
            conf = edge.get("confidence", 0.6)
            
            if src not in outgoing:
                outgoing[src] = []
            outgoing[src].append((tgt, rel, conf))

        # Find 2-hop paths: A → B → C
        for source_id, targets in outgoing.items():
            for mid_id, first_rel, first_conf in targets:
                if mid_id not in outgoing:
                    continue

                for target_id, second_rel, second_conf in outgoing[mid_id]:
                    if source_id == target_id:
                        continue  # Skip cycles

                    # Chain confidence = average of hops
                    chain_confidence = round((first_conf + second_conf) / 2, 2)

                    # Check if edge exists
                    existing = await db_retry(
                        lambda sb: sb.table("entity_relationships")
                        .select("id, confidence, chain_depth")
                        .eq("source_entity_id", source_id)
                        .eq("target_entity_id", target_id)
                        .eq("relationship_type", "impacts")
                        .eq("inferred", True)
                        .eq("chain_depth", 2)
                        .limit(1)
                        .execute()
                    )

                    if existing and existing.data:
                        # Edge exists, potentially strengthen
                        rel_id = existing.data[0]["id"]
                        current_conf = existing.data[0].get("confidence", 0.6)
                        
                        if chain_confidence > current_conf:
                            await db_retry(
                                lambda sb: sb.table("entity_relationships")
                                .update({"confidence": chain_confidence, "chain_depth": 2})
                                .eq("id", rel_id)
                                .execute()
                            )
                            logger.debug(f"Updated multi-hop {source_id}→{target_id} confidence: {chain_confidence}")
                    else:
                        # Create new multi-hop edge
                        multi_hop_edge = {
                            "source_entity_id": source_id,
                            "target_entity_id": target_id,
                            "relationship_type": "impacts",
                            "strength": 0.5,
                            "confidence": chain_confidence,
                            "inferred": True,
                            "chain_depth": 2,
                            "context": f"Multi-hop reasoning: indirect effects through entity chain ({first_rel} + {second_rel})",
                            "metadata": {
                                "inference_type": "multi_hop",
                                "chain_path": f"{source_id}→{mid_id}→{target_id}",
                                "first_rel": first_rel,
                                "second_rel": second_rel,
                                "confidence": chain_confidence
                            }
                        }

                        await db_retry(
                            lambda sb: sb.table("entity_relationships")
                            .insert(multi_hop_edge)
                            .execute()
                        )
                        multi_hop_created += 1
                        logger.info(
                            f"🔗 Multi-hop: {source_id} --[indirect_impact]→ {target_id} "
                            f"(via {mid_id}, confidence: {chain_confidence})"
                        )

    except Exception as e:
        logger.error(f"Multi-hop generation failed: {e}")

    return multi_hop_created