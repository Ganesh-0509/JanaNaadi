"""AI Policy Brief endpoints — admin only."""

from fastapi import APIRouter, Depends, Query, Path, Request
from app.core.auth import require_admin
from app.core.supabase_client import get_supabase_admin
from app.core.rate_limiter import limiter
from app.services.brief_generator import generate_brief
from app.services.policy_recommendation_engine import (
    generate_policy_recommendations,
    batch_generate_recommendations,
    get_recommendations_for_brief
)
from app.models.schemas import BriefSummary, BriefDetail, BriefGenerateRequest

router = APIRouter(prefix="/api/briefs", tags=["briefs"])


@router.post("/generate", response_model=BriefDetail)
@limiter.limit("5/minute")  # Rate limit: Brief generation is very expensive
async def generate_new_brief(
    request: Request,
    req: BriefGenerateRequest,
    user: dict = Depends(require_admin),
):
    """Generate a new AI policy brief.
    
    Rate limited to 5 requests/minute - this is a very expensive AI operation.
    """
    result = await generate_brief(req.scope_type, req.scope_id, req.period)
    return BriefDetail(**result)


@router.get("", response_model=list[BriefSummary])
async def list_briefs(
    scope: str | None = Query(None),
    id: int | None = Query(None, alias="scope_id"),
    limit: int = Query(20, le=100),
    user: dict = Depends(require_admin),
):
    """List generated policy briefs."""
    sb = get_supabase_admin()
    query = sb.table("policy_briefs").select(
        "id, title, scope_type, scope_id, period, summary, generated_at"
    )
    if scope:
        query = query.eq("scope_type", scope)
    if id:
        query = query.eq("scope_id", id)

    result = query.order("generated_at", desc=True).limit(limit).execute()

    # Resolve scope_id → scope_name for each brief
    scope_tables = {"state": "states", "district": "districts", "constituency": "constituencies", "ward": "wards"}
    briefs = []
    for b in result.data or []:
        scope_name = None
        if b.get("scope_id") and b.get("scope_type") in scope_tables:
            tbl = scope_tables[b["scope_type"]]
            row = sb.table(tbl).select("name").eq("id", b["scope_id"]).limit(1).execute()
            scope_name = row.data[0]["name"] if row.data else None
        briefs.append(BriefSummary(**b, scope_name=scope_name))
    return briefs


@router.get("/{brief_id}", response_model=BriefDetail)
async def get_brief(
    brief_id: str = Path(...),
    user: dict = Depends(require_admin),
):
    """Get full details of a policy brief."""
    sb = get_supabase_admin()
    result = sb.table("policy_briefs").select("*").eq("id", brief_id).limit(1).execute()
    if not result.data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Brief not found")
    return BriefDetail(**result.data[0])


# ==================== POLICY RECOMMENDATION ENDPOINTS ====================


@router.post("/{brief_id}/recommendations")
@limiter.limit("30/minute")
async def get_brief_recommendations(
    request: Request,
    brief_id: str = Path(...),
    user: dict = Depends(require_admin),
):
    """Generate policy recommendations for a brief.
    
    Analyzes brief key findings and generates 3-5 specific, actionable recommendations
    with priority levels and reasoning.
    
    Returns:
    {
        "insight_summary": str,
        "severity": "critical|high|moderate|low",
        "confidence": float (0-1),
        "sentiment": {negative, positive, neutral},
        "chain_depth": int,
        "reasoning_type": "direct|multi_hop",
        "evidence_count": int,
        "recommended_actions": [
            {
                "action": str (specific action),
                "priority": "HIGH|MEDIUM|LOW",
                "reason": str (why this action),
                "departments": [str] (responsible departments),
                "confidence": float
            }
        ]
    }
    """
    return await get_recommendations_for_brief(entry_id=brief_id, brief_id=brief_id)


@router.post("/recommendations/generate")
@limiter.limit("30/minute")
async def generate_recommendations_from_insight(
    request: Request,
    insight: str = Query(...),
    confidence: float = Query(..., ge=0, le=1),
    domains: list[str] = Query(...),
    negative_sentiment: float = Query(default=50, ge=0, le=100),
    positive_sentiment: float = Query(default=25, ge=0, le=100),
    neutral_sentiment: float = Query(default=25, ge=0, le=100),
    relationship_type: str | None = Query(None),
    chain_depth: int = Query(default=1, ge=1, le=3),
    user: dict = Depends(require_admin),
):
    """Generate policy recommendations from a direct insight.
    
    Accepts insight details and generates actionable recommendations.
    
    Query Parameters:
    - insight: Human-readable insight (e.g., "Flooding affects economy")
    - confidence: Confidence score (0-1)
    - domains: List of domains (e.g., climate, economics, society)
    - negative_sentiment: % negative sentiment (0-100)
    - positive_sentiment: % positive sentiment (0-100)
    - neutral_sentiment: % neutral sentiment (0-100)
    - relationship_type: Type of relationship (optional, e.g., "affects", "impacts")
    - chain_depth: Depth of reasoning (1=direct, 2+=multi-hop)
    
    Returns:
    {
        "insight_summary": str,
        "severity": "critical|high|moderate|low",
        "confidence": float,
        "sentiment": {dict},
        "chain_depth": int,
        "reasoning_type": "direct|multi_hop",
        "evidence_count": int,
        "recommended_actions": [...]
    }
    """
    return await generate_policy_recommendations(
        insight=insight,
        confidence=confidence,
        domains=domains,
        evidence_texts=[],
        sentiment={
            "negative": negative_sentiment,
            "positive": positive_sentiment,
            "neutral": neutral_sentiment
        },
        relationship_type=relationship_type,
        chain_depth=chain_depth
    )


@router.post("/recommendations/batch")
@limiter.limit("10/minute")
async def batch_recommendations(
    request: Request,
    insights: list[dict] = None,
    user: dict = Depends(require_admin),
):
    """Generate recommendations for multiple insights in parallel.
    
    Request Body (JSON):
    [
        {
            "insight": "Flooding affects economy",
            "confidence": 0.75,
            "domains": ["climate", "economics"],
            "evidence_texts": ["...", "..."],
            "sentiment": {
                "negative": 65,
                "positive": 15,
                "neutral": 20
            }
        },
        ...
    ]
    
    Returns:
    [
        {full recommendation object},
        ...
    ]
    """
    if not insights:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="insights list required")
    
    return await batch_generate_recommendations(insights)
