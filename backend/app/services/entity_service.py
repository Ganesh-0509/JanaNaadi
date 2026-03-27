"""Entity Extraction Service — reads from cache populated by nlp_service.

KEY CHANGE: extract_entities() no longer makes its own Bytez API call.
nlp_service.analyze_text() now runs a combined prompt that covers BOTH
sentiment and entity extraction in one shot, and stores the entity result
in _entity_cache keyed by text hash.

When entity_service.extract_entities() is called on the same text, it will
ALWAYS be a cache hit — 0 additional API calls.

The rest of this file (store_entities_and_relationships, create_cross_domain_edges,
process_entry_for_entities) is unchanged.
"""

import logging
import asyncio
import hashlib
import re
import time
from datetime import datetime, timezone
from app.core.supabase_client import get_supabase_admin
from app.services.inference_engine import generate_inferred_edges, generate_multi_hop_edges

logger = logging.getLogger("jananaadi.entity_extraction")

# ── Shared entity cache ────────────────────────────────────────────────────────
# nlp_service.py imports this dict and writes into it after each combined call.
# extract_entities() reads from it — always a hit for articles already analyzed.
_entity_cache: dict = {}

# ── API call guard (safety net — should rarely trigger now) ───────────────────
_api_call_count = {"count": 0, "reset_time": time.time() + 86400}
MAX_DAILY_API_CALLS = 50  # reduced — nlp_service handles the real calls now


def _check_api_limit() -> bool:
    now = time.time()
    if now > _api_call_count["reset_time"]:
        _api_call_count["count"] = 0
        _api_call_count["reset_time"] = now + 86400
        logger.info("Daily API call counter reset")
    if _api_call_count["count"] >= MAX_DAILY_API_CALLS:
        logger.warning(f"Entity API limit reached ({MAX_DAILY_API_CALLS}). Skipping.")
        return False
    _api_call_count["count"] += 1
    return True


SPAM_KEYWORDS = [
    "click here", "buy now", "limited offer", "subscribe now",
    "act now", "free gift", "winner", "claim your", "special promotion",
]


async def extract_entities(text: str, entry_id: str | None = None) -> dict:
    """Return entity extraction result — almost always from cache.

    If nlp_service.analyze_text() was called first on this text (which it
    always is during normal ingestion), this is a free cache hit.

    Only falls back to a direct Bytez call if somehow the cache is cold
    (e.g. entity_service called in isolation during testing).
    """
    if len(text.strip()) < 30:
        return {"entities": [], "relationships": []}

    text_lower = text.lower()
    if any(kw in text_lower for kw in SPAM_KEYWORDS):
        return {"entities": [], "relationships": []}

    text_hash = hashlib.md5(text[:1500].encode("utf-8", errors="ignore")).hexdigest()

    # ── Cache hit (normal path — nlp_service already populated this) ──────────
    if text_hash in _entity_cache:
        logger.debug(f"Entity cache HIT {text_hash[:8]} — 0 API calls")
        return _entity_cache[text_hash]

    # Cache miss fallback path (rare): try local LLM first.
    logger.warning(
        "Entity cache MISS %s - fallback extraction path used",
        text_hash[:8],
    )

    prompt = f"""Extract entities and relationships from this text. Return ONLY valid JSON.

{{
  "entities": [
    {{"name": "Entity Name", "type": "person|organization|location|event|policy|technology|infrastructure", "description": "Brief", "sentiment": "positive|negative|neutral"}}
  ],
  "relationships": [
    {{"source": "Entity 1", "target": "Entity 2", "type": "supports|opposes|impacts|related_to|causes|part_of", "context": "Why related"}}
  ]
}}

Text: {text[:1500]}"""

    # 1) Local LLM fallback
    try:
        from app.core.settings import get_settings
        from app.services.local_llm_service import generate_json

        settings = get_settings()
        result = await generate_json(prompt, max_tokens=600)
        result.setdefault("entities", [])
        result.setdefault("relationships", [])

        _entity_cache[text_hash] = result
        if len(_entity_cache) > 1000:
            del _entity_cache[list(_entity_cache.keys())[0]]

        return result
    except Exception as e:
        logger.warning("Entity local fallback failed: %s", e)

    # 2) Optional cloud fallback when explicitly enabled
    try:
        from app.core.settings import get_settings
        settings = get_settings()
    except Exception:
        settings = None

    if not settings or not settings.allow_cloud_fallback:
        return {"entities": [], "relationships": []}

    if not _check_api_limit():
        return {"entities": [], "relationships": []}

    for attempt in range(2):
        try:
            from app.services.bytez_service import call_bytez_model
            result_text = await call_bytez_model(prompt, max_tokens=600)
            result_text = result_text.strip()

            if "```" in result_text:
                result_text = re.sub(r"```(?:json)?\n?", "", result_text)

            json_match = re.search(r"\{[\s\S]*\}", result_text)
            if json_match:
                result_text = json_match.group()

            import json
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError:
                open_braces = result_text.count("{") - result_text.count("}")
                open_brackets = result_text.count("[") - result_text.count("]")
                result_text = re.sub(r",\s*$", "", result_text.rstrip())
                result_text = re.sub(r",\s*\]", "]", result_text)
                result_text = re.sub(r",\s*\}", "}", result_text)
                result_text += "]" * open_brackets + "}" * open_braces
                result = json.loads(result_text)

            result.setdefault("entities", [])
            result.setdefault("relationships", [])

            _entity_cache[text_hash] = result
            if len(_entity_cache) > 1000:
                del _entity_cache[list(_entity_cache.keys())[0]]

            return result

        except Exception as e:
            logger.warning(f"Entity extraction attempt {attempt + 1}/2 failed: {e}")
            if attempt == 1:
                return {"entities": [], "relationships": []}
            await asyncio.sleep(0.5)

    return {"entities": [], "relationships": []}


