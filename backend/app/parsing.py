"""Multi-strategy text/table parsing with visible rejection and provenance."""

import re
from collections import defaultdict
from .catalog import PREFIXES, match_name, normalize_name
from .models import RawObservation
from .numbers import NUM, QUAL, RANGE_SEARCH, VALUE_RE, text_normalize

HEADER_KEYS = {
    "name": (
        "testname",
        "test",
        "investigation",
        "investigations",
        "parameter",
        "parameters",
        "analyte",
        "examination",
        "testdescription",
        "description",
    ),
    "result": (
        "result",
        "results",
        "value",
        "observedvalue",
        "observedresult",
        "reportedresult",
        "measuredvalue",
        "measuredresult",
        "finding",
        "findings",
        "patientvalue",
    ),
    "unit": ("unit", "units", "uom", "reportedunit"),
    "reference_text": (
        "referencerange",
        "biologicalreferenceinterval",
        "biologicalreferencerange",
        "referenceinterval",
        "biologicalreference",
        "biologicalrefrange",
        "labinterval",
        "normalrange",
        "normalvalue",
        "normalvalues",
        "referencevalue",
        "referencevalues",
        "refinterval",
        "refrange",
        "range",
        "interval",
    ),
    "flag": ("flag", "flags", "abnormalflag", "interpretation"),
    "report_date": ("date", "collectiondate", "sampledate", "reportdate"),
}
HEADER_MAP = {a: k for k, vals in HEADER_KEYS.items() for a in vals}
SKIP = re.compile(
    r"^(?:name\s*:|patient\s*(?:name|id)|age\s*:|sex\s*:|gender\s*:|report\s*(?:date|id|no)|sample\s*(?:id|no|date)|page\s*\d|method\s*:|collected\s*:|received\s*:|printed\s*:|address\s*:|phone\s*:|mobile\s*:|consultant\s*:|referred\s*:|reference\s*:|end of report|note\s*:)",
    re.I,
)
FLAG_RE = re.compile(r"\s+(HH|LL|H|L|HIGH|LOW|CRITICAL|PANIC|ABNORMAL|\*)\s*$", re.I)


class ParseAccumulator:
    def __init__(self):
        self.items = []
        self.unparsed = []
        self.ignored = 0
        self.warnings = []

    def reject(self, line: str):
        self.ignored += 1
        if len(self.unparsed) < 30:
            self.unparsed.append(line[:240])

    def add(self, **kwargs):
        if len(self.items) >= 300:
            if (
                "Observation limit reached; additional rows were not processed."
                not in self.warnings
            ):
                self.warnings.append(
                    "Observation limit reached; additional rows were not processed."
                )
            return
        # All sizes bounded before entering the validated API model.
        for key, size in [
            ("name", 160),
            ("result", 160),
            ("unit", 80),
            ("reference_text", 240),
            ("flag", 30),
            ("source_text", 600),
            ("report_date", 40),
        ]:
            if key in kwargs:
                kwargs[key] = str(kwargs[key])[:size].strip()
        self.items.append(RawObservation(**kwargs))


def header_segments(row):
    found = []
    for i, cell in enumerate(row):
        key = HEADER_MAP.get(normalize_name(str(cell)))
        if key:
            found.append((i, key))
    names = [i for i, k in found if k == "name"]
    segments = []
    for ix, start in enumerate(names):
        stop = names[ix + 1] if ix + 1 < len(names) else len(row)
        mapping = {k: i for i, k in found if start <= i < stop}
        if "result" in mapping:
            segments.append(mapping)
    return segments


def split_result_cell(cell: str):
    """Separate an attached unit from a value without consuming digits in that unit."""
    s = text_normalize(cell).strip()
    q = QUAL.match(s)
    if q and not s[q.end() :].strip():
        return s, ""
    m = VALUE_RE.match(s)
    if not m:
        return s, ""
    result = s[: m.end()].strip()
    tail = s[m.end() :].strip()
    return result, tail


