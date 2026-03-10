"""Entity Extraction Service - Extracts entities from text for knowledge graph."""

import logging
import asyncio
from datetime import datetime, timezone
from app.services.bytez_service import call_bytez_model
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger("jananaadi.entity_extraction")


async def extract_entities(text: str, entry_id: int | None = None) -> dict:
    """Extract entities from text using Bytez AI.
    
    Args:
        text: The text to analyze
        entry_id: Optional sentiment entry ID to link mentions
        
    Returns:
        Dict with extracted entities and relationships
    """
    prompt = f"""Extract all important entities from this text. Return a JSON array with this structure:
{{
  "entities": [
    {{
      "name": "entity name",
      "type": "person|organization|location|event|policy|technology|infrastructure",
      "description": "brief description",
      "aliases": ["alternate name 1", "alternate name 2"],
      "sentiment": "positive|negative|neutral"
    }}
  ],
  "relationships": [
    {{
      "source": "entity name 1",
      "target": "entity name 2",
      "type": "supports|opposes|impacts|related_to|part_of|causes|located_in",
      "context": "brief explanation"
    }}
  ]
}}

Text to analyze:
{text[:2000]}

Focus on:
- Politicians, government officials, public figures
- Government departments, organizations, companies
- Cities, states, infrastructure projects
- Events, policies, programs
- Technologies, initiatives

Return ONLY the JSON, no explanation."""

    try:
        result_text = await call_bytez_model(prompt, max_tokens=800)
        
        # Parse JSON response
        import json
        # Remove markdown code fences if present
        if result_text.startswith("```"):
            lines = result_text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            result_text = "\n".join(lines)
        
        result = json.loads(result_text.strip())
        return result
    except Exception as e:
        logger.error(f"Entity extraction failed: {e}")
        return {"entities": [], "relationships": []}


