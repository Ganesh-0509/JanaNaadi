"""Quick test: fetch real news and process 3 through NLP pipeline."""
import asyncio
from app.ingesters.news_ingester import NewsIngester
from app.services.sentiment_engine import score_sentiment
from app.services.geo_engine import geolocate
from app.services.topic_engine import match_topic

async def test():
    # Step 1: Fetch real news
    ingester = NewsIngester()
    entries = await ingester.fetch()
    print(f"Fetched {len(entries)} real news articles from RSS feeds")

    if not entries:
        print("ERROR: No articles fetched! Check rss_feeds.json")
        return

    # Show a few
    for e in entries[:3]:
        text = e["text"][:100]
        print(f"\n--- Article ---")
        print(f"  Text: {text}...")
        print(f"  Source ID: {e.get('source_id', 'N/A')}")
        print(f"  Location: {e.get('location', 'N/A')}")

    # Step 2: Process one through Gemini NLP
    print("\n\n=== Processing first article through Gemini NLP ===")
    first = entries[0]
    nlp = await score_sentiment(first["text"])
    print(f"  Language: {nlp.language} ({nlp.language_name})")
    print(f"  Sentiment: {nlp.sentiment} (score: {nlp.sentiment_score})")
    print(f"  Confidence: {nlp.confidence}")
    print(f"  Topics: {nlp.topics}")
    print(f"  Keywords: {nlp.keywords}")
    print(f"  Urgency: {nlp.urgency}")
    if nlp.translation:
        print(f"  Translation: {nlp.translation[:100]}")

    # Step 3: Geolocate
    geo = geolocate(first["text"], hints={"location_hint": first.get("location")})
    print(f"\n  Geolocation: {geo}")

    # Step 4: Topic match
    topic_id = match_topic(first["text"], nlp.topics[0] if nlp.topics else None)
    print(f"  Topic ID: {topic_id}")

    print("\n=== PIPELINE WORKING! Real data can flow. ===")

asyncio.run(test())
