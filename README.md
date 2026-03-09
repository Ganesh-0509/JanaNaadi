# JanaNaadi — India's Real-Time Public Sentiment Intelligence Platform

> **"JanaNaadi"** = "Pulse of the People" (Jana = People, Naadi = Pulse)

## Overview

JanaNaadi is an AI-powered multilingual sentiment intelligence platform that aggregates citizen voice from social media, news, and surveys — and maps it to India's democratic geography (booth → ward → constituency → district → state) with real-time heatmaps, trend detection, and auto-generated policy briefs for governance leaders.

## Tech Stack

- **Backend:** FastAPI (Python), Supabase (PostgreSQL), Google Gemini 2.0 Flash, scikit-learn
- **Frontend:** React 18 + TypeScript, Vite, Leaflet.js, Recharts, Tailwind CSS
- **NLP:** Gemini API (multilingual sentiment + topic extraction + translation), ML fallback classifier

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Fill in your keys
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env  # Fill in your keys
npm run dev
```

## Project Structure

```
jananaadi/
├── backend/          # FastAPI API server
│   ├── app/
│   │   ├── core/     # Settings, auth, DB client, cache
│   │   ├── routers/  # API endpoint handlers
│   │   ├── services/ # Business logic (NLP, alerts, briefs)
│   │   ├── ingesters/# Data source connectors
│   │   ├── ml/       # Fallback ML sentiment model
│   │   ├── models/   # Pydantic schemas
│   │   └── data/     # Static data files
│   └── config/       # External config (RSS feeds, keywords)
├── frontend/         # React + TypeScript dashboard
│   └── src/
│       ├── pages/    # Route-level page components
│       ├── components/# Reusable UI components
│       ├── api/      # API client layer
│       ├── hooks/    # Custom React hooks
│       ├── context/  # React Context providers
│       └── utils/    # Helpers and formatters
└── data/             # Seed data generation scripts
```

## Environment Variables

### Backend (.env)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
TWITTER_BEARER_TOKEN=your-twitter-token (optional)
REDDIT_CLIENT_ID=your-reddit-id (optional)
REDDIT_CLIENT_SECRET=your-reddit-secret (optional)
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## License

Built for India Innovates 2026 Hackathon — Digital Democracy Track
