"""Policy Recommendation Engine - Generates actionable government recommendations from intelligence insights.

Transforms knowledge graph insights into specific, practical policy recommendations with
priority levels and evidence-based reasoning for government decision-makers.
"""

import logging
import asyncio
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger("jananaadi.policy_recommendations")


# Policy recommendation templates by domain + relationship combination
POLICY_TEMPLATES = {
    # Climate domain
    ("climate", "society", "impacts"): [
        {
            "action_template": "Establish early warning systems for {entity_a} in vulnerable regions",
            "reason_template": "{entity_a} impacts society. Early warning enables evacuation and preparedness.",
            "priority": "HIGH",
            "departments": ["Ministry of Disaster Management", "State Emergency Authority"]
        },
        {
            "action_template": "Conduct impact assessment of {entity_a} on public health and infrastructure",
            "reason_template": "Understanding severity and scale of {entity_a} impacts enables resource allocation.",
            "priority": "MEDIUM",
            "departments": ["Ministry of Health", "Ministry of Infrastructure"]
        }
    ],
    ("climate", "economics", "affects"): [
        {
            "action_template": "Launch climate resilience fund for affected sectors (agriculture, fishing, tourism)",
            "reason_template": "{entity_a} affects economic productivity. Resilience funds enable business continuity.",
            "priority": "HIGH",
            "departments": ["Ministry of Finance", "Ministry of Agriculture"]
        },
        {
            "action_template": "Develop crop insurance schemes covering {entity_a}-related losses",
            "reason_template": "Insurance protects farmers from {entity_a} impacts, stabilizing income.",
            "priority": "MEDIUM",
            "departments": ["Ministry of Agriculture", "Insurance Regulatory Authority"]
        }
    ],
    
    # Economics domain
    ("economics", "society", "impacts"): [
        {
            "action_template": "Implement employment support programs in affected regions",
            "reason_template": "Economic downturn impacts employment. Programs prevent livelihood loss.",
            "priority": "HIGH",
            "departments": ["Ministry of Labour", "State Employment Board"]
        },
        {
            "action_template": "Expand social safety nets (food, housing assistance) in economically vulnerable areas",
            "reason_template": "Economic stress increases poverty. Expanded support provides immediate relief.",
            "priority": "MEDIUM",
            "departments": ["Ministry of Social Welfare", "State Government"]
        }
    ],
    ("economics", "infrastructure", "strains"): [
        {
            "action_template": "Accelerate infrastructure maintenance and repair programs",
            "reason_template": "Economic constraints lead to deferred maintenance. Focused spending prevents deterioration.",
            "priority": "MEDIUM",
            "departments": ["Ministry of Infrastructure", "Public Works Department"]
        }
    ],
    
    # Defense domain
    ("defense", "geopolitics", "influences"): [
        {
            "action_template": "Strengthen diplomatic channels and coordination agreements",
            "reason_template": "Defense posture influences geopolitical stability. Dialogue reduces tensions.",
            "priority": "HIGH",
            "departments": ["Ministry of External Affairs", "National Security Advisor"]
        },
        {
            "action_template": "Conduct defense policy review and strategic communication",
            "reason_template": "Transparent defense policy prevents miscalculation and regional arms races.",
            "priority": "MEDIUM",
            "departments": ["Ministry of Defence", "Strategic Communications Division"]
        }
    ],
    
    # Technology domain
    ("technology", "society", "enables"): [
        {
            "action_template": "Expand digital literacy and technology adoption programs in rural areas",
            "reason_template": "Technology enablement improves access to services, information, and opportunities.",
            "priority": "MEDIUM",
            "departments": ["Ministry of Technology", "State Education Board"]
        }
    ],
    ("technology", "economics", "drives"): [
        {
            "action_template": "Support technology startups with grants and incubation facilities",
            "reason_template": "Technology drives economic growth. Startup support accelerates innovation economy.",
            "priority": "MEDIUM",
            "departments": ["Ministry of Technology", "Economic Development Board"]
        }
    ],
    
    # Society domain
    ("society", "economics", "affects"): [
        {
            "action_template": "Implement social programs addressing root causes of economic distress",
            "reason_template": "Social unrest signals economic distress. Programs address underlying issues.",
            "priority": "HIGH",
            "departments": ["Ministry of Social Welfare", "State Government"]
        }
    ],
    
    # Generic/fallback templates
    ("defense", "economics", "strains"): [
        {
            "action_template": "Review defense spending efficiency and budget allocation",
            "reason_template": "Defense spending impacts economic capacity. Efficiency reviews optimize resource use.",
            "priority": "MEDIUM",
            "departments": ["Ministry of Defence", "Ministry of Finance"]
        }
    ],
}


def _get_sentiment_severity(negative_pct: float) -> str:
    """Classify severity based on negative sentiment percentage."""
    if negative_pct >= 70:
        return "critical"
    elif negative_pct >= 50:
        return "high"
    elif negative_pct >= 30:
        return "moderate"
    else:
        return "low"


