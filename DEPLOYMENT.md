# JanaNaadi Deployment Guide

## Prerequisites

1. **Supabase Account** - https://supabase.com
2. **Bytez API Key** - https://bytez.com
3. **Render Account** (or Vercel for frontend) - https://render.com

## Database Setup (Supabase)

### 1. Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - Name: `jananaadi-db`
   - Database Password: (save this securely)
   - Region: Choose closest to India (e.g., Mumbai, Singapore)

### 2. Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Create a new query
3. Copy entire contents of `backend/COMPLETE_DATABASE_SCHEMA.sql`
4. Paste and click **Run**
5. Verify 12 tables created:
   - sentiment_entries
   - knowledge_graph_entities
   - entity_relationships
   - entity_mentions
   - domain_intelligence_scores
   - topics
   - alerts
   - policy_briefs
   - heatmap_snapshots
   - users (via Supabase Auth)

### 3. Enable Row Level Security (RLS)

The schema already includes RLS policies. Verify they're active:
```sql
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```

### 4. Get API Keys

1. Go to **Settings → API**
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_KEY`
   - **service_role key** → `SUPABASE_SERVICE_KEY` (keep secret!)

## Backend Deployment (Render)

### 1. Prepare Repository

Ensure `render.yaml` exists in project root (already included):
```yaml
services:
  - type: web
    name: jananaadi-backend
    runtime: python
    buildCommand: "pip install -r backend/requirements.txt"
    startCommand: "cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: PYTHON_VERSION
        value: 3.11
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_KEY
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
      - key: BYTEZ_API_KEY
        sync: false
```

### 2. Deploy to Render

1. Go to https://render.com/dashboard
2. Click **New → Web Service**
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml`
5. Click **Create Web Service**

### 3. Set Environment Variables

In Render dashboard, go to **Environment** and add:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
BYTEZ_API_KEY=your-bytez-api-key
BYTEZ_MODEL=google/gemini-2.5-flash
GEMINI_API_KEY=your-gemini-key (optional fallback)
```

### 4. Verify Deployment

1. Wait for build to complete (~5 minutes)
2. Visit `https://your-service.onrender.com/docs`
3. Test API endpoints (health check, public sentiment)

## Frontend Deployment (Render)

### 1. Add Frontend to render.yaml

Already configured in `render.yaml`:
```yaml
  - type: web
    name: jananaadi-frontend
    runtime: node
    buildCommand: "cd frontend && npm install && npm run build"
    startCommand: "cd frontend && npm run preview -- --host 0.0.0.0 --port $PORT"
    envVars:
      - key: VITE_API_URL
        value: https://your-backend.onrender.com
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_ANON_KEY
        sync: false
```

### 2. Set Frontend Environment Variables

```env
VITE_API_URL=https://jananaadi-backend.onrender.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Verify Deployment

Visit `https://your-frontend.onrender.com`

## Alternative: Frontend on Vercel

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Deploy

```bash
cd frontend
vercel --prod
```

### 3. Configure Environment Variables

In Vercel dashboard:
- `VITE_API_URL` → Backend URL
- `VITE_SUPABASE_URL` → Supabase URL
- `VITE_SUPABASE_ANON_KEY` → Supabase anon key

## Post-Deployment Setup

### 1. Create Admin User

```bash
# SSH into Render backend or run locally pointing to production DB
cd backend
python set_admin_role.py
# Enter email of user who has signed up via frontend
```

### 2. Start Auto-Ingestion

The scheduler starts automatically with FastAPI. Verify in logs:
```
INFO:     Scheduler started
INFO:     Job 'ingest_news_feeds' scheduled
```

### 3. Seed Initial Data (Optional)

```bash
cd backend/data
# Update .env to point to production Supabase
python ingest_real_news.py
```

### 4. Test Knowledge Graph