def parse_rows(rows, acc: ParseAccumulator, kind="table", page=None, section=""):
    segments = []
    for rowno, row in enumerate(rows, 1):
        if rowno > 20000:
            acc.warnings.append("Row limit reached; remaining rows were not processed.")
            break
        row = [text_normalize(str(c or "")).strip() for c in row]
        if not any(row):
            continue
        headers = header_segments(row)
        if headers:
            segments = headers
            continue
        if not segments:
            # Headerless tables require an exact known analyte and a distinct result column.
            if len(row) >= 2 and match_name(row[0])[1] == "exact":
                segments_for_row = [{"name": 0, "result": 1}]
                if len(row) >= 3:
                    if RANGE_SEARCH.search(row[2]) or re.match(r"^[<>≤≥]", row[2]):
                        segments_for_row[0]["reference_text"] = 2
                    else:
                        segments_for_row[0]["unit"] = 2
                if len(row) >= 4:
                    segments_for_row[0]["reference_text"] = 3
            else:
                if any(re.search(r"\d", c) for c in row) and not SKIP.search(
                    " ".join(row)
                ):
                    acc.reject(" | ".join(row))
                continue
        else:
            segments_for_row = segments
        for mapping in segments_for_row:
            fields = {
                key: (row[idx] if idx < len(row) else "")
                for key, idx in mapping.items()
            }
            if not fields.get("name") or not fields.get("result"):
                continue
            if SKIP.search(fields["name"]):
                continue
            # Multi-line table cells: only align them when lengths are provably equal.
            names = fields["name"].splitlines()
            vals = fields["result"].splitlines()
            if len(names) > 1 or len(vals) > 1:
                if len(names) == len(vals):
                    for j, (name, val) in enumerate(zip(names, vals)):
                        sub = []
                        for k in [
                            "name",
                            "result",
                            "unit",
                            "reference_text",
                            "flag",
                            "report_date",
                        ]:
                            bits = fields.get(k, "").splitlines()
                            sub.append(
                                bits[j]
                                if len(bits) == len(names)
                                else (fields.get(k, "") if len(bits) <= 1 else "")
                            )
                        parse_rows(
                            [
                                [
                                    "Test",
                                    "Result",
                                    "Unit",
                                    "Reference Range",
                                    "Flag",
                                    "Date",
                                ],
                                sub,
                            ],
                            acc,
                            kind,
                            page,
                            section,
                        )
                    continue
                acc.add(
                    **fields,
                    page=page,
                    source_kind=kind,
                    source_row=rowno,
                    source_section=section,
                    source_text=" | ".join(row),
                    issues=["Multi-line table columns could not be aligned reliably."],
                )
                continue
            result, attached = split_result_cell(fields["result"])
            fields["result"] = result
            issues = []
            if not fields.get("unit") and attached:
                f = FLAG_RE.search(" " + attached)
                if f and f.start() == 0:
                    fields["flag"] = f.group(1)
                    attached = ""
                fields["unit"] = attached
            elif (
                attached
                and fields.get("unit")
                and attached.casefold() != fields["unit"].casefold()
            ):
                issues.append(
                    "Result cell has extra text or a unit that conflicts with the unit column."
                )
            acc.add(
                **fields,
                page=page,
                source_kind=kind,
                source_row=rowno,
                source_section=section,
                source_text=" | ".join(row),
                issues=issues,
            )


