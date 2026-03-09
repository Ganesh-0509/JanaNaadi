"""
JanaNaadi — Ingest Real News Data
Fetches live RSS news and processes through NLP pipeline into Supabase.
Usage: cd backend && python -m data.ingest_real_news
"""

import asyncio
from uuid import uuid4
from datetime import datetime, timezone
from app.ingesters.news_ingester import NewsIngester
from app.services.sentiment_engine import score_sentiment
from app.services.geo_engine import geolocate
from app.services.topic_engine import match_topic
from app.services.dedup_service import normalize_text, text_hash
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))


async def ingest_news():
    print("📰 Fetching real news from RSS feeds...")
    ingester = NewsIngester()
    articles = await ingester.fetch()
    print(f"   Fetched {len(articles)} articles\n")

    stored = 0
    skipped_dup = 0
    errors = 0

    for i, article in enumerate(articles):
        text = article["text"]
        if not text or len(text.strip()) < 10:
            continue

        # Dedup check
        cleaned = normalize_text(text)
        existing = (
            sb.table("sentiment_entries")
            .select("id")
            .eq("source", "news")
            .eq("cleaned_text", cleaned)
            .limit(1)
            .execute()
        )
        if existing.data:
            skipped_dup += 1
            continue

        try:
            # NLP analysis (Gemini with fallback)
            nlp = await score_sentiment(text)

            # Geolocation
            geo = geolocate(text, hints={"location_hint": article.get("location")})

            # Topic matching
            topic_id = match_topic(text, nlp.topics[0] if nlp.topics else None)

            entry = {
                "id": str(uuid4()),
                "source": "news",
                "source_id": article.get("source_id"),
                "source_url": article.get("source_url"),
                "original_text": text[:5000],
                "cleaned_text": cleaned[:5000],
                "language": nlp.language,
                "translated_text": nlp.translation,
                "sentiment": nlp.sentiment,
                "sentiment_score": nlp.sentiment_score,
                "confidence": nlp.confidence,
                "primary_topic_id": topic_id,
                "extracted_keywords": nlp.keywords[:20] if nlp.keywords else [],
                "state_id": geo.get("state_id"),
                "district_id": geo.get("district_id"),
                "constituency_id": geo.get("constituency_id"),
                "ward_id": geo.get("ward_id"),
                "geo_confidence": geo.get("confidence", "unknown"),
                "urgency_score": nlp.urgency,
                "published_at": datetime.now(timezone.utc).isoformat(),
                "processed_at": datetime.now(timezone.utc).isoformat(),
            }
            sb.table("sentiment_entries").insert(entry).execute()
            stored += 1

            sentiment_icon = {"positive": "🟢", "negative": "🔴", "neutral": "🟡"}[nlp.sentiment]
            print(f"  [{stored:3d}] {sentiment_icon} {nlp.sentiment:8s} | {nlp.topics[0]:25s} | {text[:60]}...")

        except Exception as e:
            errors += 1
            print(f"  [ERR] {str(e)[:80]}")
            continue

    print(f"\n{'='*50}")
    print(f"✅ Stored:  {stored} real news entries")
    print(f"⏭️  Skipped: {skipped_dup} duplicates")
    print(f"❌ Errors:  {errors}")
    print(f"\nRefresh your dashboard to see real data!")


if __name__ == "__main__":
    asyncio.run(ingest_news())
