-- ============================================================
-- JanaNaadi Complete Database Schema
-- India's Real-Time Public Sentiment Intelligence Platform
-- AI-Powered Global Ontology Engine
-- ============================================================
-- Run this entire file in Supabase SQL Editor to set up the complete database
-- ============================================================

-- ============================================================
-- GEOGRAPHIC HIERARCHY (pre-loaded, India's democratic geography)
-- ============================================================

CREATE TABLE IF NOT EXISTS states (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL  -- e.g., 'TN', 'DL', 'MH'
);

CREATE TABLE IF NOT EXISTS districts (
    id SERIAL PRIMARY KEY,
    state_id INTEGER REFERENCES states(id),
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS constituencies (
    id SERIAL PRIMARY KEY,
    district_id INTEGER REFERENCES districts(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('parliamentary', 'assembly')),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    constituency_id INTEGER REFERENCES constituencies(id),
    name TEXT NOT NULL,
    booth_numbers TEXT[],
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION
);

-- ============================================================
-- TOPIC TAXONOMY
-- ============================================================

CREATE TABLE IF NOT EXISTS topic_taxonomy (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    keywords JSONB NOT NULL,
    icon TEXT
);

-- ============================================================
-- CORE SENTIMENT DATA
-- ============================================================

CREATE TABLE IF NOT EXISTS sentiment_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source info
    source TEXT NOT NULL CHECK (source IN ('twitter', 'news', 'reddit', 'survey', 'csv', 'manual')),
    source_id TEXT,
    source_url TEXT,
    author_handle TEXT,

    -- Content
    original_text TEXT NOT NULL,
    cleaned_text TEXT NOT NULL,
    language TEXT NOT NULL,
    translated_text TEXT,

    -- NLP Results
    sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    sentiment_score REAL NOT NULL CHECK (sentiment_score BETWEEN -1.0 AND 1.0),
    confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),

    -- Topic extraction
    primary_topic_id INTEGER REFERENCES topic_taxonomy(id),
    secondary_topics INTEGER[],
    extracted_keywords TEXT[],

    -- Multi-Domain Intelligence (for Global Ontology Engine)
    domain TEXT CHECK (domain IN ('geopolitics', 'economics', 'defense', 'climate', 'technology', 'society', 'general')),

    -- Geographic mapping
    state_id INTEGER REFERENCES states(id),
    district_id INTEGER REFERENCES districts(id),
    constituency_id INTEGER REFERENCES constituencies(id),
    ward_id INTEGER REFERENCES wards(id),
    geo_confidence TEXT CHECK (geo_confidence IN ('exact', 'inferred', 'estimated', 'unknown')),

    -- Metadata
    urgency_score REAL DEFAULT 0 CHECK (urgency_score BETWEEN 0 AND 1),
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of UUID REFERENCES sentiment_entries(id),

    -- Timestamps
    published_at TIMESTAMPTZ,
    ingested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ============================================================
-- KNOWLEDGE GRAPH - ENTITIES
-- ============================================================

CREATE TABLE IF NOT EXISTS entities (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'organization', 'location', 'event', 'policy', 'technology', 'infrastructure', 'concept','other')),
    description TEXT,
    aliases TEXT[] DEFAULT '{}',  -- alternate names for entity linking
    metadata JSONB DEFAULT '{}',  -- flexible storage for type-specific fields
    sentiment_score FLOAT,  -- aggregate sentiment about this entity
    mention_count INT DEFAULT 0,
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- KNOWLEDGE GRAPH - ENTITY RELATIONSHIPS
-- ============================================================

CREATE TABLE IF NOT EXISTS entity_relationships (
    id BIGSERIAL PRIMARY KEY,
    source_entity_id BIGINT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    target_entity_id BIGINT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('supports', 'opposes', 'impacts', 'related_to', 'part_of', 'causes', 'mentioned_in', 'located_in')),
    strength FLOAT DEFAULT 1.0 CHECK (strength >= 0 AND strength <= 1.0),
    sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    context TEXT,  -- brief description of the relationship
    source_entry_id UUID REFERENCES sentiment_entries(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- KNOWLEDGE GRAPH - ENTITY MENTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS entity_mentions (
    id BIGSERIAL PRIMARY KEY,
    entity_id BIGINT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    entry_id UUID NOT NULL REFERENCES sentiment_entries(id) ON DELETE CASCADE,
    mention_context TEXT,  -- surrounding text where entity was found
    sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_id, entry_id)  -- one mention per entity per entry
);

-- ============================================================
-- MULTI-DOMAIN INTELLIGENCE SCORES
-- ============================================================