async def store_entities_and_relationships(
    extraction_result: dict,
    entry_id: int | None = None,
    entry_sentiment: str | None = None
) -> dict:
    """Store extracted entities and relationships in database.
    
    Args:
        extraction_result: Result from extract_entities()
        entry_id: Sentiment entry ID that these entities came from
        entry_sentiment: Overall sentiment of the entry
        
    Returns:
        Dict with counts of stored entities and relationships
    """
    sb = get_supabase_admin()
    loop = asyncio.get_event_loop()
    
    entities_stored = 0
    relationships_stored = 0
    mentions_stored = 0
    entity_id_map = {}  # name -> id
    
    try:
        # Process entities
        for entity_data in extraction_result.get("entities", []):
            name = entity_data.get("name", "").strip()
            if not name:
                continue
                
            entity_type = entity_data.get("type", "other")
            description = entity_data.get("description", "")
            aliases = entity_data.get("aliases", [])
            sentiment = entity_data.get("sentiment")
            
            # Check if entity already exists (by name or alias)
            existing = await loop.run_in_executor(
                None,
                lambda: sb.table("entities")
                .select("id, name, mention_count, sentiment_score")
                .or_(f"name.eq.{name},aliases.cs.{{{name}}}")
                .limit(1)
                .execute()
            )
            
            if existing.data:
                # Entity exists, update it
                entity = existing.data[0]
                entity_id = entity["id"]
                entity_id_map[name] = entity_id
                
                # Update last seen and optionally sentiment
                update_data = {
                    "last_seen": datetime.now(timezone.utc).isoformat()
                }
                
                # Recalculate sentiment score if we have new data
                if sentiment and entry_sentiment:
                    current_score = entity.get("sentiment_score") or 0
                    mention_count = entity.get("mention_count", 0)
                    # Simple weighted average
                    sentiment_value = 1.0 if sentiment == "positive" else -1.0 if sentiment == "negative" else 0.0
                    new_score = (current_score * mention_count + sentiment_value) / (mention_count + 1)
                    update_data["sentiment_score"] = new_score
                
                await loop.run_in_executor(
                    None,
                    lambda: sb.table("entities").update(update_data).eq("id", entity_id).execute()
                )
            else:
                # Create new entity
                sentiment_score = 1.0 if sentiment == "positive" else -1.0 if sentiment == "negative" else 0.0
                new_entity = {
                    "name": name,
                    "entity_type": entity_type,
                    "description": description,
                    "aliases": aliases,
                    "sentiment_score": sentiment_score,
                    "mention_count": 0,
                    "first_seen": datetime.now(timezone.utc).isoformat(),
                    "last_seen": datetime.now(timezone.utc).isoformat(),
                }
                
                result = await loop.run_in_executor(
                    None,
                    lambda: sb.table("entities").insert(new_entity).execute()
                )
                
                if result.data:
                    entity_id = result.data[0]["id"]
                    entity_id_map[name] = entity_id
                    entities_stored += 1
            
            # Create entity mention if we have an entry_id
            if entry_id and entity_id:
                mention_data = {
                    "entity_id": entity_id,
                    "entry_id": entry_id,
                    "sentiment": sentiment or entry_sentiment
                }
                
                # Use upsert to avoid duplicates
                try:
                    await loop.run_in_executor(
                        None,
                        lambda: sb.table("entity_mentions").insert(mention_data).execute()
                    )
                    mentions_stored += 1
                except Exception:
                    # Mention already exists, skip
                    pass
        
        # Process relationships
        for rel_data in extraction_result.get("relationships", []):
            source_name = rel_data.get("source", "").strip()
            target_name = rel_data.get("target", "").strip()
            
            if not source_name or not target_name:
                continue
            
            # Get entity IDs
            source_id = entity_id_map.get(source_name)
            target_id = entity_id_map.get(target_name)
            
            if not source_id or not target_id:
                continue
            
            # Check if relationship already exists
            existing_rel = await loop.run_in_executor(
                None,
                lambda: sb.table("entity_relationships")
                .select("id, strength")
                .eq("source_entity_id", source_id)
                .eq("target_entity_id", target_id)
                .eq("relationship_type", rel_data.get("type", "related_to"))
                .limit(1)
                .execute()
            )
            
            if existing_rel.data:
                # Relationship exists, increase strength
                rel_id = existing_rel.data[0]["id"]
                current_strength = existing_rel.data[0].get("strength", 1.0)
                new_strength = min(current_strength + 0.1, 1.0)
                
                await loop.run_in_executor(
                    None,
                    lambda: sb.table("entity_relationships")
                    .update({"strength": new_strength})
                    .eq("id", rel_id)
                    .execute()
                )
            else:
                # Create new relationship
                new_rel = {
                    "source_entity_id": source_id,
                    "target_entity_id": target_id,
                    "relationship_type": rel_data.get("type", "related_to"),
                    "context": rel_data.get("context"),
                    "source_entry_id": entry_id,
                    "strength": 1.0
                }
                
                await loop.run_in_executor(
                    None,
                    lambda: sb.table("entity_relationships").insert(new_rel).execute()
                )
                relationships_stored += 1
        
        logger.info(f"Stored {entities_stored} new entities, {mentions_stored} mentions, {relationships_stored} new relationships")
        
        return {
            "entities_stored": entities_stored,
            "mentions_stored": mentions_stored,
            "relationships_stored": relationships_stored
        }
        
    except Exception as e:
        logger.error(f"Failed to store entities: {e}")
        return {
            "entities_stored": 0,
            "mentions_stored": 0,
            "relationships_stored": 0,
            "error": str(e)
        }


async def process_entry_for_entities(entry_id: int, text: str, sentiment: str | None = None):
    """Process a single sentiment entry to extract and store entities.
    
    Args:
        entry_id: The sentiment entry ID
        text: The text to analyze
        sentiment: Overall sentiment of the entry
    """
    try:
        # Extract entities
        extraction = await extract_entities(text, entry_id)
        
        # Store in database
        result = await store_entities_and_relationships(extraction, entry_id, sentiment)
        
        return result
    except Exception as e:
        logger.error(f"Failed to process entry {entry_id} for entities: {e}")
        return None
