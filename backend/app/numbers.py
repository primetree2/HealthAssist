"""Locale-aware bounded numeric and interval parsing. No units are invented."""

import math
import re
import unicodedata
from dataclasses import dataclass, field

NUM = r"[+\-]?(?:\d[\d,]*(?:\.\d+)?|\.\d+)(?:[eE][+\-]?\d{1,3})?"
VALUE_RE = re.compile(
    r"^\s*(?P<cmp>[<>]=?|[≤≥])?\s*(?P<num>" + NUM + r")(?=$|\s|[%a-zA-Zµμ/×^*])"
)
RANGE_RE = re.compile(
    r"^\s*[\[(]?\s*(?P<low>"
    + NUM
    + r")\s*(?:[-–—]|\bto\b)\s*(?P<high>"
    + NUM
    + r")\s*[\])]?\s*$",
    re.I,
)
RANGE_SEARCH = re.compile(
    r"(?<![\w^])(?P<low>"
    + NUM
    + r")\s*(?:[-–—]|\bto\b)\s*(?P<high>"
    + NUM
    + r")(?![\d.])",
    re.I,
)
QUAL = re.compile(
    r"^(?:non[ -]?reactive|not detected|not reported|not done|not available|negative|positive|reactive|equivocal|indeterminate|inconclusive|trace|absent|present|normal|nil|n/?a|nd|nr|\+{1,4}|--)(?:\s|$)",
    re.I,
)


def text_normalize(s: str) -> str:
    # Preserve superscript exponents until unit parsing; normalize only decimal digits.
    out = []
    for c in s.replace("−", "-").replace("\u00a0", " "):
        if c.isdecimal():
            try:
                c = str(unicodedata.decimal(c))
            except ValueError:
                pass
        out.append(c)
    return "".join(out)


@dataclass
class Number:
    value: float | None = None
    comparator: str = ""
    qualitative: str = ""
    issues: list[str] = field(default_factory=list)


def parse_number(s: str) -> Number:
    s = text_normalize(s).strip()
    if not s:
        return Number(issues=["Result is empty."])
    q = QUAL.match(s)
    if q and q.end() == len(s):
        return Number(qualitative=q.group().strip())
    m = VALUE_RE.fullmatch(s)
    if not m:
        return Number(
            issues=[
                "Result is not an unambiguous numeric or supported qualitative value."
            ]
        )
    n = m.group("num")
    issues = []
    if "," in n:
        if re.fullmatch(r"[+\-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?", n) or re.fullmatch(
            r"[+\-]?\d{1,2}(?:,\d{2})+,\d{3}(?:\.\d+)?", n
        ):
            n = n.replace(",", "")
            issues.append(
                "Grouped commas were interpreted as thousands separators; verify the original value."
            )
        elif "." not in n and n.count(",") == 1 and len(n.split(",")[1]) in (1, 2):
            n = n.replace(",", ".")
            issues.append(
                "A decimal comma was interpreted as a decimal point; verify the original value."
            )
        else:
            return Number(
                issues=["Ambiguous numeric separators; verify the original value."]
            )
    try:
        v = float(n)
    except ValueError:
        return Number(issues=["Numeric value could not be read."])
    if not math.isfinite(v) or abs(v) > 1e12:
        return Number(
            issues=[
                "Numeric magnitude is outside the supported parsing bounds; verify it with the laboratory."
            ]
        )
    cmp = {"<=": "≤", ">=": "≥"}.get(m.group("cmp"), m.group("cmp") or "")
    return Number(v, cmp, issues=issues)


@dataclass
class Reference:
    low: float | None = None
    high: float | None = None
    low_inclusive: bool = True
    high_inclusive: bool = True
    valid: bool = False
    issues: list[str] = field(default_factory=list)


def parse_reference(s: str) -> Reference:
    s = text_normalize(s).strip()
    if not s:
        return Reference()
    m = RANGE_RE.fullmatch(s)
    if m:
        lo = parse_number(m.group("low"))
        hi = parse_number(m.group("high"))
        if (
            lo.value is None
            or hi.value is None
            or lo.issues
            or hi.issues
            or lo.value > hi.value
        ):
            return Reference(issues=["Reference interval is ambiguous or reversed."])
        return Reference(lo.value, hi.value, valid=True)
    v = parse_number(s)
    if v.value is not None and v.comparator and not v.issues:
        if v.comparator in ("<", "≤"):
            return Reference(
                high=v.value, high_inclusive=v.comparator == "≤", valid=True
            )
        return Reference(low=v.value, low_inclusive=v.comparator == "≥", valid=True)
    if not QUAL.fullmatch(s):
        return Reference(
            issues=[
                "Reference text is not a single supported numeric interval; verify age-, method-, or sex-specific intervals manually."
            ]
        )
    return Reference()