CREATE TABLE IF NOT EXISTS domain_intelligence (
    id BIGSERIAL PRIMARY KEY,
    domain TEXT NOT NULL CHECK (domain IN ('geopolitics', 'economics', 'defense', 'climate', 'technology', 'society')),
    scope TEXT NOT NULL CHECK (scope IN ('national', 'state', 'district')),
    scope_id INT,  -- state_id or district_id (null for national)
    risk_score FLOAT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1.0),
    sentiment_trend FLOAT CHECK (sentiment_trend >= -1 AND sentiment_trend <= 1),
    urgency_level TEXT NOT NULL CHECK (urgency_level IN ('low', 'moderate', 'high', 'critical')),
    key_factors TEXT[] DEFAULT '{}',
    entity_ids BIGINT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AGGREGATED SNAPSHOTS (pre-computed for fast dashboards)
-- ============================================================

CREATE TABLE IF NOT EXISTS sentiment_snapshots (
    id SERIAL PRIMARY KEY,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('national', 'state', 'district', 'constituency', 'ward')),
    scope_id INTEGER,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,

    total_entries INTEGER NOT NULL DEFAULT 0,
    positive_count INTEGER NOT NULL DEFAULT 0,
    negative_count INTEGER NOT NULL DEFAULT 0,
    neutral_count INTEGER NOT NULL DEFAULT 0,
    avg_sentiment_score REAL,

    top_topics JSONB,
    top_keywords JSONB,
    language_distribution JSONB,

    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ALERTS
-- ============================================================

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    alert_type TEXT NOT NULL CHECK (alert_type IN ('sentiment_spike', 'volume_spike', 'new_issue', 'urgency_high')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),

    scope_type TEXT NOT NULL,
    scope_id INTEGER,

    title TEXT NOT NULL,
    description TEXT NOT NULL,

    related_topic_id INTEGER REFERENCES topic_taxonomy(id),
    sentiment_shift REAL,
    volume_change REAL,

    sample_entries UUID[],

    is_read BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE,

    triggered_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AI POLICY BRIEFS
-- ============================================================

CREATE TABLE IF NOT EXISTS policy_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    scope_type TEXT NOT NULL,
    scope_id INTEGER,
    period TEXT NOT NULL,

    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    key_findings JSONB NOT NULL,
    recommendations JSONB NOT NULL,
    raw_stats JSONB NOT NULL,

    generated_by TEXT DEFAULT 'gemini-2.0-flash',
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SURVEY UPLOADS
-- ============================================================

CREATE TABLE IF NOT EXISTS survey_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by UUID,
    filename TEXT NOT NULL,
    row_count INTEGER,
    processed_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MIGRATIONS - ALTER EXISTING TABLES
-- ============================================================
-- Run these BEFORE creating indexes to ensure columns exist

-- Add domain column if sentiment_entries table already exists without it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sentiment_entries' AND column_name = 'domain'
    ) THEN
        ALTER TABLE sentiment_entries 
        ADD COLUMN domain TEXT CHECK (domain IN ('geopolitics', 'economics', 'defense', 'climate', 'technology', 'society', 'general'));
    END IF;
END $$;

