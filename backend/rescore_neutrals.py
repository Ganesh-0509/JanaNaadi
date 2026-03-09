"""Re-score entries that have sentiment_score=0 using the Bytez NLP pipeline."""
import asyncio
from app.core.supabase_client import get_supabase_admin
from app.services.sentiment_engine import score_sentiment


async def rescore():
    sb = get_supabase_admin()
    
    # Get entries with score=0 (these were fallback-scored as neutral)
    result = sb.table("sentiment_entries").select(
        "id, cleaned_text, sentiment, sentiment_score"
    ).eq("sentiment_score", 0).execute()
    
    entries = result.data or []
    print(f"Found {len(entries)} entries with sentiment_score=0")
    
    success = 0
    failed = 0
    for i, entry in enumerate(entries):
        text = entry.get("cleaned_text", "")
        if not text or len(text) < 10:
            continue
        
        try:
            nlp = await score_sentiment(text)
            
            update = {
                "sentiment": nlp.sentiment,
                "sentiment_score": nlp.sentiment_score,
                "confidence": nlp.confidence,
            }
            # Only update language if we got a real one
            if nlp.language and nlp.language != "en":
                update["language"] = nlp.language
            if nlp.translation:
                update["translated_text"] = nlp.translation
            if nlp.topics:
                # Match topic to taxonomy
                from app.services.topic_engine import match_topic
                topic_id = match_topic(text, nlp.topics[0])
                if topic_id:
                    update["primary_topic_id"] = topic_id
            if nlp.keywords:
                update["extracted_keywords"] = nlp.keywords
            
            sb.table("sentiment_entries").update(update).eq("id", entry["id"]).execute()
            success += 1
            
            label = f"{nlp.sentiment} ({nlp.sentiment_score})"
            print(f"  [{i+1}/{len(entries)}] {label} - {text[:60]}...")
            
        except Exception as e:
            failed += 1
            print(f"  [{i+1}/{len(entries)}] FAILED: {e}")
        
        # Small delay to avoid rate limits
        if (i + 1) % 10 == 0:
            await asyncio.sleep(1)
    
    print(f"\nDone! Success: {success}, Failed: {failed}")


if __name__ == "__main__":
    asyncio.run(rescore())
