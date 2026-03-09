"""Pydantic schemas for request/response models."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


# ── Geographic Models ─────────────────────────────────────────

class StateOut(BaseModel):
    id: int
    name: str
    code: str


class DistrictOut(BaseModel):
    id: int
    state_id: int
    name: str


class ConstituencyOut(BaseModel):
    id: int
    district_id: int
    name: str
    type: str
    lat: float | None = None
    lng: float | None = None


class WardOut(BaseModel):
    id: int
    constituency_id: int
    name: str
    lat: float | None = None
    lng: float | None = None


# ── Topic Taxonomy ────────────────────────────────────────────

class TopicOut(BaseModel):
    id: int
    name: str
    category: str
    icon: str | None = None


# ── Sentiment Entry ───────────────────────────────────────────

class SentimentEntryOut(BaseModel):
    id: UUID
    source: str
    source_url: str | None = None
    original_text: str
    cleaned_text: str
    language: str
    translated_text: str | None = None
    sentiment: str
    sentiment_score: float
    confidence: float
    primary_topic_id: int | None = None
    extracted_keywords: list[str] | None = None
    state_id: int | None = None
    district_id: int | None = None
    constituency_id: int | None = None
    ward_id: int | None = None
    geo_confidence: str | None = None
    urgency_score: float = 0
    published_at: datetime | None = None
    ingested_at: datetime | None = None


class SentimentEntryBrief(BaseModel):
    id: UUID
    text: str
    sentiment: str
    sentiment_score: float
    topic: str | None = None
    location: str | None = None
    date: datetime | None = None


# ── Heatmap ───────────────────────────────────────────────────

class HeatmapPoint(BaseModel):
    id: int
    name: str
    code: str | None = None
    lat: float
    lng: float
    avg_sentiment: float
    volume: int
    urgency_score: float = 0.0
    dominant_topic: str | None = None
    positive_count: int = 0
    negative_count: int = 0
    neutral_count: int = 0


# ── National Pulse ────────────────────────────────────────────

class NationalPulse(BaseModel):
    avg_sentiment: float
    total_entries_24h: int
    positive_count: int = 0
    negative_count: int = 0
    neutral_count: int = 0
    top_3_issues: list[dict]
    top_3_positive: list[dict]
    language_breakdown: dict[str, int]


class StateRanking(BaseModel):
    state_id: int
    state: str
    state_code: str
    avg_sentiment: float
    volume: int
    top_issue: str | None = None


class TrendingTopic(BaseModel):
    topic: str
    mention_count: int
    sentiment_trend: float
    seven_day_change: float


# ── Analysis / Drill-down ─────────────────────────────────────

class SentimentDistribution(BaseModel):
    positive: int
    negative: int
    neutral: int
    total: int


class RegionAnalysis(BaseModel):
    name: str
    sentiment_distribution: SentimentDistribution
    avg_sentiment: float
    topic_breakdown: list[dict]
    language_breakdown: dict[str, int]
    source_distribution: dict[str, int]
    trend_7d: list[dict] | None = None
    trend_30d: list[dict] | None = None
    recent_entries: list[SentimentEntryBrief] = []


# ── Trends ────────────────────────────────────────────────────

class SentimentTrendPoint(BaseModel):
    date: str
    positive_pct: float
    negative_pct: float
    neutral_pct: float
    volume: int


class TopicTrendPoint(BaseModel):
    date: str
    topic: str
    mention_count: int


class ComparisonItem(BaseModel):
    id: int
    name: str
    avg_sentiment: float
    top_issue: str | None = None
    volume: int = 0
    positive: int = 0
    negative: int = 0
    neutral: int = 0
    top_topics: list[str] = []
    urgency_score: float = 0.0


# ── Alerts ────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: UUID
    alert_type: str
    severity: str
    scope_type: str
    scope_id: int | None = None
    title: str
    description: str
    related_topic_id: int | None = None
    sentiment_shift: float | None = None
    volume_change: float | None = None
    is_read: bool = False
    is_resolved: bool = False
    triggered_at: datetime | None = None


# ── Policy Briefs ─────────────────────────────────────────────

class BriefSummary(BaseModel):
    id: UUID
    title: str
    scope_type: str
    scope_id: int | None = None
    scope_name: str | None = None
    period: str
    summary: str
    generated_at: datetime | None = None


class BriefDetail(BriefSummary):
    key_findings: list[dict]
    recommendations: list[dict]
    raw_stats: dict


class BriefGenerateRequest(BaseModel):
    scope_type: str
    scope_id: int | None = None
    period: str = "weekly"


# ── Ingestion ─────────────────────────────────────────────────

class IngestStatus(BaseModel):
    twitter_last_run: datetime | None = None
    news_last_run: datetime | None = None
    twitter_last_count: int | None = None
    news_last_count: int | None = None
    total_today: int = 0
    queue_size: int = 0


class ManualEntryRequest(BaseModel):
    text: str = Field(..., min_length=5, max_length=5000)
    source: str = "manual"
    location_hint: str | None = None
    language: str | None = None


class CSVUploadResponse(BaseModel):
    upload_id: UUID
    filename: str
    row_count: int
    status: str


# ── NLP ───────────────────────────────────────────────────────

class NLPAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=5000)


class NLPAnalysisResult(BaseModel):
    sentiment: str
    sentiment_score: float
    confidence: float
    topics: list[str]
    keywords: list[str]
    language: str
    language_name: str
    translation: str | None = None
    urgency: float = 0


class NLPBatchRequest(BaseModel):
    entries: list[dict]


class GeolocateRequest(BaseModel):
    text: str
    hints: dict | None = None


class GeolocateResult(BaseModel):
    state: str | None = None
    district: str | None = None
    constituency: str | None = None
    ward: str | None = None
    confidence: str = "unknown"


# ── Search ────────────────────────────────────────────────────

class SearchParams(BaseModel):
    q: str = ""
    state: str | None = None
    district: str | None = None
    constituency: str | None = None
    sentiment: str | None = None
    topic: str | None = None
    source: str | None = None
    language: str | None = None
    limit: int = Field(default=50, le=200)
    offset: int = 0


# ── Admin Stats ───────────────────────────────────────────────

class AdminStats(BaseModel):
    total_entries: int
    entries_today: int
    sources_active: int
    avg_processing_time_ms: float | None = None
    alert_count: int