def parse_text(text, acc: ParseAccumulator, page=None, kind="text"):
    lines = text_normalize(text).splitlines()
    # Coordinate-derived columns frequently retain runs of spaces or tabs.
    column_rows = []
    has_header = False
    for line in lines:
        columns = re.split(r"\t+|\s{2,}|\s*\|\s*", line.strip())
        if len(columns) > 1:
            column_rows.append(columns)
            has_header = has_header or bool(header_segments(columns))
    if has_header:
        parse_rows(column_rows, acc, kind, page)
    for rowno, line in enumerate(lines, 1):
        line = line.strip()
        if not line or len(line) > 1200 or SKIP.search(line):
            continue
        # Column/header path above owns these lines to avoid a second conflicting parse.
        if has_header and len(re.split(r"\t+|\s{2,}|\s*\|\s*", line)) > 1:
            continue
        name = ""
        tail = ""
        for pattern, _alias in PREFIXES:
            m = pattern.match(line)
            if m and (VALUE_RE.match(line[m.end() :]) or QUAL.match(line[m.end() :])):
                name = line[: m.end()].strip(" :|*#")
                tail = line[m.end() :].strip()
                break
        if not name:
            # Unknown analytes stay visible, but are never silently mapped to a similar name.
            m = re.match(
                r"^(.{2,160}?)\s*(?::|\t|\s{2,})\s*([<>≤≥+\-\d.].*|(?:positive|negative|non[ -]?reactive|reactive|trace|not detected)\b.*)$",
                line,
                re.I,
            )
            if m:
                name, tail = m.groups()
        if not name:
            if re.search(
                r"\d|reactive|positive|negative", line, re.I
            ) and not header_segments([line]):
                acc.reject(line)
            continue
        q = QUAL.match(tail)
        m = VALUE_RE.match(tail)
        if q:
            result = q.group().strip()
            rest = tail[q.end() :].strip()
        elif m:
            result = tail[: m.end()].strip()
            rest = tail[m.end() :].strip()
        else:
            acc.reject(line)
            continue
        flag = ""
        fm = FLAG_RE.search(" " + rest)
        if fm:
            flag = fm.group(1)
            rest = (" " + rest)[: fm.start()].strip()
        ref = ""
        unit = rest
        # Strip explicit labels, then find only one simple interval. Complex text is retained for review.
        rm = RANGE_SEARCH.search(rest)
        if rm:
            unit = rest[: rm.start()].strip(" ()[]:")
            ref = rest[rm.start() :].strip()
        else:
            cm = re.search(r"(?<![\w^])([<>≤≥]=?\s*" + NUM + r")\s*$", rest)
            if cm:
                unit = rest[: cm.start()].strip(" ()[]:")
                ref = cm.group(1)
            else:
                qm = re.search(
                    r"\b(non[ -]?reactive|negative|not detected|absent)\s*$", rest, re.I
                )
                if qm:
                    unit = rest[: qm.start()].strip()
                    ref = qm.group(1)
        unit = re.sub(
            r"(?:reference|normal|ref\.?|range)\s*:?\s*$", "", unit, flags=re.I
        ).strip(" ()[]:")
        acc.add(
            name=name,
            result=result,
            unit=unit,
            reference_text=ref,
            flag=flag,
            page=page,
            source_kind=kind,
            source_row=rowno,
            source_text=line,
        )


def deduplicate(items: list[RawObservation]):
    """Collapse duplicate extraction paths, never different measurements or pages."""
    merged = []
    index = defaultdict(list)
    for item in items:
        entry, _ = match_name(item.name)
        key = (
            item.page,
            normalize_name(entry["name"] if entry else item.name),
            item.result.strip().casefold(),
            item.report_date,
        )
        duplicate = None
        for ix in index[key]:
            prev = merged[ix]
            same_source = prev.source_kind == item.source_kind
            # Distinct rows in one method can be historical/repeated measurements; retain them.
            if same_source and (
                prev.source_row != item.source_row
                or prev.source_section != item.source_section
            ):
                continue
            unit_ok = (
                not prev.unit
                or not item.unit
                or normalize_name(prev.unit) == normalize_name(item.unit)
            )
            ref_ok = (
                not prev.reference_text
                or not item.reference_text
                or prev.reference_text == item.reference_text
            )
            if unit_ok and ref_ok:
                duplicate = ix
                break
        if duplicate is None:
            index[key].append(len(merged))
            merged.append(item)
        else:
            prev = merged[duplicate]
            if not prev.unit and item.unit:
                prev.unit = item.unit
            if not prev.reference_text and item.reference_text:
                prev.reference_text = item.reference_text
            if not prev.flag and item.flag:
                prev.flag = item.flag
    return merged
