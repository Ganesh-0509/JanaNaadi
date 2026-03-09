"""Abstract base class for data ingesters."""

from abc import ABC, abstractmethod


class BaseIngester(ABC):
    """All ingesters return a list of dicts with at least: text, location (optional)."""

    @abstractmethod
    async def fetch(self, **kwargs) -> list[dict]:
        """Fetch data from the source. Returns list of {text, location?, source_id?, ...}."""
        ...
