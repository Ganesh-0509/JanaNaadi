"""CSV file ingester."""

import csv
import io
from app.ingesters.base_ingester import BaseIngester


class CSVIngester(BaseIngester):
    """Parse uploaded CSV files into text entries."""

    def __init__(self, file_content: str):
        self._content = file_content

    async def fetch(self, **kwargs) -> list[dict]:
        reader = csv.DictReader(io.StringIO(self._content))
        entries = []

        for row in reader:
            text = row.get("text") or row.get("feedback") or row.get("comment", "")
            if not text or len(text.strip()) < 5:
                continue
            entries.append({
                "text": text.strip(),
                "location": row.get("location") or row.get("area"),
                "source_id": row.get("id"),
            })

        return entries
