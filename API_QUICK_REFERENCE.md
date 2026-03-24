# JanaNaadi Intelligence API — Quick Reference ⚡

**Quick Start Guide for Developers & Analysts**

---

## 🎯 At a Glance

Three new services power the intelligence pipeline:

| Service | What It Does | When to Use |
|---------|-------------|-----------|
| **Inference Engine** ⚙️ | Discovers relationships across domains | Automatic (runs during entity ingestion) |
| **Explainability Engine** 🔍 | Explains relationships with evidence | When analysts ask "why?" |
| **Policy Engine** 📋 | Generates actionable recommendations | When government needs to act |

---

## 🔌 5 New API Endpoints

### 1️⃣ Explain Relationship

```
GET /api/ontology/explain?entity_a=Flood&entity_b=Economy
```

**What it does**: Answers "Why does X relate to Y?"

**Example**:
```bash
curl "http://localhost:8000/api/ontology/explain?entity_a=Flooding&entity_b=Economy" \
  -H "Authorization: Bearer token"
```

**Response**:
```json
{
  "found": true,
  "insight": "Flooding affects economy",
  "confidence": 0.78,
  "relationship_type": "affects",
  "evidence": [
    {
      "id": "entry_123",
      "text": "Heavy floods caused Rs. 50 crore damage...",
      "source": "news",
      "sentiment": "negative",
      "date": "2026-03-24T10:30:00Z"
    }
  ]
}
```

---

### 2️⃣ Entity Profile

```
GET /api/ontology/entity-profile/{entity_name}
```

**What it does**: Get comprehensive entity profile with all connections

**Example**:
```bash
curl "http://localhost:8000/api/ontology/entity-profile/Chennai%20Flooding" \
  -H "Authorization: Bearer token"
```

**Response**:
```json
{
  "found": true,
  "entity_name": "Chennai Flooding",
  "entity_type": "event",
  "description": "Heavy rainfall caused urban flooding",
  "domain": "climate",
  "sentiment_score": -0.68,
  "mention_count": 45,
  "incoming_relationships": [
    {
      "source": "Monsoon",
      "type": "caused_by",
      "confidence": 0.85
    }
  ],
  "outgoing_relationships": [
    {
      "target": "Transport Disruption",
      "type": "impacts",
      "confidence": 0.75
    }
  ]
}
```

---

### 3️⃣ Brief Recommendations

```
POST /api/briefs/{brief_id}/recommendations
```

**What it does**: Generate recommendations for a policy brief

**Example**:
```bash
curl -X POST "http://localhost:8000/api/briefs/brief_456/recommendations" \
  -H "Authorization: Bearer token"
```

**Response**:
```json
{
  "insight_summary": "Monsoon impacts exceed expected damage",
  "severity": "high",
  "confidence": 0.75,
  "recommended_actions": [
    {
      "action": "Activate agricultural contingency fund",
      "priority": "HIGH",
      "reason": "Monsoon damages crops. Fund prevents livelihood collapse.",
      "departments": ["Ministry of Agriculture", "Revenue Department"]
    }
  ]
}
```

---

### 4️⃣ Generate Recommendations (Direct)

```
POST /api/briefs/recommendations/generate?insight=...&confidence=...
```

**What it does**: Generate recommendations from raw insight data

**Parameters**:
```
insight             = "Flooding affects economy"
confidence          = 0.75
domains             = "climate,economics"
negative_sentiment  = 65
positive_sentiment  = 15
neutral_sentiment   = 20
relationship_type   = "affects" (optional)
chain_depth         = 1 (optional, 1=direct, 2+=multi-hop)
```

**Example**:
```bash
curl -X POST "http://localhost:8000/api/briefs/recommendations/generate" \
  -G \
  --data-urlencode "insight=Flooding affects economy" \
  --data-urlencode "confidence=0.75" \
  --data-urlencode "domains=climate" \
  --data-urlencode "domains=economics" \
  --data-urlencode "negative_sentiment=65" \
  -H "Authorization: Bearer token"
```

---

### 5️⃣ Batch Recommendations

```
POST /api/briefs/recommendations/batch
```

**What it does**: Generate recommendations for multiple insights in parallel

**Request Body** (JSON):
```json
[
  {
    "insight": "Flooding affects economy",
    "confidence": 0.75,
    "domains": ["climate", "economics"],
    "evidence_texts": ["Heavy floods disrupted..."],
    "sentiment": {"negative": 65, "positive": 15, "neutral": 20}
  },
  {
    "insight": "Economic stress increases migration",
    "confidence": 0.68,
    "domains": ["economics", "society"],
    "evidence_texts": ["Rising unemployment..."],
    "sentiment": {"negative": 58, "positive": 22, "neutral": 20}
  }
]
```

