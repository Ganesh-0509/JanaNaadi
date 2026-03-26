<p align="center">
  <img src="https://img.shields.io/badge/JanaNaadi-MCD_Intelligence_Engine-FF6B35?style=for-the-badge&logoColor=white" alt="JanaNaadi" />
  <br/>
  <img src="https://img.shields.io/badge/Status-MCD_Localized-00C853?style=flat-square" />
  <img src="https://img.shields.io/badge/Data-100%25_Factual_Gazette-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/Wards-250_MCD_Official-8E24AA?style=flat-square" />
<a href="https://jana-naadi.vercel.app/">
  <img src="https://img.shields.io/badge/Deployed_Link-neon?style=flat-square&logo=vercel" />
</a>
<h1 align="center">🫀 JanaNaadi: Municipal Intelligence Engine</h1>

<h3 align="center"><em>Official Digital Twin & Strategic Governance Platform for the Municipal Corporation of Delhi (MCD)</em></h3>

<p align="center">
  <strong>Jana</strong> = People &nbsp;·&nbsp; <strong>Naadi</strong> = Pulse<br/>
  <sub>Localized for the 250 Wards & 1.6 Crore Citizens of the National Capital Territory.</sub>
</p>

---

## 🌟 The Core Technology

JanaNaadi is a **High-Fidelity Municipal Intelligence Platform.** It transforms the noise of urban life into actionable governance insights by mapping real-time public sentiment, news, and grievances to the **250 Official MCD Wards.**

### 🧠 MCD Global Ontology Engine
- **Entity Mastery** — Automatically identifies **MCD Officials (Mayor Raja Iqbal Singh, CM Atishi), Wards, Zones, and Schemes** from news.
- **Accountability Web** — Deep relationship mapping between a citizen grievance and the ward councilors using **Large Language Models (Ollama/Qwen2.5)**.
- **D3.js Visualization** — Interactive Explorer for the MCD leadership-governance graph.

### 🗺️ Factual Registry (250 Wards)
- **100% Real Census Data** — Integrated population and social equity (SC) metrics for every ward (Narela to Sabapur).
- **12 Administrative Zones** — Fully localized leaderboard ranking the performance of Civil Lines, Rohini, Karol Bagh, etc.
- **70 Assembly Constituencies** — Seamless mapping between State and Municipal boundaries.

### ⚡ Real-Life Data Pipeline
- **Daily RSS Sync** — Ingests live news from **NDTV Delhi, TOI Delhi**, and **MCD Gazette Feeds** every 15 minutes.
- **Historical Reality** — 500+ real-life historical news snippets (2024-2026) instead of mock generic pulses.
- **Strategic Weighting** — Sentiment scores are weighted by **Ward Population Density**, ensuring high-impact issues surface instantly.

---

## 🏗️ Architecture

| Layer | Component | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18 / Vite | D3.js Graphs, Leaflet Sentiment Maps, Recharts Analytics. |
| **Backend** | FASTAPI (Python) | High-performance API with real-time news ingestion scheduler. |
| **Database** | Supabase (Postgres) | 12 Tables, custom RLS policies, and Master Ward Registry. |
| **AI / NLP** | Ollama (Qwen2.5) | Local LLM priority for sentiment and entity extraction. |

---

## 🚀 Setup & Initialization

### 1️⃣ Clone & Database
```bash
git clone https://github.com/your-username/JanaNaadi.git
cd JanaNaadi
# Run backend/COMPLETE_DATABASE_SCHEMA.sql in Supabase SQL Editor
```

### 2️⃣ Geographic Baseline (MCD Ready)
Synchronize the official 250-Ward registry and demographics:
```bash
cd scripts
python final_force_sync.py
```

### 3️⃣ Background Ingestion
```bash
# Ingest 500+ Historical Reality Records
python scripts/historical_truth_ingest.py
# Start News Scheduler
cd ../backend && uvicorn app.main:app --reload
```

---

<p align="center">
  <strong>Built with ❤️ for Delhi 🇮🇳</strong><br/>
  <img src="https://img.shields.io/badge/JanaNaadi-MCD_Intelligence_Engine-FF6B35?style=for-the-badge" />
</p>
