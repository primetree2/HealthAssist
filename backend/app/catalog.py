"""Only exact, normalized aliases auto-match; similarity is never a clinical decision."""

import json
import re
import unicodedata
from .numbers import normalize_unit
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


DIFFERENTIAL_ABSOLUTE = {
    "Neutrophils": "Absolute Neutrophil Count",
    "Lymphocytes": "Absolute Lymphocyte Count",
    "Monocytes": "Absolute Monocyte Count",
    "Eosinophils": "Absolute Eosinophil Count",
    "Basophils": "Absolute Basophil Count",
}
COUNT_UNITS = {"/ul", "103/ul", "109/l", "106/ul", "1012/l"}


def match_name(name: str, unit: str = "", section: str = ""):
    key = normalize_name(name)
    candidates = LOOKUP.get(key, [])
    if key in AMBIGUOUS or len(candidates) > 1:
        return None, "ambiguous"
    if candidates:
        entry = candidates[0]
        absolute = DIFFERENTIAL_ABSOLUTE.get(entry["name"])
        # A cell-count unit or explicit absolute-count panel resolves these shared
        # printed names. Percent and absolute observations must never collapse.
        if absolute and (
            normalize_unit(unit) in COUNT_UNITS
            or re.search(r"\babsolute\b", section, re.I)
        ):
            return LOOKUP[normalize_name(absolute)][0], "exact"
        return entry, "exact"
    return None, "unknown"


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