-- ============================================================
-- INDEXES - SENTIMENT ENTRIES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_sentiment_entries_state ON sentiment_entries(state_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_entries_district ON sentiment_entries(district_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_entries_constituency ON sentiment_entries(constituency_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_entries_ward ON sentiment_entries(ward_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_entries_sentiment ON sentiment_entries(sentiment);
CREATE INDEX IF NOT EXISTS idx_sentiment_entries_topic ON sentiment_entries(primary_topic_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_entries_published ON sentiment_entries(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentiment_entries_source ON sentiment_entries(source);
CREATE INDEX IF NOT EXISTS idx_sentiment_entries_domain ON sentiment_entries(domain);

-- ============================================================
-- INDEXES - KNOWLEDGE GRAPH
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_mention_count ON entities(mention_count DESC);

CREATE INDEX IF NOT EXISTS idx_entity_relationships_source ON entity_relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_relationships_target ON entity_relationships(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_relationships_type ON entity_relationships(relationship_type);

CREATE INDEX IF NOT EXISTS idx_entity_mentions_entity ON entity_mentions(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_mentions_entry ON entity_mentions(entry_id);

CREATE INDEX IF NOT EXISTS idx_domain_intelligence_domain ON domain_intelligence(domain);
CREATE INDEX IF NOT EXISTS idx_domain_intelligence_scope ON domain_intelligence(scope, scope_id);
CREATE INDEX IF NOT EXISTS idx_domain_intelligence_computed ON domain_intelligence(computed_at DESC);

-- ============================================================
-- INDEXES - OTHER TABLES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_scope ON sentiment_snapshots(scope_type, scope_id, period_start);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Update function for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for entities table
DROP TRIGGER IF EXISTS update_entities_updated_at ON entities;
CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment entity mention count
CREATE OR REPLACE FUNCTION increment_entity_mentions()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE entities 
    SET mention_count = mention_count + 1,
        last_seen = NOW()
    WHERE id = NEW.entity_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-increment mention count
DROP TRIGGER IF EXISTS auto_increment_mentions ON entity_mentions;
CREATE TRIGGER auto_increment_mentions AFTER INSERT ON entity_mentions
    FOR EACH ROW EXECUTE FUNCTION increment_entity_mentions();

-- ============================================================
-- TABLE COMMENTS (Documentation)
-- ============================================================

COMMENT ON TABLE states IS 'Geographic hierarchy: Indian states';
COMMENT ON TABLE districts IS 'Geographic hierarchy: Districts within states';
COMMENT ON TABLE constituencies IS 'Geographic hierarchy: Parliamentary and assembly constituencies';
COMMENT ON TABLE wards IS 'Geographic hierarchy: Wards with booth information';
COMMENT ON TABLE topic_taxonomy IS 'Predefined topic categories with keywords for classification';
COMMENT ON TABLE sentiment_entries IS 'Core table: all ingested voices with NLP analysis and geo-mapping';
COMMENT ON TABLE entities IS 'Knowledge graph: entities (people, organizations, locations, events, policies)';
COMMENT ON TABLE entity_relationships IS 'Knowledge graph: relationships between entities (supports, opposes, impacts, etc.)';
COMMENT ON TABLE entity_mentions IS 'Knowledge graph: links entities to sentiment entries where they are mentioned';
COMMENT ON TABLE domain_intelligence IS 'Multi-domain intelligence scores (geopolitics, economics, defense, climate, tech, society)';
COMMENT ON TABLE sentiment_snapshots IS 'Pre-computed aggregated statistics for fast dashboard queries';
COMMENT ON TABLE alerts IS 'System-generated alerts for sentiment spikes, volume changes, and urgent issues';
COMMENT ON TABLE policy_briefs IS 'AI-generated policy briefs and recommendations';
COMMENT ON TABLE survey_uploads IS 'Tracks CSV/survey file uploads and processing status';

COMMENT ON COLUMN sentiment_entries.domain IS 'Intelligence domain category (geopolitics, economics, defense, climate, technology, society, general)';
COMMENT ON COLUMN sentiment_entries.source IS 'Data source: twitter, news, reddit, survey, csv, manual';
COMMENT ON COLUMN sentiment_entries.source_id IS 'Stable identifier from source for deduplication';
COMMENT ON COLUMN sentiment_entries.urgency_score IS 'AI-computed urgency level (0=low, 1=critical)';
COMMENT ON COLUMN entities.aliases IS 'Alternate names for entity matching and linking';
COMMENT ON COLUMN entities.sentiment_score IS 'Weighted average sentiment about this entity';
COMMENT ON COLUMN entity_relationships.strength IS 'Relationship strength (0.0-1.0), increases with multiple mentions';

-- Update the demo user's role to admin
UPDATE auth.users 
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'admin@jananaadi.demo';

-- Verify it worked
SELECT email, raw_app_meta_data->'role' as role 
FROM auth.users 
WHERE email = 'admin@jananaadi.demo';

-- Step 1: Drop the old constraint that only allows specific relationship types
ALTER TABLE entity_relationships
    DROP CONSTRAINT IF EXISTS entity_relationships_relationship_type_check;
 
-- Step 2: Add the new constraint with cross_domain_impact included
ALTER TABLE entity_relationships
    ADD CONSTRAINT entity_relationships_relationship_type_check
    CHECK (relationship_type IN (
        'supports',
        'opposes',
        'impacts',
        'related_to',
        'part_of',
        'causes',
        'mentioned_in',
        'located_in',
        'cross_domain_impact'   -- NEW: cross-domain co-occurrence edge
    ));
 
-- Step 3: Add metadata column to entity_relationships (stores domain_a, domain_b info)
-- Only runs if column doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'entity_relationships' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE entity_relationships ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;
 
-- Step 4: Index for fast cross-domain queries
CREATE INDEX IF NOT EXISTS idx_entity_relationships_cross_domain
    ON entity_relationships(relationship_type)
    WHERE relationship_type = 'cross_domain_impact';
 
-- Step 5: Index on metadata for domain filtering
CREATE INDEX IF NOT EXISTS idx_entity_relationships_metadata
    ON entity_relationships USING GIN(metadata);
-- Add text_hash column and populate it from existing data
ALTER TABLE sentiment_entries 
ADD COLUMN IF NOT EXISTS text_hash TEXT;

-- Index it so the lookup is fast
CREATE INDEX IF NOT EXISTS idx_sentiment_entries_text_hash 
ON sentiment_entries(text_hash);

-- Populate existing rows (md5 of first 500 chars of cleaned_text)
UPDATE sentiment_entries 
SET text_hash = md5(left(cleaned_text, 500))
WHERE text_hash IS NULL;
-- 
-- ============================================================
-- COMPLETE! Database schema ready for JanaNaadi
-- Global Ontology Engine + Sentiment Intelligence Platform
-- ============================================================

-- Next steps:
-- 1. Populate states, districts, constituencies, wards with India's geographic data
-- 2. Populate topic_taxonomy with your topic categories
-- 3. Start ingesting data via /api/ingest endpoints
-- 4. Entity extraction will auto-populate entities, entity_relationships, entity_mentions
-- 5. Compute domain intelligence via /api/ontology/domain/{domain}/compute
