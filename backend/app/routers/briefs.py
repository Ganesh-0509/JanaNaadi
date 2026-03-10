"""AI Policy Brief endpoints — admin only."""

from fastapi import APIRouter, Depends, Query, Path, Request
from app.core.auth import require_admin
from app.core.supabase_client import get_supabase_admin
from app.core.rate_limiter import limiter
from app.services.brief_generator import generate_brief
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