def _get_priority_from_confidence_and_sentiment(confidence: float, negative_pct: float) -> str:
    """Determine priority based on confidence and negative sentiment."""
    if confidence >= 0.75 and negative_pct >= 60:
        return "HIGH"
    elif confidence >= 0.65 or negative_pct >= 50:
        return "MEDIUM"
    else:
        return "LOW"


async def generate_policy_recommendations(
    insight: str,
    confidence: float,
    domains: List[str],
    evidence_texts: List[str],
    sentiment: Dict[str, float],
    relationship_type: str | None = None,
    chain_depth: int = 1
) -> Dict[str, Any]:
    """
    Generate actionable policy recommendations from an intelligence insight.
    
    Args:
        insight: Human-readable insight (e.g., "Flooding affects economy")
        confidence: Confidence score (0-1)
        domains: List of domains involved (e.g., ["climate", "economics"])
        evidence_texts: List of evidence snippets (news, reports, etc.)
        sentiment: Dict with "negative", "positive", "neutral" percentages
        relationship_type: Type of relationship (e.g., "affects", "impacts")
        chain_depth: Depth of reasoning (1 for direct, 2+ for multi-hop)
    
    Returns:
    {
        "insight_summary": str,
        "severity": "critical|high|moderate|low",
        "confidence": float,
        "recommended_actions": [
            {
                "action": str,
                "priority": "HIGH|MEDIUM|LOW",
                "reason": str,
                "departments": [str],
                "confidence": float
            }
        ]
    }
    """
    
    negative_pct = sentiment.get("negative", 0)
    positive_pct = sentiment.get("positive", 0)
    neutral_pct = sentiment.get("neutral", 0)
    
    # Determine severity
    severity = _get_sentiment_severity(negative_pct)
    
    recommendations = []
    
    # Try to find templates matching domain + relationship combination
    if len(domains) >= 2:
        primary_domain = domains[0]
        secondary_domain = domains[1]
        
        # Try specific combination
        template_key = (primary_domain, secondary_domain, relationship_type or "related_to")
        templates = POLICY_TEMPLATES.get(template_key)
        
        if not templates:
            # Try reverse domain order
            template_key_rev = (secondary_domain, primary_domain, relationship_type or "related_to")
            templates = POLICY_TEMPLATES.get(template_key_rev)
        
        if not templates:
            # Try fallback: just domain pair
            template_key_fallback = (primary_domain, secondary_domain, None)
            templates = POLICY_TEMPLATES.get(template_key_fallback, [])
    else:
        templates = []
    
    # Generate recommendations from templates
    for template in templates[:3]:  # Limit to 3 templates per key
        try:
            action = template["action_template"]
            reason = template["reason_template"]
            
            # Replace placeholders with actual insight entities
            # Extract entity names from insight (simple heuristic)
            words = insight.split()
            if len(words) > 0:
                # Assume format: "Entity1 relationship Entity2"
                entity_a = words[0] if len(words) > 0 else "the event"
                entity_b = words[-1] if len(words) > 1 else "communities"
                
                action = action.replace("{entity_a}", entity_a).replace("{entity_b}", entity_b)
                reason = reason.replace("{entity_a}", entity_a).replace("{entity_b}", entity_b)
            
            # Determine priority for this recommendation
            rec_priority = template.get("priority", "MEDIUM")
            
            # Override priority if sentiment is very high
            if negative_pct >= 70:
                rec_priority = "HIGH"
            elif negative_pct >= 50 and rec_priority == "LOW":
                rec_priority = "MEDIUM"
            
            recommendations.append({
                "action": action,
                "priority": rec_priority,
                "reason": reason,
                "departments": template.get("departments", []),
                "confidence": round(confidence, 2)
            })
        
        except Exception as e:
            logger.warning(f"Failed to generate recommendation from template: {e}")
            continue
    
    # If no templates matched, generate generic recommendations
    if not recommendations:
        recommendations = _generate_generic_recommendations(
            insight, confidence, domains, negative_pct
        )
    
    # Limit to 5 recommendations, sorted by priority
    priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    recommendations.sort(key=lambda x: priority_order.get(x["priority"], 3))
    recommendations = recommendations[:5]
    
    return {
        "insight_summary": insight,
        "severity": severity,
        "confidence": round(confidence, 2),
        "sentiment": {
            "negative": round(negative_pct, 1),
            "positive": round(positive_pct, 1),
            "neutral": round(neutral_pct, 1)
        },
        "chain_depth": chain_depth,
        "reasoning_type": "direct" if chain_depth == 1 else "multi_hop",
        "evidence_count": len(evidence_texts),
        "recommended_actions": recommendations,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


def _generate_generic_recommendations(
    insight: str,
    confidence: float,
    domains: List[str],
    negative_pct: float
) -> List[Dict[str, Any]]:
    """Generate generic recommendations when no templates match."""
    
    recommendations = []
    
    # Generic action 1: Assessment
    recommendations.append({
        "action": f"Conduct comprehensive assessment of {', '.join(domains)} interconnections",
        "priority": "MEDIUM" if confidence >= 0.6 else "LOW",
        "reason": f"Understanding the {insight} connection enables targeted policy response.",
        "departments": ["Ministry of Planning", "Policy Research Division"],
        "confidence": round(confidence, 2)
    })
    
    # Generic action 2: Monitoring
    recommendations.append({
        "action": f"Establish monitoring dashboard for {domains[0] if domains else 'key'} indicators",
        "priority": "MEDIUM",
        "reason": "Real-time monitoring enables rapid response to escalating situations.",
        "departments": ["State Statistics Bureau", "Policy Secretariat"],
        "confidence": round(confidence, 2)
    })
    
    # Generic action 3: Coordination
    if len(domains) > 1:
        recommendations.append({
            "action": f"Initiate inter-departmental coordination between {domains[0]} and {domains[1]} agencies",
            "priority": "MEDIUM",
            "reason": "Cross-domain coordination enables integrated policy responses.",
            "departments": ["Chief Secretary", "Policy Coordination Cell"],
            "confidence": round(confidence, 2)
        })
    
    # Generic action 4: If negative sentiment is high
    if negative_pct >= 50:
        recommendations.append({
            "action": "Develop contingency plans for potential escalation",
            "priority": "MEDIUM" if negative_pct >= 70 else "LOW",
            "reason": f"High negative sentiment ({negative_pct:.0f}%) indicates urgent concern. Contingency plans enable rapid response.",
            "departments": ["Emergency Management", "State Government"],
            "confidence": round(confidence, 2)
        })
    
    return recommendations


async def get_recommendations_for_brief(
    entry_id: str,
    brief_id: str | None = None
) -> Dict[str, Any]:
    """
    Fetch a brief and generate policy recommendations based on its key insights.
    
    This bridges the policy recommendation engine with the brief generator.
    """
    sb = get_supabase_admin()
    
    try:
        # Fetch brief
        brief_result = await asyncio.to_thread(
            lambda: sb.table("briefs")
            .select("*")
            .eq("id", brief_id)
            .limit(1)
            .execute()
        ) if brief_id else None
        
        if not brief_result or not brief_result.data:
            # Fetch from sentiment entries if no brief ID
            entry_result = await asyncio.to_thread(
                lambda: sb.table("sentiment_entries")
                .select("*")
                .eq("id", entry_id)
                .limit(1)
                .execute()
            )
            
            if not entry_result or not entry_result.data:
                return {"error": "Entry not found"}
            
            entry = entry_result.data[0]
            
            # Generate recommendation from entry
            return await generate_policy_recommendations(
                insight=entry.get("cleaned_text", entry.get("text", ""))[:200],
                confidence=0.5,
                domains=[entry.get("domain", "unspecified")],
                evidence_texts=[entry.get("text", "")],
                sentiment={
                    "negative": 100 if entry.get("sentiment") == "negative" else (50 if entry.get("sentiment") == "neutral" else 0),
                    "positive": 100 if entry.get("sentiment") == "positive" else 0,
                    "neutral": 100 if entry.get("sentiment") == "neutral" else 0
                }
            )
        
        brief = brief_result.data[0]
        
        # Extract key insights from brief
        findings = brief.get("key_findings", [])
        if findings and len(findings) > 0:
            finding = findings[0]
            
            return await generate_policy_recommendations(
                insight=finding.get("finding", "Unspecified insight"),
                confidence=0.7,
                domains=[brief.get("domain", "unspecified")],
                evidence_texts=[],
                sentiment={
                    "negative": 60,
                    "positive": 20,
                    "neutral": 20
                }
            )
        
        return {"error": "No findings in brief"}
    
    except Exception as e:
        logger.error(f"Failed to get recommendations for brief: {e}")
        return {"error": str(e)}


async def batch_generate_recommendations(
    insights: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Generate recommendations for multiple insights in parallel.
    
    Args:
        insights: List of insight dicts with keys:
            - insight: str
            - confidence: float
            - domains: List[str]
            - evidence_texts: List[str]
            - sentiment: Dict
    
    Returns:
        List of recommendation dicts
    """
    tasks = [
        generate_policy_recommendations(
            insight=ins["insight"],
            confidence=ins.get("confidence", 0.5),
            domains=ins.get("domains", []),
            evidence_texts=ins.get("evidence_texts", []),
            sentiment=ins.get("sentiment", {"negative": 0, "positive": 0, "neutral": 100})
        )
        for ins in insights
    ]
    
    results = await asyncio.gather(*tasks)
    return results
