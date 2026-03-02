"""String similarity helpers with a browser-friendly fallback path."""

from difflib import SequenceMatcher

try:
    from rapidfuzz import fuzz
except ImportError:  # pragma: no cover - exercised via fallback tests
    fuzz = None


def similarity_ratio(left, right):
    """Return normalized ratio in [0.0, 1.0]."""
    if fuzz is not None:
        return fuzz.ratio(left, right) / 100.0
    return SequenceMatcher(None, left, right).ratio()
