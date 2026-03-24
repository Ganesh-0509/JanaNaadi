<p align="center">
  <img src="https://img.shields.io/badge/JanaNaadi-Pulse_of_the_People-FF6B35?style=for-the-badge&logoColor=white" alt="JanaNaadi" />
  <br/>
  <img src="https://img.shields.io/badge/Status-Production_Ready-00C853?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/Built_For-India_🇮🇳-FF9933?style=flat-square" />
  <img src="https://img.shields.io/badge/Languages-9+_Indian-8E24AA?style=flat-square" />
  <img src="https://img.shields.io/badge/AI-Ollama_Qwen2.5_(Local)_First-00BFAE?style=flat-square" />
<a href="https://jana-naadi.vercel.app/">
  <img src="https://img.shields.io/badge/Deployed_Link-neon?style=flat-square&logo=vercel" />
</a>
<h1 align="center">🫀 JanaNaadi</h1>

<h3 align="center"><em>India's Real-Time Public Sentiment & Strategic Intelligence Platform</em></h3>

<p align="center">
  <strong>Jana</strong> = People &nbsp;·&nbsp; <strong>Naadi</strong> = Pulse<br/>
  <sub>Transforming the noise of a billion voices into actionable intelligence.</sub>
</p>

---

## 🌟 What is JanaNaadi?

JanaNaadi is an **AI-powered multilingual intelligence platform** that aggregates citizen voices from social media, news outlets, and public surveys — then connects them into a **unified, living knowledge graph** for strategic decision-making.

It enables government analysts, policymakers, researchers, and citizens to **discover hidden patterns**, **track emerging threats**, and **make evidence-based decisions** — all from a single intelligence dashboard.

> _"In a democracy of 1.4 billion people, every voice is a data point. JanaNaadi makes sure none of them are lost."_

---

## ✨ Key Features

### 🧠 AI-Powered Knowledge Graph
- **Entity Extraction** — Automatically identifies **people, organizations, locations, events, policies, and technologies** from unstructured text using your **local LLM (Ollama/Qwen2.5)** by default (cloud APIs only as fallback)
- **Relationship Mapping** — Discovers and visualizes connections: *supports, opposes, impacts, causes, related_to, part_of, mentioned_in, located_in*
- **Weighted Strength Scoring** — Relationship importance grows dynamically with mention frequency
- **Interactive D3.js Visualization** — Explore the graph with zoom, pan, filter, search, and click-to-drill-down

### 🌐 Multi-Domain Intelligence
Six strategic intelligence domains tracked in real-time:

| Domain | Coverage | Sources |
|--------|----------|---------|
| 🌍 **Geopolitics** | International relations, diplomacy, border issues | PIB External Affairs, The Hindu World, Indian Express |
| 💰 **Economics** | Markets, inflation, GDP, budget policies | ET Markets, Business Line, Mint, Business Standard |
| 🛡️ **Defense** | Military ops, security threats, border incidents | PIB Defense, MOD, Indian Army Official |
| 🌿 **Climate** | Weather, pollution, disasters, green policies | Down to Earth, The Hindu Environment, NDTV |
| 💻 **Technology** | Tech policy, cybersecurity, digital innovation | PIB Tech, ET Tech, NDTV Gadgets |
| 🏥 **Society** | Healthcare, education, infrastructure, public welfare | Multiple government & media feeds |

Each domain features **risk scoring** (0–100%), **urgency classification** (low → critical), and **trend indicators** (↑ rising, ↓ falling, → stable).

### 🗺️ Geographic Intelligence
- Maps every data point to India's **democratic geography**: `Booth → Ward → Constituency → District → State`
- **Sentiment Heatmaps** — Leaflet.js–powered geographic visualization of public opinion
- **Hotspot Detection** — Automatically surfaces regions with unusual sentiment patterns
- **Regional Comparison** — Side-by-side analysis of different geographic zones

### 🗣️ Multilingual AI
Natively supports **9+ Indian languages** — not just translation, but true language-aware sentiment analysis:

`English · Hindi · Tamil · Telugu · Bengali · Marathi · Kannada · Malayalam · Gujarati`

### ⚡ Real-Time Processing
- **122+ RSS Feed Sources** — 90 general + 32 domain-specific feeds
- **Auto-Ingestion** — Scheduled every 2 hours via APScheduler
- **WebSocket Streaming** — Live sentiment updates pushed to clients
- **Alert System** — Automated spike detection for sentiment volume and polarity shifts

### 📊 Analytics & Reports
- **Sentiment Analysis** — Fine-grained scoring from -1.0 to +1.0 per entry
- **Trend Charts** — Temporal sentiment tracking with Recharts
- **Policy Briefs** — AI-generated intelligence summaries with key findings and recommendations
- **Topic Extraction** — Identifies 30+ trending topics across domains
- **Keyword Cloud** — Visual representation of dominant themes

### 🔐 Enterprise-Grade Security
- **Role-Based Access Control** — Admin, User, and Public access tiers
- **Supabase Auth** — Secure authentication with Row-Level Security (RLS)
- **Rate Limiting** — 30/min public · 60/min users · 120/min admin
- **CORS & Security Headers** — Production-hardened API
- **Audit Trail** — All actions logged with timestamps

---

## 🏛️ Platform Pages

| Page | Route | Description |
|------|-------|-------------|
| 🏠 **Landing** | `/` | Hero page with platform overview and live stats |
| 📊 **Public Dashboard** | `/dashboard` | Aggregated national sentiment overview |
| 🏛️ **Gov Dashboard** | `/gov` | Multi-domain intelligence with risk gauges |
| 🧬 **Knowledge Graph** | `/ontology` | Interactive D3.js entity-relationship explorer |
| 🗺️ **Heatmap** | `/heatmap` | Geographic sentiment visualization |
| 📈 **Analysis** | `/analysis` | Deep-dive sentiment and trend analytics |
| 🔍 **Search** | `/search` | Full-text search across all data |
| 🔴 **Live Stream** | `/stream` | Real-time incoming sentiment feed |
| 🚨 **Alert Center** | `/alerts` | Automated alert monitoring dashboard |
| 📝 **Policy Briefs** | `/briefs` | AI-generated intelligence reports |
| 🔥 **Hotspots** | `/hotspots` | Emerging regional issue tracker |
| ⚖️ **Comparison** | `/compare` | Side-by-side regional/topic comparison |
| 📥 **Data Ingestion** | `/admin/ingest` | Admin panel for data source management |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                             │
│  RSS Feeds (122+) · News APIs · Social Media · Manual Uploads   │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INGESTION LAYER                             │
│  Domain Ingester · News Ingester · Reddit · Twitter · CSV       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 3-Layer Deduplication: Source ID · Exact Text · Near-Dup │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  NLP ENGINE (Ollama/Qwen2.5 Local LLM)          │
│  Language Detection · Sentiment Analysis · Topic Extraction     │
│  Entity Extraction · Relationship Discovery · Translation       │
│  (Cloud APIs: Bytez/Gemini used only as fallback)               │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              KNOWLEDGE GRAPH (Supabase PostgreSQL)              │
│  12 Tables · 20+ Indexes · Triggers · Row-Level Security       │
│  ┌────────────┐ ┌──────────────────┐ ┌──────────────────────┐  │
│  │  Entities   │ │  Relationships   │ │ Domain Intelligence  │  │
│  │  Mentions   │ │  Sentiment Data  │ │ Geographic Mapping   │  │
│  └────────────┘ └──────────────────┘ └──────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API LAYER (FastAPI)                           │
│  Public · Ontology · Analysis · Search · Alerts · Admin · WS   │
│  Rate-Limited · Cached · Documented (Swagger)                   │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND (React 18 + TypeScript + Vite)            │
│  D3.js Graph · Leaflet Maps · Recharts · Tailwind CSS          │
│  15 Pages · 18 Components · Live WebSocket                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Visualization** | D3.js (Knowledge Graph), Leaflet.js (Maps), Recharts (Charts) |
| **Backend** | FastAPI (Python), APScheduler, WebSocket |
| **Database** | Supabase (PostgreSQL), Row-Level Security |
| **AI / NLP** | Ollama (Qwen2.5, Local LLM) — Sentiment, Entities, Translation  |
|              | (Cloud APIs: Bytez/Gemini only as fallback)                    |
| **Auth** | Supabase Auth with RBAC |
| **Deployment** | Render (Backend + Frontend), Supabase (Database) |
| **Data Sources** | 122+ RSS feeds, News APIs, Reddit, Twitter |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Supabase account (free tier works)
- Bytez API key

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/JanaNaadi.git
cd JanaNaadi
```

### 2️⃣ Database Setup
```sql
-- Run in Supabase SQL Editor
-- File: backend/COMPLETE_DATABASE_SCHEMA.sql
-- Creates all 12 tables, indexes, triggers, and security policies
```


### 3️⃣ Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env       # Configure your API keys
#
# By default, JanaNaadi uses your local LLM (Ollama/Qwen2.5) for all AI/NLP tasks.
# Cloud APIs (Bytez, Gemini) are only used if Ollama is unavailable.
#
# To use local LLM, make sure Ollama is running:
#   ollama serve qwen2.5
#
uvicorn app.main:app --reload --port 8000
```

