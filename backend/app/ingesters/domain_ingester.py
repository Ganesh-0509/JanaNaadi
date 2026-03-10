"""Multi-Domain Ingester - Fetches domain-specific intelligence (defense, climate, tech, economics, geopolitics)."""

import asyncio
import json
import logging
import html
import re
from pathlib import Path
from datetime import datetime, timezone
import feedparser

logger = logging.getLogger("jananaadi.domain_ingester")


class DomainIngester:
    """Fetch RSS feeds for specific intelligence domains."""
    
    def __init__(self):
        config_path = Path(__file__).parent.parent.parent / "config" / "domain_feeds.json"
        with open(config_path, "r", encoding="utf-8") as f:
            self.feeds = json.load(f)
    
    @staticmethod
    def _strip_html(text: str) -> str:
        """Remove HTML tags and decode entities."""
        if not text:
            return ""
        text = html.unescape(text)
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    async def fetch_domain(self, domain: str, max_items: int = 20) -> list[dict]:
        """Fetch entries for a specific domain.
        
        Args:
            domain: One of: defense, climate, technology, economics, geopolitics
            max_items: Maximum items per feed
            
        Returns:
            List of entries with text, domain, location_hint, source_id, source_url
        """
        domain_feeds = self.feeds.get(domain, [])
        if not domain_feeds:
            logger.warning(f"No feeds configured for domain: {domain}")
            return []
        
        logger.info(f"Fetching {len(domain_feeds)} feeds for domain: {domain}")
        
        all_entries = []
        loop = asyncio.get_event_loop()
        
        # Process in batches of 10 to avoid overloading
        for i in range(0, len(domain_feeds), 10):
            batch = domain_feeds[i:i+10]
            
            tasks = [
                loop.run_in_executor(None, self._fetch_single_feed, url, domain, max_items)
                for url in batch
            ]
            
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in batch_results:
                if isinstance(result, Exception):
                    logger.error(f"Feed fetch failed: {result}")
                    continue
                if result:
                    all_entries.extend(result)
            
            # Small delay between batches
            if i + 10 < len(domain_feeds):
                await asyncio.sleep(2)
        
        logger.info(f"Fetched {len(all_entries)} entries for domain: {domain}")
        return all_entries
    
    def _fetch_single_feed(self, url: str, domain: str, max_items: int) -> list[dict]:
        """Synchronous RSS feed fetch (runs in executor)."""
        try:
            feed = feedparser.parse(url)
            entries = []
            
            for item in feed.entries[:max_items]:
                title = self._strip_html(item.get("title", ""))
                description = self._strip_html(item.get("description", "") or item.get("summary", ""))
                
                # Combine title and description
                text = f"{title}. {description}".strip()
                
                if not text or len(text) < 50:
                    continue
                
                # Create stable source_id
                link = item.get("link", "")
                published = item.get("published", "")
                source_id = f"{domain}_{hash(link + published)}"
                
                # Extract location hints from text (India-centric)
                location_hint = None
                text_lower = text.lower()
                for state in ["delhi", "mumbai", "kolkata", "chennai", "bengaluru", "hyderabad", "kashmir", "punjab", "haryana", "gujarat", "maharashtra"]:
                    if state in text_lower:
                        location_hint = state
                        break
                
                entries.append({
                    "text": text,
                    "domain": domain,  # IMPORTANT: tag with domain
                    "location_hint": location_hint,
                    "source_id": source_id,
                    "source_url": link,
                })
            
            return entries
        except Exception as e:
            logger.error(f"Failed to fetch {url}: {e}")
            return []
    
    async def fetch_all_domains(self, max_items_per_feed: int = 15) -> dict[str, list]:
        """Fetch all intelligence domains in parallel.
        
        Returns:
            Dict mapping domain name to list of entries
        """
        domains = ["defense", "climate", "technology", "economics", "geopolitics"]
        
        tasks = [
            self.fetch_domain(domain, max_items_per_feed)
            for domain in domains
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        domain_data = {}
        for domain, result in zip(domains, results):
            if isinstance(result, Exception):
                logger.error(f"Failed to fetch domain {domain}: {result}")
                domain_data[domain] = []
            else:
                domain_data[domain] = result
        
        total = sum(len(entries) for entries in domain_data.values())
        logger.info(f"Fetched total {total} entries across all domains")
        
        return domain_data