1. Sign up at `https://your-frontend.com/login`
2. Promote yourself to admin using `set_admin_role.py`
3. Navigate to `/ontology`
4. Trigger entity extraction:
   ```bash
   curl -X POST https://your-backend.com/api/ontology/extract-batch \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## Monitoring

### Backend Logs (Render)

```bash
# In Render dashboard
Logs → Filter by service → jananaadi-backend
```

Watch for:
- `Scheduler started` - Cron jobs active
- `Processing X entries for entity extraction` - Ontology engine working
- `ERROR` lines - Issues to investigate

### Performance Metrics

- **Response Time**: Monitor `/docs` endpoint latency
- **Scheduler Status**: Check logs for successful ingestion runs
- **Database Performance**: Supabase dashboard → Database → Performance

### Alerts

Set up Render alerts for:
- Service downtime
- High memory usage (>80%)
- Build failures

## Troubleshooting

### Issue: "Column 'domain' does not exist"

**Solution**: Database schema not fully applied. Re-run `COMPLETE_DATABASE_SCHEMA.sql` in Supabase SQL Editor.

### Issue: "Bytez API quota exceeded"

**Solution**: 
1. Check Bytez dashboard for usage limits
2. Temporarily disable auto-extraction in `app/main.py`:
   ```python
   # Comment out scheduler job
   # scheduler.add_job(...)
   ```

### Issue: Frontend shows "Network Error"

**Causes**:
1. Backend not deployed → Check Render logs
2. CORS issue → Verify `CORS_ORIGINS` in backend `.env`
3. Wrong `VITE_API_URL` → Check frontend env vars

**Solution**: Update backend `app/core/settings.py`:
```python
CORS_ORIGINS = [
    "http://localhost:5173",
    "https://your-frontend.onrender.com",
    "https://your-custom-domain.com"
]
```

### Issue: Scheduler not running

**Check**: Render logs should show:
```
INFO:     Scheduler started
```

If missing:
1. Verify `app/main.py` includes scheduler startup
2. Check for errors in `@app.on_event("startup")` function
3. Ensure APScheduler is in `requirements.txt`

### Issue: Knowledge Graph shows no data

**Solutions**:
1. **Check entity extraction ran**: 
   ```sql
   SELECT COUNT(*) FROM knowledge_graph_entities;
   ```
   If 0, run extraction endpoint
   
2. **Manually trigger extraction**:
   ```bash
   curl -X POST https://your-backend.com/api/ontology/extract-batch
   ```

3. **Verify Bytez API key**: Check backend logs for API errors

## Scaling Considerations

### Database

- **Free tier**: 500MB storage, suitable for demo
- **Upgrade**: Pro plan ($25/mo) for 8GB + better performance

### Backend (Render)

- **Free tier**: Spins down after 15 min inactivity
- **Production**: Starter plan ($7/mo) for always-on service
- **Scaling**: Add more workers if handling >100 req/min

### Frontend

- **Render**: Free tier sufficient (static files)
- **Vercel**: Better global CDN for faster load times

## Security Checklist

- [ ] All `.env` files in `.gitignore`
- [ ] Service role key never exposed to frontend
- [ ] RLS policies enabled on all Supabase tables
- [ ] CORS origins restricted to production domains
- [ ] Bytez API key rotated if accidentally exposed
- [ ] Admin users manually approved (not auto-granted)

## Backup Strategy

### Database Backups (Supabase)

- **Automatic**: Daily backups on paid plans
- **Manual**: 
  ```bash
  # Download data via Supabase dashboard
  Projects → Database → Backups → Download
  ```

### Code Backups

- GitHub repository (already done)
- Tag releases: `git tag v1.0.0 && git push --tags`

## Maintenance

### Weekly

- [ ] Check Render logs for errors
- [ ] Verify scheduler ran successfully
- [ ] Monitor Supabase storage usage

### Monthly

- [ ] Review Bytez API usage and costs
- [ ] Clean up old heatmap snapshots (>30 days)
- [ ] Update dependencies: `pip list --outdated`

### Before Hackathon Demo

- [ ] Full deployment test (fresh database)
- [ ] Seed realistic data (50+ entries)
- [ ] Test all key features (graph, heatmap, search)
- [ ] Prepare rollback plan if issues occur

## Cost Estimate

### Free Tier (Demo)
- Supabase: Free (500MB)
- Render Backend: Free (spins down)
- Render Frontend: Free
- Bytez: Free tier (1000 requests/month)
- **Total**: $0/month

### Production (Hackathon Submission)
- Supabase Pro: $25/month
- Render Backend Starter: $7/month
- Render Frontend: Free
- Bytez Standard: ~$20/month
- **Total**: ~$52/month

### Scalable (Post-Hackathon)
- Supabase Pro: $25/month
- Render Standard (2GB): $25/month
- CDN (Cloudflare): Free
- Bytez Pro: $50/month
- **Total**: ~$100/month

---

**Last Updated**: January 2026  
**Maintainer**: JanaNaadi Team  
**Support**: See ONTOLOGY_README.md for technical details