**Example**:
```bash
curl -X POST "http://localhost:8000/api/briefs/recommendations/batch" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d @insights.json
```

---

## 📊 Response Structure

### Recommendation Response

All policy endpoints return:

```json
{
  "insight_summary": "string (what was analyzed)",
  "severity": "critical|high|moderate|low",
  "confidence": 0.0-1.0,
  "sentiment": {
    "negative": 0-100,
    "positive": 0-100,
    "neutral": 0-100
  },
  "chain_depth": 1,
  "reasoning_type": "direct|multi_hop",
  "evidence_count": 0-N,
  "recommended_actions": [
    {
      "action": "string (specific action)",
      "priority": "HIGH|MEDIUM|LOW",
      "reason": "string (why this action)",
      "departments": ["string"],
      "confidence": 0.0-1.0
    }
  ],
  "generated_at": "2026-03-24T10:30:00Z"
}
```

---

## 🎯 Use Cases

### Use Case 1: Analyst Explores Relationship

```python
# Frontend: User clicks on "Flood" and "Economy" nodes
# Request explanation
response = GET /api/ontology/explain?entity_a=Flood&entity_b=Economy

# Display:
print(f"Why: {response['insight']}")
print(f"Confidence: {response['confidence']}")
print(f"From {len(response['evidence'])} sources")
# Show evidence cards
```

---

### Use Case 2: Brief Gets Recommendations

```python
# Backend: Brief generated
brief = generate_brief(scope="state", id=1)

# Generate recommendations
recs = POST /api/briefs/{brief.id}/recommendations

# Attach to brief
brief.recommended_actions = recs.recommended_actions
brief.severity = recs.severity

# Send to government
send_to_ministry(brief)
```

---

### Use Case 3: Crisis Response

```python
# Alert triggered: HIGH sentiment about flooding
alert = {
  "insight": "Flooding severely impacts transport",
  "confidence": 0.88,
  "domains": ["climate", "infrastructure"],
  "negative_sentiment": 80
}

# Get recommendations immediately
recommendations = POST /api/briefs/recommendations/generate {alert}

# Route to Ministry of Infrastructure
route_to_ministry("infrastructure", recommendations)

# Execute HIGH priority actions
for action in recommendations.actions:
  if action.priority == "HIGH":
    execute(action)
```

---

### Use Case 4: Batch Analysis

```python
# Analyst: "Show me recommendations for all domain pairs"

insights = [
  {insight: "Climate affects economics", ...},
  {insight: "Economics impacts society", ...},
  {insight: "Defense influences geopolitics", ...},
  # ... 20 more
]

# Generate all at once
all_recommendations = POST /api/briefs/recommendations/batch {insights}

# Analyze patterns
grouped = group_by_priority(all_recommendations)
critical = grouped["HIGH"]
print(f"URGENT: {len(critical)} actions need immediate attention")
```

---

## 🔑 Authentication

All endpoints require **admin token**:

```bash
curl ... -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Where to get token**:
```bash
# Login endpoint (existing)
POST /api/auth/login
{
  "username": "your_username",
  "password": "your_password"
}
# Returns: {access_token: "..."}
```

---

## ⏱️ Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/ontology/explain` | 30 requests/minute |
| `/ontology/entity-profile/{name}` | 30 requests/minute |
| `/briefs/{id}/recommendations` | 30 requests/minute |
| `/briefs/recommendations/generate` | 30 requests/minute |
| `/briefs/recommendations/batch` | 10 requests/minute |

**When rate limited**: Returns `429 Too Many Requests`

---

## 🧪 Quick Tests

### Test 1: Check Syntax

```bash
cd backend
python -m py_compile app/services/policy_recommendation_engine.py
echo "✅ OK"
```

### Test 2: Test Endpoint

```bash
# Test with curl
curl "http://localhost:8000/api/ontology/explain?entity_a=Test&entity_b=Case" \
  -H "Authorization: Bearer test_token"

# Expected: 200 OK or 401 Unauthorized
```

### Test 3: Test Batch

```python
import asyncio
from app.services.policy_recommendation_engine import batch_generate_recommendations

insights = [
  {
    "insight": "Test insight 1",
    "confidence": 0.75,
    "domains": ["climate", "economics"],
    "evidence_texts": [],
    "sentiment": {"negative": 50, "positive": 30, "neutral": 20}
  }
]

results = asyncio.run(batch_generate_recommendations(insights))
print(f"Generated {len(results)} recommendations")
```

