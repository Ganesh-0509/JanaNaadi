"""Knowledge Graph Entity Schemas for Ontology Engine."""

from datetime import datetime
from pydantic import BaseModel


class EntityType:
    """Entity types for knowledge graph."""
    PERSON = "person"
    ORGANIZATION = "organization"
    LOCATION = "location"
    EVENT = "event"
    POLICY = "policy"
    TECHNOLOGY = "technology"
    INFRASTRUCTURE = "infrastructure"


class RelationType:
    """Relationship types between entities."""
    SUPPORTS = "supports"
    OPPOSES = "opposes"
    IMPACTS = "impacts"
    RELATED_TO = "related_to"
    PART_OF = "part_of"
    CAUSES = "causes"
    MENTIONED_IN = "mentioned_in"
    LOCATED_IN = "located_in"


class Entity(BaseModel):
    """Entity in the knowledge graph."""
    id: int | None = None
    name: str
    entity_type: str  # person, organization, location, event, policy, etc.
    description: str | None = None
    aliases: list[str] = []  # alternate names
    metadata: dict = {}  # flexible storage for type-specific fields
    sentiment_score: float | None = None  # aggregate sentiment about this entity
    mention_count: int = 0
    first_seen: datetime | None = None
    last_seen: datetime | None = None
    created_at: datetime | None = None


class EntityRelationship(BaseModel):
    """Relationship between two entities."""
    id: int | None = None
    source_entity_id: int
    target_entity_id: int
    relationship_type: str  # supports, opposes, impacts, etc.
    strength: float = 1.0  # 0.0 to 1.0
    sentiment: str | None = None  # positive, negative, neutral
    context: str | None = None  # brief description of the relationship
    source_entry_id: int | None = None  # which sentiment entry discovered this
    created_at: datetime | None = None


class EntityMention(BaseModel):
    """Link between entities and sentiment entries."""
    id: int | None = None
    entity_id: int
    entry_id: int
    mention_context: str | None = None  # surrounding text
    sentiment: str | None = None
    created_at: datetime | None = None


class IntelligenceDomain:
    """Multi-domain intelligence categories."""
    GEOPOLITICS = "geopolitics"
    ECONOMICS = "economics"
    DEFENSE = "defense"
    CLIMATE = "climate"
    TECHNOLOGY = "technology"
    SOCIETY = "society"


class DomainIntelligenceScore(BaseModel):
    """Intelligence score for a specific domain."""
    id: int | None = None
    domain: str  # geopolitics, economics, defense, climate, technology, society
    scope: str  # national, state, district
    scope_id: int | None = None  # state_id or district_id
    risk_score: float  # 0.0 (low risk) to 1.0 (high risk)
    sentiment_trend: float  # -1.0 (worsening) to 1.0 (improving)
    urgency_level: str  # low, moderate, high, critical
    key_factors: list[str] = []  # main contributing factors
    entity_ids: list[int] = []  # key entities involved
    computed_at: datetime | None = None


class KnowledgeGraphStats(BaseModel):
    """Statistics about the knowledge graph."""
    total_entities: int
    total_relationships: int
    entities_by_type: dict[str, int]
    relationships_by_type: dict[str, int]
    top_entities: list[dict]  # [{name, type, mention_count, sentiment}]
    domain_scores: list[DomainIntelligenceScore]
