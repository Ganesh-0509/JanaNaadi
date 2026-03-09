-- JanaNaadi Database Schema
-- India's Real-Time Public Sentiment Intelligence Platform

-- ============================================================
-- GEOGRAPHIC HIERARCHY (pre-loaded, India's democratic geography)
-- ============================================================

CREATE TABLE states (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL  -- e.g., 'TN', 'DL', 'MH'
);

CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    state_id INTEGER REFERENCES states(id),
    name TEXT NOT NULL
);

CREATE TABLE constituencies (
    id SERIAL PRIMARY KEY,
    district_id INTEGER REFERENCES districts(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('parliamentary', 'assembly')),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION
);

CREATE TABLE wards (
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

CREATE TABLE topic_taxonomy (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    keywords JSONB NOT NULL,
    icon TEXT
);

-- ============================================================
-- CORE SENTIMENT DATA
-- ============================================================

CREATE TABLE sentiment_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source info (survey includes anonymous citizen voice submissions)
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
-- AGGREGATED SNAPSHOTS (pre-computed for fast dashboards)
-- ============================================================

CREATE TABLE sentiment_snapshots (
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

CREATE TABLE alerts (
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

CREATE TABLE policy_briefs (
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

CREATE TABLE survey_uploads (
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
-- INDEXES
-- ============================================================

CREATE INDEX idx_sentiment_entries_state ON sentiment_entries(state_id);
CREATE INDEX idx_sentiment_entries_district ON sentiment_entries(district_id);
CREATE INDEX idx_sentiment_entries_constituency ON sentiment_entries(constituency_id);
CREATE INDEX idx_sentiment_entries_ward ON sentiment_entries(ward_id);
CREATE INDEX idx_sentiment_entries_sentiment ON sentiment_entries(sentiment);
CREATE INDEX idx_sentiment_entries_topic ON sentiment_entries(primary_topic_id);
CREATE INDEX idx_sentiment_entries_published ON sentiment_entries(published_at DESC);
CREATE INDEX idx_sentiment_entries_source ON sentiment_entries(source);
CREATE INDEX idx_alerts_severity ON alerts(severity, triggered_at DESC);
CREATE INDEX idx_snapshots_scope ON sentiment_snapshots(scope_type, scope_id, period_start);
