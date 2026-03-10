# JanaNaadi — India's Real-Time Public Sentiment Intelligence Platform
## AI-Powered Global Ontology Engine

> **"JanaNaadi"** = "Pulse of the People" (Jana = People, Naadi = Pulse)

## Overview

JanaNaadi is an AI-powered multilingual sentiment intelligence platform that combines:
- **Sentiment Intelligence**: Aggregates citizen voices from social media, news, and surveys
- **Knowledge Graph**: Extracts entities and relationships using AI (Problem Statement #1)
- **Geographic Mapping**: Maps to India's democratic geography (booth → ward → constituency → district → state)
- **Multi-Domain Intelligence**: Tracks 6 strategic domains (geopolitics, economics, defense, climate, technology, society)
- **Real-time Analytics**: Heatmaps, trend detection, and auto-generated policy briefs

**Built for India Innovates 2026 — Digital Democracy Track**

## Tech Stack

- **Backend:** FastAPI (Python), Supabase (PostgreSQL), Bytez AI (Gemini 2.5 Flash)
- **Frontend:** React 18 + TypeScript, Vite, D3.js, Leaflet.js, Recharts, Tailwind CSS
- **NLP:** Bytez API (multilingual sentiment + entity extraction + translation)
- **Knowledge Graph:** PostgreSQL with entities, relationships, and domain intelligence
- **Real-time:** APScheduler (auto-ingestion), WebSocket (live updates)

## Quick Start

### 1. Database Setup (Supabase)
```bash
# Run the complete schema in Supabase SQL Editor
# File: backend/COMPLETE_DATABASE_SCHEMA.sql
# This creates all 12 tables, indexes, triggers, and functions
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Fill in your Supabase & Bytez API keys
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env  # Fill in your Supabase URL and anon key
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Knowledge Graph**: http://localhost:5173/ontology (requires login)

## Project Structure

```
JanaNaadi/
├── backend/                    # FastAPI API server
│   ├── app/
│   │   ├── core/              # Settings, auth, DB client, cache
│   │   ├── routers/           # API endpoint handlers
│   │   │   ├── public.py      # Public sentiment APIs
│   │   │   ├── ontology.py    # Knowledge graph APIs ✨
│   │   │   ├── analysis.py    # Analysis & summaries
│   │   │   └── ...
│   │   ├── services/          # Business logic
│   │   │   ├── entity_service.py   # AI entity extraction ✨
│   │   │   ├── nlp_service.py      # Sentiment analysis
│   │   │   └── ...
│   │   ├── ingesters/         # Data source connectors
│   │   │   ├── domain_ingester.py  # Multi-domain RSS ✨
│   │   │   └── ...
│   │   ├── models/            # Pydantic schemas
│   │   │   ├── entity_schemas.py   # Entity models ✨
│   │   │   └── schemas.py
│   │   └── data/              # Static data files
│   ├── config/
│   │   ├── domain_feeds.json       # 32 domain RSS feeds ✨
│   │   └── rss_feeds.json          # General news feeds
│   ├── COMPLETE_DATABASE_SCHEMA.sql # Single-file deployment ✨
│   └── requirements.txt
├── frontend/                   # React + TypeScript dashboard
│   └── src/
│       ├── pages/
│       │   ├── OntologyPage.tsx    # Knowledge graph UI ✨
│       │   └── ...
│       ├── components/
│       │   ├── KnowledgeGraph.tsx  # D3.js visualization ✨
│       │   └── ...
│       ├── api/
│       │   ├── ontology.ts         # Ontology APIs ✨
│       │   └── ...
│       └── hooks/
│           ├── useKnowledgeGraph.ts # Graph hooks ✨
│           └── ...
├── ONTOLOGY_README.md         # Technical docs ✨
├── PS1_ALIGNMENT_CHECK.md     # Hackathon alignment ✨
└── README.md                  # This file
```
**✨ = New for Global Ontology Engine (PS#1)**

## Environment Variables

### Backend (.env)
```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Bytez AI (Primary - for NLP & Entity Extraction)
BYTEZ_API_KEY=your-bytez-api-key
BYTEZ_MODEL=google/gemini-2.5-flash

# Gemini (Fallback)
GEMINI_API_KEY=your-gemini-api-key

# Optional Data Sources
TWITTER_BEARER_TOKEN=your-twitter-token
REDDIT_CLIENT_ID=your-reddit-id
REDDIT_CLIENT_SECRET=your-reddit-secret
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## License

Built for India Innovates 2026 Hackathon — Digital Democracy Track