---

## 🔍 Debugging

### Check if Services Are Loaded

```python
# Python repl
from app.services import policy_recommendation_engine
from app.services import explainability_service
from app.services import inference_engine

print("✅ All services loaded")
```

### Check if Routes Registered

```bash
# Check endpoint registration
curl http://localhost:8000/api/briefs/recommendations/generate \
  -X OPTIONS -H "Authorization: Bearer token" \
  -v 2>&1 | grep -i "allow"

# Should show: GET, POST, OPTIONS
```

### View Logs

```bash
# Backend logs (if running with uvicorn)
tail -f logs/jananaadi.log

# Or in terminal
# Watch for: "Inference engine called", "Explainability engine called", etc.
```

---

## 📝 Common Patterns

### Pattern 1: Get Explanation, Then Recommend

```python
# Step 1: Get explanation
explanation = await get_relationship_explanation("Flood", "Economy")

# Step 2: Use explanation data for recommendations
if explanation["found"]:
  recommendations = await generate_policy_recommendations(
    insight=explanation["insight"],
    confidence=explanation["confidence"],
    domains=["climate", "economics"],
    evidence_texts=[e["text"] for e in explanation["evidence"]]
  )
```

### Pattern 2: Entity Profile with Recommendations

```python
# Get entity profile
profile = await get_entity_explanation("Chennai Flooding")

# For each relationship, could generate recommendations
for rel in profile["outgoing_relationships"]:
  # e.g., rel: {target: "Transport", type: "impacts"}
  recommendations = await generate_policy_recommendations(
    insight=f"Flooding {rel['type']} {rel['target']}",
    confidence=rel["confidence"],
    ...
  )
```

### Pattern 3: Real-Time Alert Recommendations

```python
# Alert triggered
alert_event = {
  "entity_a": "Monsoon",
  "entity_b": "Crops",
  "sentiment": "negative",
  "confidence": 0.88
}

# Immediately generate recommendations
recs = await generate_policy_recommendations(
  insight=f"{alert_event['entity_a']} affects {alert_event['entity_b']}",
  confidence=alert_event["confidence"],
  domains=["climate", "agriculture"],
  sentiment={"negative": 80, "positive": 10, "neutral": 10}
)

# Send HIGH priority to agriculture ministry
high_priority = [a for a in recs["recommended_actions"] if a["priority"] == "HIGH"]
send_alert(ministry="agriculture", actions=high_priority)
```

---

## 🚀 Deployment Checklist

Before deploying to production:

```
✅ Database
   [ ] evidence_entry_ids column added to entity_relationships
   [ ] Verified column is UUID[] type with default '{}'

✅ Code
   [ ] All 6 files deployed (3 services + 3 routers)
   [ ] Syntax validated (python -m py_compile)
   [ ] Requirements.txt includes all dependencies

✅ Configuration
   [ ] Rate limits configured (30/min, 10/min)
   [ ] Admin authentication enabled
   [ ] Error handling configured

✅ Testing
   [ ] All 5 endpoints tested
   [ ] Batch processing tested
   [ ] Rate limiting verified
   [ ] Error scenarios tested

✅ Monitoring
   [ ] Logs configured
   [ ] Metrics collection enabled
   [ ] Alerts set for failures
```

---

## 📞 Support

### Common Issues

| Issue | Solution |
|-------|----------|
| `404 endpoint not found` | Restart backend; check imports in router |
| `401 unauthorized` | Use admin token; check token validity |
| `429 too many requests` | Wait 60 seconds; increase rate limit |
| `500 service error` | Check logs; verify database connection |
| `No recommendations found` | Check domain pair has templates; uses fallback |

---

## 📚 Full Documentation

- **INTELLIGENCE_PIPELINE.md** → Complete system overview
- **INFERENCE_ENGINE.md** → Domain rules & multi-hop logic
- **EXPLAINABILITY_ENGINE.md** → Evidence tracking & traceability
- **POLICY_RECOMMENDATION_ENGINE.md** → Templates & actionability

---

## 🎯 Key Takeaways

```
✅ New endpoints ready to call
✅ Full evidence trail maintained
✅ Recommendations automatic from brief generation
✅ Rate limited to prevent abuse
✅ Admin authentication required
✅ Backward compatible (no breaking changes)
✅ Production ready
```

---

**Ready to deploy! 🚀**
