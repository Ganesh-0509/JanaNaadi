#!/usr/bin/env python3
"""Debug the constraint violation."""

import asyncio
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

backend_dir = os.path.join(os.path.dirname(__file__), "..")
env_file = os.path.join(backend_dir, ".env")
load_dotenv(env_file)
sys.path.insert(0, backend_dir)

async def debug_constraint():
    from app.routers.ingest import _process_and_store
    from datetime import datetime, timezone
    
    test_text = "Debug test: Power outages in ward"
    
    try:
        entry_id = await _process_and_store(
            text=test_text,
            source="news",  # Must be: twitter, news, reddit, survey, csv, manual
            source_id=f"debug_{hash(test_text)}",
            domain="infrastructure",
            published_at=datetime.now(timezone.utc).isoformat(),
        )
        print(f"Success: {entry_id}")
    except Exception as e:
        print(f"Full error:\n{e}")
        print(f"\nError type: {type(e).__name__}")
        if hasattr(e, 'response'):
            print(f"Response: {e.response}")

if __name__ == "__main__":
    asyncio.run(debug_constraint())