async def create_cross_domain_edges(
    entity_id_map: dict,
    entity_domain_map: dict,
    entry_id: str | None = None,
) -> int:
    """Create cross-domain relationship edges between entities from different domains."""
    edges_created = 0
    entity_names = list(entity_id_map.keys())

    async def db_retry(operation, max_retries=3):
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

    for i in range(len(entity_names)):
        for j in range(i + 1, len(entity_names)):
            name_a, name_b = entity_names[i], entity_names[j]
            domain_a = entity_domain_map.get(name_a)
            domain_b = entity_domain_map.get(name_b)

            if not domain_a or not domain_b or domain_a == domain_b:
                continue

            id_a = entity_id_map.get(name_a)
            id_b = entity_id_map.get(name_b)
            if not id_a or not id_b:
                continue

            try:
                existing = await db_retry(
                    lambda sb: sb.table("entity_relationships")
                    .select("id, strength, evidence_entry_ids")
                    .eq("source_entity_id", id_a)
                    .eq("target_entity_id", id_b)
                    .eq("relationship_type", "cross_domain_impact")
                    .limit(1)
                    .execute()
                )

                if existing and existing.data:
                    rel_id = existing.data[0]["id"]
                    new_strength = min(round(existing.data[0].get("strength", 0.3) + 0.05, 2), 1.0)
                    
                    # Append entry_id to evidence list
                    existing_evidence = existing.data[0].get("evidence_entry_ids", []) or []
                    if entry_id and entry_id not in existing_evidence:
                        existing_evidence.append(entry_id)
                    
                    await db_retry(
                        lambda sb: sb.table("entity_relationships")
                        .update({"strength": new_strength, "evidence_entry_ids": existing_evidence})
                        .eq("id", rel_id)
                        .execute()
                    )
                else:
                    evidence_ids = [entry_id] if entry_id else []
                    await db_retry(
                        lambda sb: sb.table("entity_relationships")
                        .insert({
                            "source_entity_id": id_a,
                            "target_entity_id": id_b,
                            "relationship_type": "cross_domain_impact",
                            "strength": 0.3,
                            "context": f"Co-occurred in same article: {domain_a} ↔ {domain_b}",
                            "source_entry_id": entry_id,
                            "evidence_entry_ids": evidence_ids,
                            "metadata": {"domain_a": domain_a, "domain_b": domain_b, "edge_type": "cross_domain"},
                        })
                        .execute()
                    )
                    edges_created += 1
                    logger.info(f"Cross-domain edge: {name_a}({domain_a}) ↔ {name_b}({domain_b})")

            except Exception as e:
                logger.warning(f"Cross-domain edge failed {name_a} ↔ {name_b}: {e}")

    return edges_created