### 4️⃣ Frontend
```bash
cd frontend
npm install
cp .env.example .env       # Configure Supabase credentials
npm run dev
```


### 5️⃣ Access
| Service | URL |
|---------|-----|
| 🖥️ Frontend | `http://localhost:5173` |
| ⚙️ Backend API | `http://localhost:8000` |
| 📖 API Docs (Swagger) | `http://localhost:8000/docs` |
| 🧬 Knowledge Graph | `http://localhost:5173/ontology` |

---

## 🤖 AI/NLP Priority Order

**JanaNaadi always uses your local LLM (Ollama/Qwen2.5) as the first priority for all AI/NLP tasks.**

- If Ollama is running and reachable, all entity extraction, sentiment analysis, and recommendations use your local model.
- If Ollama is not available, the system will automatically fall back to cloud APIs (Bytez, Gemini) as a backup.
- This ensures maximum privacy, speed, and zero API cost by default.

**To use local LLM:**
1. Install Ollama (https://ollama.com/)
2. Download the Qwen2.5 model: `ollama pull qwen2.5`
3. Start Ollama: `ollama serve qwen2.5`
4. Set `USE_LOCAL_LLM=true` in your `.env` file (default is already true)

**No cloud API calls will be made unless Ollama is unavailable.**

---

## 📈 Performance

| Metric | Value |
|--------|-------|
| API Response Time | ~200ms (cached) |
| Knowledge Graph Load | ~1.5s (150 nodes) |
| Entity Extraction | ~3s per entry |
| Database Queries | ~50ms (indexed) |
| Data Freshness | Every 2 hours (auto) |
| Concurrent Users | 100+ (rate-limited) |

---

## 🔮 Roadmap

| Phase | Features |
|-------|----------|
| **Phase 1** | Enhanced entity types (laws, treaties), timeline view, historical tracking |
| **Phase 2** | Clustering algorithms, anomaly detection, predictive risk analytics |
| **Phase 3** | WhatsApp citizen reporting bot, email alerts, PDF/Excel policy exports |
| **Phase 4** | Mobile app (React Native), offline sync, multi-region CDN deployment |

---

## 🤝 Contributing

We welcome contributions! Whether it's a bug fix, new feature, or documentation improvement — open a PR and let's build the pulse of India together.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

<p align="center">
  <strong>Built with ❤️ for India 🇮🇳</strong><br/>
  <sub>India Innovates 2026 — Digital Democracy Track</sub><br/><br/>
  <img src="https://img.shields.io/badge/JanaNaadi-The_Pulse_of_the_People-FF6B35?style=for-the-badge" />
</p>