def compare(value: Number, ref: Reference) -> str:
    if value.value is None or not ref.valid:
        return "needs_review"
    v = value.value
    # Represent both result and reference as mathematical intervals, preserving open boundaries.
    left = right = v
    li = ri = True
    if value.comparator in ("<", "≤"):
        left = -math.inf
        li = False
        ri = value.comparator == "≤"
    if value.comparator in (">", "≥"):
        right = math.inf
        ri = False
        li = value.comparator == "≥"
    rlo = ref.low if ref.low is not None else -math.inf
    rhi = ref.high if ref.high is not None else math.inf
    if right < rlo or (right == rlo and not (ri and ref.low_inclusive)):
        return "below_report_range"
    if left > rhi or (left == rhi and not (li and ref.high_inclusive)):
        return "above_report_range"
    contains_left = left > rlo or (left == rlo and (not li or ref.low_inclusive))
    contains_right = right < rhi or (right == rhi and (not ri or ref.high_inclusive))
    if contains_left and contains_right:
        return "within_report_range"
    return "needs_review"


# Each dimension has explicit scale-to-base units. Analyte conversions are separate.
def normalize_unit(unit: str) -> str:
    s = (
        unit.strip()
        .casefold()
        .replace("μ", "u")
        .replace("µ", "u")
        .replace("mc", "u")
        .replace("³", "3")
        .replace("⁹", "9")
        .replace("⁶", "6")
        .replace("²", "2")
    )
    s = (
        s.replace("×", "x")
        .replace("**", "^")
        .replace("litre", "l")
        .replace("liter", "l")
    )
    s = (
        re.sub(r"\s+", "", s)
        .replace("cells/", "/")
        .replace("cell/", "/")
        .replace("per", "/")
        .replace("million", "10^6")
        .replace("thousand", "10^3")
    )
    s = re.sub(r"10\*(3|6|9|12)(?=/)", r"10^\1", s)
    s = (
        s.replace("x10", "10")
        .replace("*10", "10")
        .replace("10^", "10")
        .replace("cumm", "ul")
        .replace("cu.mm", "ul")
        .replace("mm3", "ul")
    )
    return s


UNIT_GROUPS = [
    {"g/dl": 1.0, "g/l": 0.1, "mg/dl": 0.001},
    {"mg/dl": 1.0, "mg/l": 0.1, "g/l": 100.0},
    {"ng/ml": 1.0, "ug/l": 1.0, "pg/ml": 0.001, "ng/l": 0.001},
    {"pg/ml": 1.0, "ng/l": 1.0, "ng/ml": 1000.0, "ug/l": 1000.0},
    {"/ul": 1.0, "103/ul": 1000.0, "109/l": 1000.0, "106/ul": 1e6, "1012/l": 1e6},
    {"%": 1.0},
    {"fl": 1.0},
    {"pg": 1.0},
    {"u/l": 1.0, "iu/l": 1.0},
    {"meq/l": 1.0},
    {"mmol/l": 1.0},
    {"miu/l": 1.0, "uiu/ml": 1.0},
    {"uiu/ml": 1.0, "miu/l": 1.0},
    {"ug/dl": 1.0},
    {"ng/dl": 1.0},
    {"seconds": 1.0, "sec": 1.0, "s": 1.0},
    {"ratio": 1.0},
    {"mm/hr": 1.0, "mm/h": 1.0},
    {"ml/min/1.73m2": 1.0},
]


def convert(
    value: float, unit: str, entry: dict
) -> tuple[float | None, str | None, str | None]:
    canonical = entry.get("unit", "")
    src = normalize_unit(unit)
    dst = normalize_unit(canonical)
    if not src:
        return None, None, "The report unit is missing. It was not inferred."
    if src == dst:
        return value, canonical, None
    name = entry["name"]
    special = {
        "Glucose, Fasting": {"mmol/l": 18.0182},
        "Glucose, Postprandial": {"mmol/l": 18.0182},
        "Glucose, Random": {"mmol/l": 18.0182},
        "Creatinine": {"umol/l": 1 / 88.4},
        "Urea": {"mmol/l": 6.006},
        "Blood Urea Nitrogen": {"mmol/l": 2.801},
        "Total Cholesterol": {"mmol/l": 38.67},
        "High-Density Lipoprotein": {"mmol/l": 38.67},
        "Low-Density Lipoprotein": {"mmol/l": 38.67},
        "Non-HDL Cholesterol": {"mmol/l": 38.67},
        "Triglycerides": {"mmol/l": 88.57},
        "Vitamin D, 25-OH": {"nmol/l": 1 / 2.496},
        "Vitamin B12": {"pmol/l": 1.355},
        "Sodium": {"mmol/l": 1.0},
        "Potassium": {"mmol/l": 1.0},
        "Chloride": {"mmol/l": 1.0},
        "Bicarbonate (CO2)": {"mmol/l": 1.0},
    }
    if src in special.get(name, {}):
        return value * special[name][src], canonical, None
    for group in UNIT_GROUPS:
        if src in group and dst in group:
            return value * group[src] / group[dst], canonical, None
    return (
        None,
        None,
        "This unit conversion is unsupported; the value was not relabeled or converted.",
    )
