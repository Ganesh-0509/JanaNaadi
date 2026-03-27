"""Delhi incident and chain-effect API."""

from fastapi import APIRouter, HTTPException, Query

from app.core.supabase_client import get_supabase_admin
from app.services.incident_engine import detect_incidents_in_delhi, get_incident_chain

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.get("/delhi")
async def list_delhi_incidents(
    status: str | None = Query(None),
    severity: str | None = Query(None),
    ward_id: int | None = Query(None),
    district_id: int | None = Query(None),
    limit: int = Query(50, le=200),
):
    """List incidents for Delhi, with optional filters."""
    sb = get_supabase_admin()

    query = sb.table("incidents").select("*").order("detected_at", desc=True).limit(limit)
    if status:
        query = query.eq("status", status)
    if severity:
        query = query.eq("severity", severity)
    if ward_id:
        query = query.eq("ward_id", ward_id)

    incidents = query.execute().data or []
    if not incidents:
        return []

    ward_ids = sorted({i.get("ward_id") for i in incidents if i.get("ward_id")})
    const_ids = sorted({i.get("constituency_id") for i in incidents if i.get("constituency_id")})

    ward_map: dict[int, dict] = {}
    const_map: dict[int, dict] = {}

    if ward_ids:
        wards = sb.table("wards").select("id,name,lat,lng,constituency_id").in_("id", ward_ids).execute().data or []
        ward_map = {w["id"]: w for w in wards if w.get("id")}

    if const_ids:
        constituencies = (
            sb.table("constituencies").select("id,name,district_id").in_("id", const_ids).execute().data or []
        )
        const_map = {c["id"]: c for c in constituencies if c.get("id")}

    district_map: dict[int, dict] = {}
    district_ids = sorted({c.get("district_id") for c in const_map.values() if c.get("district_id")})
    if district_ids:
        districts = sb.table("districts").select("id,name,state_id").in_("id", district_ids).execute().data or []
        district_map = {d["id"]: d for d in districts if d.get("id")}

    rows = []
    for incident in incidents:
        ward = ward_map.get(incident.get("ward_id"))
        constituency = const_map.get(incident.get("constituency_id") or (ward or {}).get("constituency_id"))
        district = district_map.get((constituency or {}).get("district_id"))

        if district_id and (district or {}).get("id") != district_id:
            continue

        rows.append(
            {
                **incident,
                "ward": {
                    "id": (ward or {}).get("id"),
                    "name": (ward or {}).get("name"),
                    "lat": (ward or {}).get("lat"),
                    "lng": (ward or {}).get("lng"),
                }
                if ward
                else None,
                "constituency": {
                    "id": (constituency or {}).get("id"),
                    "name": (constituency or {}).get("name"),
                    "district_id": (constituency or {}).get("district_id"),
                }
                if constituency
                else None,
                "district": district,
            }
        )

    return rows


@router.get("/delhi/{incident_id}/chain")
async def get_chain(incident_id: str):
    """Get full chain tree for one incident."""
    chain = await get_incident_chain(incident_id)
    if not chain:
        raise HTTPException(status_code=404, detail="Incident not found")
    return chain


@router.get("/delhi/ward/{ward_id}")
async def ward_incidents(ward_id: int, limit: int = Query(20, le=100)):
    """Get incidents affecting a specific ward."""
    sb = get_supabase_admin()
    result = (
        sb.table("incidents")
        .select("*")
        .eq("ward_id", ward_id)
        .order("detected_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


@router.post("/delhi/detect")
async def trigger_incident_detection():
    """Manually run incident detection for Delhi wards."""
    incidents = await detect_incidents_in_delhi()
    return {
        "detected": len(incidents),
        "incidents": [{"id": i.get("id"), "title": i.get("title"), "ward_id": i.get("ward_id")} for i in incidents],
    }


@router.get("/delhi/chain-map")
async def get_chain_map(limit: int = Query(100, le=400)):
    """Return nodes and edges for graph/map rendering."""
    sb = get_supabase_admin()

    incidents = (
        sb.table("incidents")
        .select("id,title,incident_type,severity,ward_id,chain_depth,detected_at,status")
        .eq("status", "active")
        .order("detected_at", desc=True)
        .limit(limit)
        .execute()
        .data
        or []
    )

    if not incidents:
        return {"nodes": [], "edges": [], "total_incidents": 0, "total_chain_links": 0}

    ward_ids = sorted({row.get("ward_id") for row in incidents if row.get("ward_id")})
    wards = []
    if ward_ids:
        wards = sb.table("wards").select("id,name,lat,lng").in_("id", ward_ids).execute().data or []
    ward_map = {w["id"]: w for w in wards if w.get("id")}

    nodes = []
    active_ids = set()
    for row in incidents:
        ward = ward_map.get(row.get("ward_id"))
        node = {
            **row,
            "ward": {
                "id": (ward or {}).get("id"),
                "name": (ward or {}).get("name"),
                "lat": (ward or {}).get("lat"),
                "lng": (ward or {}).get("lng"),
            }
            if ward
            else None,
        }
        nodes.append(node)
        if row.get("id"):
            active_ids.add(row["id"])

    chain_rows = sb.table("incident_chain_effects").select("*").execute().data or []
    edges = [
        row
        for row in chain_rows
        if row.get("cause_incident_id") in active_ids and row.get("effect_incident_id") in active_ids
    ]

    return {
        "nodes": nodes,
        "edges": edges,
        "total_incidents": len(nodes),
        "total_chain_links": len(edges),
    }


@router.get("/delhi/stats")
async def delhi_incident_stats():
    """Aggregate Delhi incident statistics."""
    sb = get_supabase_admin()
    incidents = sb.table("incidents").select("incident_type,severity,chain_depth,status,ward_id").execute().data or []

    if not incidents:
        return {
            "total": 0,
            "active": 0,
            "by_type": {},
            "by_severity": {},
            "by_district": {},
            "avg_chain_depth": 0.0,
            "max_chain_depth": 0,
        }

    ward_ids = sorted({i.get("ward_id") for i in incidents if i.get("ward_id")})
    ward_rows = (
        sb.table("wards").select("id,constituency_id").in_("id", ward_ids).execute().data
        if ward_ids
        else []
    ) or []
    ward_map = {w["id"]: w for w in ward_rows if w.get("id")}

    const_ids = sorted({w.get("constituency_id") for w in ward_rows if w.get("constituency_id")})
    const_rows = (
        sb.table("constituencies").select("id,district_id").in_("id", const_ids).execute().data
        if const_ids
        else []
    ) or []
    const_map = {c["id"]: c for c in const_rows if c.get("id")}

    by_type: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    by_district: dict[int, int] = {}
    chain_depths: list[int] = []

    for incident in incidents:
        incident_type = incident.get("incident_type")
        severity = incident.get("severity")
        depth = int(incident.get("chain_depth") or 0)

        if incident_type:
            by_type[incident_type] = by_type.get(incident_type, 0) + 1
        if severity:
            by_severity[severity] = by_severity.get(severity, 0) + 1
        chain_depths.append(depth)

        ward = ward_map.get(incident.get("ward_id"))
        constituency = const_map.get((ward or {}).get("constituency_id"))
        district = (constituency or {}).get("district_id")
        if district:
            by_district[district] = by_district.get(district, 0) + 1

    return {
        "total": len(incidents),
        "active": sum(1 for i in incidents if i.get("status") == "active"),
        "by_type": by_type,
        "by_severity": by_severity,
        "by_district": by_district,
        "avg_chain_depth": sum(chain_depths) / max(len(chain_depths), 1),
        "max_chain_depth": max(chain_depths, default=0),
    }
