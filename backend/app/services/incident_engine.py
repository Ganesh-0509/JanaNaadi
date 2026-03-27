"""Incident detection and chain-effect engine for Delhi ward intelligence."""

import asyncio
import logging
import math
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.core.supabase_client import get_supabase_admin
from app.services.local_llm_service import generate_json

logger = logging.getLogger("jananaadi.incident_engine")

ADJACENCY_RADIUS_KM = 2.0
MAX_CHAIN_DEPTH = 5

INCIDENT_CLASSIFICATION_PROMPT = """
You are analyzing a news/sentiment report about an incident in Delhi, India.

Text: "{text}"
Ward/Area: "{location}"

Classify this incident and return ONLY valid JSON:
{{
  "incident_type": "one of: infrastructure_failure, public_safety, environmental, civic_disruption, health, economic, political",
  "sub_type": "specific sub-type like: water_burst, road_collapse, power_outage, flooding, pollution_spike, riot, crime_spike, protest, fire, accident",
  "severity": "one of: low, moderate, high, critical",
  "title": "short 5-8 word incident title",
  "description": "2 sentence description of the incident",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "confidence": 0.0
}}
"""

CHAIN_EFFECT_ANALYSIS_PROMPT = """
You are an urban intelligence analyst for Delhi, India.

An incident has occurred:
- Type: {incident_type} ({sub_type})
- Location: {ward_name}, {constituency_name}, {district_name}
- Severity: {severity}
- Description: {description}

Nearby wards (within {radius_km}km):
{nearby_wards}

Analyze what chain effects this incident will likely cause in nearby wards.
Return ONLY valid JSON:
{{
  "chain_effects": [
    {{
      "target_ward_name": "exact ward name from nearby list",
      "effect_type": "one of: infrastructure_failure, public_safety, environmental, civic_disruption, health, economic",
      "causal_mechanism": "specific reason this ward is affected",
      "probability": 0.0,
      "estimated_delay_hours": 0.0,
      "severity": "one of: low, moderate, high, critical",
      "description": "1 sentence describing the expected effect"
    }}
  ]
}}
"""


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance in km between two latitude/longitude points."""
    earth_radius_km = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return earth_radius_km * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _flatten_chain(entries: list[dict]) -> list[dict]:
    flat: list[dict] = []
    for entry in entries:
        flat.append(entry)
        downstream = entry.get("downstream") or []
        if downstream:
            flat.extend(_flatten_chain(downstream))
    return flat


async def detect_incidents_in_delhi() -> list[dict]:
    """Detect incident candidates from recent negative sentiment in Delhi wards."""
    sb = get_supabase_admin()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()

    wards_result = await asyncio.to_thread(
        lambda: sb.table("wards").select("id,name,constituency_id,lat,lng").execute()
    )
    wards = [w for w in (wards_result.data or []) if w.get("id")]
    if not wards:
        logger.warning("No wards available; run Delhi seeding first")
        return []

    ward_ids = [w["id"] for w in wards]
    entries_result = await asyncio.to_thread(
        lambda: sb.table("sentiment_entries")
        .select("id,ward_id,cleaned_text,sentiment,urgency_score,extracted_keywords,ingested_at")
        .in_("ward_id", ward_ids)
        .eq("sentiment", "negative")
        .gte("ingested_at", cutoff)
        .execute()
    )

    by_ward: dict[int, list[dict]] = {}
    for entry in entries_result.data or []:
        ward_id = entry.get("ward_id")
        if ward_id:
            by_ward.setdefault(ward_id, []).append(entry)

    incidents_created: list[dict] = []
    ward_lookup = {w["id"]: w for w in wards}

    for ward_id, ward_entries in by_ward.items():
        if len(ward_entries) < 2:
            continue

        avg_urgency = sum(_safe_float(e.get("urgency_score")) for e in ward_entries) / len(ward_entries)
        if avg_urgency < 0.4:
            continue

        recent_incident = await asyncio.to_thread(
            lambda: sb.table("incidents")
            .select("id")
            .eq("ward_id", ward_id)
            .gte("detected_at", (datetime.now(timezone.utc) - timedelta(hours=4)).isoformat())
            .limit(1)
            .execute()
        )
        if recent_incident.data:
            continue

        ward_info = ward_lookup.get(ward_id, {})
        ward_name = ward_info.get("name", f"Ward {ward_id}")
        combined_text = " ".join((e.get("cleaned_text") or "")[:240] for e in ward_entries[:3]).strip()

        if not combined_text:
            continue

        prompt = INCIDENT_CLASSIFICATION_PROMPT.format(text=combined_text[:1200], location=ward_name)
        try:
            classification = await generate_json(prompt)
        except Exception as exc:
            logger.error("Incident classification failed for ward %s: %s", ward_id, exc)
            continue

        if _safe_float(classification.get("confidence")) < 0.4:
            continue

        incident = {
            "id": str(uuid4()),
            "ward_id": ward_id,
            "constituency_id": ward_info.get("constituency_id"),
            "incident_type": classification.get("incident_type", "civic_disruption"),
            "title": classification.get("title", "Incident detected"),
            "description": classification.get("description", ""),
            "severity": classification.get("severity", "moderate"),
            "source_entry_ids": [e.get("id") for e in ward_entries if e.get("id")],
            "keywords": classification.get("keywords", []),
            "status": "active",
            "chain_depth": 0,
            "detected_at": datetime.now(timezone.utc).isoformat(),
        }

        created = await asyncio.to_thread(lambda: sb.table("incidents").insert(incident).execute())
        if not created.data:
            continue

        created_incident = created.data[0]
        incidents_created.append(created_incident)

        try:
            await compute_chain_effects(created_incident)
        except Exception as exc:
            logger.error("Chain effect computation failed for incident %s: %s", created_incident.get("id"), exc)

    return incidents_created


async def compute_chain_effects(incident: dict) -> list[dict]:
    """Create downstream incidents and chain links for a root incident."""
    sb = get_supabase_admin()
    ward_id = incident.get("ward_id")
    if not ward_id:
        return []

    origin_result = await asyncio.to_thread(
        lambda: sb.table("wards").select("id,name,lat,lng,constituency_id").eq("id", ward_id).limit(1).execute()
    )
    if not origin_result.data:
        return []

    origin = origin_result.data[0]
    if origin.get("lat") is None or origin.get("lng") is None:
        return []

    all_wards_result = await asyncio.to_thread(
        lambda: sb.table("wards").select("id,name,lat,lng,constituency_id").execute()
    )
    all_wards = all_wards_result.data or []

    radius_km = 5.0
    nearby = []
    for ward in all_wards:
        if ward.get("id") == origin.get("id"):
            continue
        if ward.get("lat") is None or ward.get("lng") is None:
            continue
        distance = haversine_km(origin["lat"], origin["lng"], ward["lat"], ward["lng"])
        if distance <= radius_km:
            nearby.append({**ward, "distance_km": round(distance, 2)})

    if not nearby:
        return []

    nearby.sort(key=lambda item: item["distance_km"])

    constituency_name = "Unknown"
    district_name = "Delhi"
    constituency_id = origin.get("constituency_id")
    if constituency_id:
        constituency_result = await asyncio.to_thread(
            lambda: sb.table("constituencies").select("id,name,district_id").eq("id", constituency_id).limit(1).execute()
        )
        if constituency_result.data:
            constituency_name = constituency_result.data[0].get("name", constituency_name)
            district_id = constituency_result.data[0].get("district_id")
            if district_id:
                district_result = await asyncio.to_thread(
                    lambda: sb.table("districts").select("name").eq("id", district_id).limit(1).execute()
                )
                if district_result.data:
                    district_name = district_result.data[0].get("name", district_name)

    nearby_list = "\n".join(f"- {w['name']} ({w['distance_km']}km away)" for w in nearby[:12])
    sub_type = "unknown"
    keywords = incident.get("keywords") or []
    if keywords:
        sub_type = str(keywords[0])

    prompt = CHAIN_EFFECT_ANALYSIS_PROMPT.format(
        incident_type=incident.get("incident_type", "civic_disruption"),
        sub_type=sub_type,
        ward_name=origin.get("name", "Unknown"),
        constituency_name=constituency_name,
        district_name=district_name,
        severity=incident.get("severity", "moderate"),
        description=incident.get("description", ""),
        radius_km=radius_km,
        nearby_wards=nearby_list,
    )

    try:
        analysis = await generate_json(prompt)
    except Exception as exc:
        logger.error("Chain analysis failed for incident %s: %s", incident.get("id"), exc)
        return []

    by_name = {w["name"].lower(): w for w in nearby}
    links: list[dict] = []

    for effect in analysis.get("chain_effects", []):
        target_name = str(effect.get("target_ward_name", "")).strip().lower()
        if not target_name:
            continue

        target_ward = by_name.get(target_name)
        if not target_ward:
            for name, row in by_name.items():
                if target_name in name or name in target_name:
                    target_ward = row
                    break

        if not target_ward:
            continue

        probability = _safe_float(effect.get("probability"), 0.0)
        if probability < 0.3:
            continue

        duplicate_check = await asyncio.to_thread(
            lambda: sb.table("incidents")
            .select("id")
            .eq("parent_incident_id", incident.get("id"))
            .eq("ward_id", target_ward["id"])
            .eq("incident_type", effect.get("effect_type", "civic_disruption"))
            .limit(1)
            .execute()
        )
        if duplicate_check.data:
            continue

        downstream = {
            "id": str(uuid4()),
            "ward_id": target_ward["id"],
            "constituency_id": target_ward.get("constituency_id"),
            "incident_type": effect.get("effect_type", "civic_disruption"),
            "title": f"[Chain Effect] {str(effect.get('causal_mechanism', 'spillover')).replace('_', ' ').title()}",
            "description": effect.get("description", ""),
            "severity": effect.get("severity", "low"),
            "status": "active",
            "parent_incident_id": incident.get("id"),
            "chain_depth": int(incident.get("chain_depth", 0)) + 1,
            "detected_at": datetime.now(timezone.utc).isoformat(),
        }

        downstream_result = await asyncio.to_thread(lambda: sb.table("incidents").insert(downstream).execute())
        if not downstream_result.data:
            continue

        downstream_id = downstream_result.data[0].get("id")
        link = {
            "id": str(uuid4()),
            "cause_incident_id": incident.get("id"),
            "effect_incident_id": downstream_id,
            "causal_mechanism": effect.get("causal_mechanism", "spillover"),
            "confidence": probability,
            "distance_km": target_ward.get("distance_km"),
            "cause_domain": incident.get("incident_type"),
            "effect_domain": effect.get("effect_type", "civic_disruption"),
        }

        await asyncio.to_thread(lambda: sb.table("incident_chain_effects").insert(link).execute())
        links.append(link)

    return links


async def get_incident_chain(incident_id: str) -> dict:
    """Return root incident and downstream chain tree."""
    sb = get_supabase_admin()

    root_result = await asyncio.to_thread(
        lambda: sb.table("incidents").select("*").eq("id", incident_id).limit(1).execute()
    )
    if not root_result.data:
        return {}

    root = root_result.data[0]

    async def _downstream(cause_id: str, depth: int) -> list[dict]:
        if depth >= MAX_CHAIN_DEPTH:
            return []

        links_result = await asyncio.to_thread(
            lambda: sb.table("incident_chain_effects")
            .select("cause_incident_id,effect_incident_id,causal_mechanism,confidence,distance_km")
            .eq("cause_incident_id", cause_id)
            .execute()
        )
        links = links_result.data or []
        if not links:
            return []

        effect_ids = [row.get("effect_incident_id") for row in links if row.get("effect_incident_id")]
        incidents_by_id: dict[str, dict] = {}
        if effect_ids:
            effects_result = await asyncio.to_thread(
                lambda: sb.table("incidents").select("*").in_("id", effect_ids).execute()
            )
            incidents_by_id = {row["id"]: row for row in (effects_result.data or []) if row.get("id")}

        result: list[dict] = []
        for link in links:
            effect_incident = incidents_by_id.get(link.get("effect_incident_id"), {})
            node = {
                "incident": effect_incident,
                "causal_mechanism": link.get("causal_mechanism"),
                "confidence": link.get("confidence"),
                "distance_km": link.get("distance_km"),
                "downstream": [],
            }
            if effect_incident.get("id"):
                node["downstream"] = await _downstream(effect_incident["id"], depth + 1)
            result.append(node)

        return result

    chain = await _downstream(incident_id, 0)
    flat = _flatten_chain(chain)
    affected_wards = {item.get("incident", {}).get("ward_id") for item in flat if item.get("incident", {}).get("ward_id")}

    return {
        "root_incident": root,
        "chain": chain,
        "total_affected_wards": len(affected_wards),
    }


async def rebuild_ward_adjacency(radius_km: float = ADJACENCY_RADIUS_KM) -> int:
    """Recompute the ward adjacency table from ward centroids."""
    sb = get_supabase_admin()

    wards_result = await asyncio.to_thread(lambda: sb.table("wards").select("id,lat,lng").execute())
    wards = [w for w in (wards_result.data or []) if w.get("lat") is not None and w.get("lng") is not None]

    rows = []
    for i, a in enumerate(wards):
        for b in wards[i + 1 :]:
            distance = haversine_km(a["lat"], a["lng"], b["lat"], b["lng"])
            if distance <= radius_km:
                rows.append(
                    {
                        "ward_id_a": a["id"],
                        "ward_id_b": b["id"],
                        "distance_km": round(distance, 3),
                        "shared_boundary": distance <= 1.0,
                    }
                )

    if not rows:
        return 0

    await asyncio.to_thread(lambda: sb.table("ward_adjacency").upsert(rows, on_conflict="ward_id_a,ward_id_b").execute())
    return len(rows)
