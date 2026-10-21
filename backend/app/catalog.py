"""Only exact, normalized aliases auto-match; similarity is never a clinical decision."""

import json
import re
import unicodedata
from pathlib import Path

CATALOG = json.loads((Path(__file__).parent / "data" / "catalog.json").read_text())


def normalize_name(value: str) -> str:
    s = unicodedata.normalize("NFKC", value).casefold().replace("&", " and ")
    return re.sub(r"[^a-z0-9]", "", s)


LOOKUP: dict[str, list[dict]] = {}
for entry in CATALOG:
    for alias in [entry["name"], *entry["aliases"]]:
        key = normalize_name(alias)
        if entry not in LOOKUP.setdefault(key, []):
            LOOKUP[key].append(entry)

# Abbreviations whose meanings depend on the panel must not be guessed.
AMBIGUOUS = {"pct", "t3freeortotal", "t4freeortotal"}


def match_name(name: str):
    key = normalize_name(name)
    candidates = LOOKUP.get(key, [])
    if key in AMBIGUOUS or len(candidates) > 1:
        return None, "ambiguous"
    return (candidates[0], "exact") if candidates else (None, "unknown")


# Anchored text parsing handles numbers inside test names (B12, HbA1c, CA-125).
ALIASES = sorted(
    {a for t in CATALOG for a in [t["name"], *t["aliases"]]}, key=len, reverse=True
)
PREFIXES = []
for alias in ALIASES:
    parts = re.findall(r"[A-Za-z0-9]+", alias)
    if parts:
        pattern = (
            r"^\s*(?:\d{1,3}[.)]\s*)?"
            + r"[\s,():/._\-–]*".join(map(re.escape, parts))
            + r"(?![A-Za-z0-9])\s*[*#]?\s*[:|]?\s*"
        )
        PREFIXES.append((re.compile(pattern, re.I), alias))