async def store_entities_and_relationships(
    extraction_result: dict,
    entry_id: str | None = None,
    entry_sentiment: str | None = None,
    entry_domain: str | None = None,
) -> dict:
    """Store extracted entities and relationships in the database."""
    entities_stored = 0
    relationships_stored = 0
    mentions_stored = 0
    cross_domain_edges = 0
    entity_id_map: dict = {}
    entity_domain_map: dict = {}

    VALID_ENTITY_TYPES = {
        "person", "organization", "location", "event",
        "policy", "technology", "infrastructure", "concept", "other",
    }

    async def db_retry(operation, max_retries=3):
        for attempt in range(max_retries):
            try:
                return operation(get_supabase_admin())
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(0.5 * (2 ** attempt))
        return None

    try:
        for entity_data in extraction_result.get("entities", []):
            name = entity_data.get("name", "").strip()
            if not name or len(name) > 200:
                continue

            raw_type = entity_data.get("type", "other").lower().strip()
            entity_type = raw_type if raw_type in VALID_ENTITY_TYPES else "other"
            description = entity_data.get("description", "")[:500]
            aliases = entity_data.get("aliases", [])[:10]
            sentiment = entity_data.get("sentiment")

            if entry_domain:
                entity_domain_map[name] = entry_domain

            try:
                existing = await db_retry(
                    lambda sb: sb.table("entities")
                    .select("id, name, mention_count, sentiment_score")
                    .eq("name", name)
                    .limit(1)
                    .execute()
                )

                entity_id = None

                if existing and existing.data:
                    entity = existing.data[0]
                    entity_id = entity["id"]
                    entity_id_map[name] = entity_id

                    update_data = {"last_seen": datetime.now(timezone.utc).isoformat()}
                    if sentiment:
                        current_score = entity.get("sentiment_score") or 0
                        mention_count = max(entity.get("mention_count", 0), 1)
                        sv = 1.0 if sentiment == "positive" else -1.0 if sentiment == "negative" else 0.0
                        update_data["sentiment_score"] = (current_score * mention_count + sv) / (mention_count + 1)

                    await db_retry(
                        lambda sb: sb.table("entities").update(update_data).eq("id", entity_id).execute()
                    )
                else:
                    sv = 1.0 if sentiment == "positive" else -1.0 if sentiment == "negative" else 0.0
                    result = await db_retry(
                        lambda sb: sb.table("entities").insert({
                            "name": name,
                            "entity_type": entity_type,
                            "description": description,
                            "aliases": aliases,
                            "sentiment_score": sv,
                            "mention_count": 0,
                            "domain": entry_domain or "unspecified",
                            "first_seen": datetime.now(timezone.utc).isoformat(),
                            "last_seen": datetime.now(timezone.utc).isoformat(),
                        }).execute()
                    )
                    if result and result.data:
                        entity_id = result.data[0]["id"]
                        entity_id_map[name] = entity_id
                        entities_stored += 1

                if entry_id and entity_id:
                    try:
                        await db_retry(
                            lambda sb: sb.table("entity_mentions").insert({
                                "entity_id": entity_id, "entry_id": entry_id,
                                "sentiment": sentiment or entry_sentiment,
                            }).execute()
                        )
                        mentions_stored += 1
                    except Exception:
                        pass

            except Exception as e:
                logger.warning(f"Failed to process entity '{name}': {e}")

        await asyncio.sleep(0.1)

        for rel_data in extraction_result.get("relationships", []):
            source_name = rel_data.get("source", "").strip()
            target_name = rel_data.get("target", "").strip()
            source_id = entity_id_map.get(source_name)
            target_id = entity_id_map.get(target_name)

            if not source_id or not target_id:
                continue

            try:
                existing_rel = await db_retry(
                    lambda sb: sb.table("entity_relationships")
                    .select("id, strength, evidence_entry_ids")
                    .eq("source_entity_id", source_id)
                    .eq("target_entity_id", target_id)
                    .limit(1)
                    .execute()
                )

                if existing_rel and existing_rel.data:
                    rel_id = existing_rel.data[0]["id"]
                    new_strength = min(existing_rel.data[0].get("strength", 1.0) + 0.1, 1.0)
                    
                    # Append entry_id to evidence list (avoid duplicates)
                    existing_evidence = existing_rel.data[0].get("evidence_entry_ids", []) or []
                    if entry_id and entry_id not in existing_evidence:
                        existing_evidence.append(entry_id)
                    
                    await db_retry(
                        lambda sb: sb.table("entity_relationships")
                        .update({"strength": new_strength, "evidence_entry_ids": existing_evidence}).eq("id", rel_id).execute()
                    )
                else:
                    # New relationship
                    evidence_ids = [entry_id] if entry_id else []
                    await db_retry(
                        lambda sb: sb.table("entity_relationships").insert({
                            "source_entity_id": source_id,
                            "target_entity_id": target_id,
                            "relationship_type": rel_data.get("type", "related_to"),
                            "context": rel_data.get("context", "")[:500],
                            "source_entry_id": entry_id,
                            "strength": 1.0,
                            "evidence_entry_ids": evidence_ids,
                        }).execute()
                    )
                    relationships_stored += 1

            except Exception as e:
                logger.warning(f"Relationship failed {source_name}->{target_name}: {e}")

        if len(entity_id_map) >= 2 and entry_domain:
            cross_domain_edges = await create_cross_domain_edges(
                entity_id_map=entity_id_map,
                entity_domain_map=entity_domain_map,
                entry_id=entry_id,
            )
            
            # ── INTELLIGENCE ENGINE: Generate inferred edges ──────────────
            inferred_edges = await generate_inferred_edges(
                entity_id_map=entity_id_map,
                entity_domain_map=entity_domain_map,
                entry_id=entry_id
            )
            
            # ── INTELLIGENCE ENGINE: Generate multi-hop reasoning ────────
            multi_hop_edges = await generate_multi_hop_edges()
        else:
            cross_domain_edges = 0
            inferred_edges = 0
            multi_hop_edges = 0

        logger.info(
            f"Stored {entities_stored} entities, {mentions_stored} mentions, "
            f"{relationships_stored} relationships, {cross_domain_edges} cross-domain, "
            f"{inferred_edges} inferred, {multi_hop_edges} multi-hop edges"
        )

        return {
            "entities_stored": entities_stored,
            "mentions_stored": mentions_stored,
            "relationships_stored": relationships_stored,
            "cross_domain_edges": cross_domain_edges,
            "inferred_edges": inferred_edges,
            "multi_hop_edges": multi_hop_edges,
        }

    except Exception as e:
        logger.error(f"Failed to store entities: {e}")
        return {
            "entities_stored": 0,
            "mentions_stored": 0,
            "relationships_stored": 0,
            "cross_domain_edges": 0,
            "inferred_edges": 0,
            "multi_hop_edges": 0,
            "error": str(e)
        }


async def process_entry_for_entities(
    entry_id: str,
    text: str,
    sentiment: str | None = None,
    domain: str | None = None,
):
    """Process a single sentiment entry to extract and store entities."""
    try:
        extraction = await extract_entities(text, entry_id)
        return await store_entities_and_relationships(extraction, entry_id, sentiment, entry_domain=domain)
    except Exception as e:
        logger.error(f"Failed to process entry {entry_id}: {e}")
        return None