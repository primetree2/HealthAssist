"""Report-relative arithmetic, not diagnosis. No generic population ranges are applied."""

from collections import Counter
from datetime import datetime, timezone
import re
import uuid
from .catalog import match_name, normalize_name
from .models import (
    Analysis,
    AnalysisCounts,
    ExtractionInfo,
    Observation,
    PatientContext,
    RawObservation,
)
from .numbers import compare, convert, normalize_unit, parse_number, parse_reference

DESCRIPTIONS = {
    "within_report_range": "The reported result is within this report’s supplied interval. That alone does not establish good health.",
    "above_report_range": "The reported result is above this report’s supplied interval. Discuss it in clinical context.",
    "below_report_range": "The reported result is below this report’s supplied interval. Discuss it in clinical context.",
    "needs_review": "Interpretation is withheld until the highlighted details are resolved.",
    "reference_unavailable": "No usable laboratory reference interval was supplied. No default interval has been substituted.",
    "qualitative": "This is the laboratory’s qualitative finding, not an independent diagnosis. Confirm its meaning with your clinician.",
    "not_reported": "The laboratory did not provide an interpretable measurement for this observation.",
}


def interpret(raw: RawObservation, index: int, repeated=False):
    entry, name_match = match_name(raw.name)
    n = parse_number(raw.result)
    issues = list(raw.issues)
    blocking = []
    if raw.issues and not raw.user_verified:
        blocking.extend(raw.issues)
    if raw.source_kind == "cloud_ocr" and not raw.user_verified:
        issues.append(
            "Cloud-extracted row: check the name, value, unit, interval, and person against the original report."
        )
        blocking.append("Unverified OCR")
    if repeated:
        issues.append(
            "Repeated analyte: verify date, specimen, and whether these are separate measurements."
        )
        if not raw.user_verified:
            blocking.append("Repeated analyte")
    if name_match != "exact":
        msg = (
            "Test name is ambiguous; choose an unambiguous full name."
            if name_match == "ambiguous"
            else "Test name is not in the exact-match catalog. The original result is retained without automatic interpretation."
        )
        issues.append(msg)
        blocking.append(msg)
    issues.extend(n.issues)
    if n.issues and not raw.user_verified:
        blocking.extend(n.issues)
    converted = None
    cu = None
    if n.qualitative:
        status = (
            "not_reported"
            if re.fullmatch(
                r"not (?:reported|done|available)|n/?a|nr|--", n.qualitative, re.I
            )
            else "qualitative"
        )
        # A qualitative result stays visible even without a known numeric test mapping.
        if blocking:
            status = "needs_review"
        ref = parse_reference("")
    elif n.value is None:
        status = "needs_review"
        ref = parse_reference(raw.reference_text)
    else:
        if entry:
            converted, cu, error = convert(n.value, raw.unit, entry)
            if error:
                issues.append(error)
                blocking.append(error)
            if n.value < 0:
                issues.append(
                    "Negative concentration/count is implausible for this catalog entry. Verify the sign and extraction."
                )
                blocking.append("Negative measurement")
            if (
                entry["unit"] == "%"
                and normalize_unit(raw.unit) == "%"
                and not 0 <= n.value <= 100
            ):
                issues.append(
                    "Percentage is outside 0–100; verify the original report."
                )
                blocking.append("Invalid percentage")
        reftext = raw.reference_text
        # A repeated unit suffix can be stripped only if it matches the result unit exactly.
        if raw.unit and reftext.casefold().endswith(raw.unit.casefold()):
            reftext = reftext[: -len(raw.unit)].strip()
        ref = parse_reference(reftext)
        issues.extend(ref.issues)
        blocking.extend(ref.issues)
        if not raw.unit:
            issues.append("Unit is missing; it was not inferred.")
            blocking.append("Missing unit")
        status = compare(n, ref) if ref.valid else "reference_unavailable"
        # No inference from report-sex or age: caller verifies the applicable lab interval.
        if blocking:
            status = "needs_review"
        flag = raw.flag.casefold()
        if (
            flag in {"h", "hh", "high", "l", "ll", "low"}
            and status == "within_report_range"
        ):
            issues.append(
                "The printed laboratory flag conflicts with the extracted interval. Verify both."
            )
            status = "needs_review"
    return Observation(
        id=f"o-{index + 1:03}",
        raw=raw,
        canonical_name=entry["name"] if entry else None,
        category=entry.get("category", "Other") if entry else "Other",
        value=n.value,
        comparator=n.comparator,
        canonical_value=converted,
        canonical_unit=cu,
        reference_low=ref.low,
        reference_high=ref.high,
        status=status,
        explanation=DESCRIPTIONS[status],
        issues=list(dict.fromkeys(issues)),
        name_match=name_match,
    )


def build_analysis(
    raws: list[RawObservation],
    context: PatientContext,
    symptoms: str,
    info: ExtractionInfo | None = None,
):
    info = info or ExtractionInfo(
        format="review", methods=["User-reviewed structured observations"]
    )
    keys = []
    for row in raws:
        e, _ = match_name(row.name)
        keys.append(normalize_name(e["name"] if e else row.name))
    counts = Counter(keys)
    observations = [
        interpret(row, i, counts[keys[i]] > 1) for i, row in enumerate(raws)
    ]
    within = sum(o.status == "within_report_range" for o in observations)
    outside = sum(
        o.status in ("above_report_range", "below_report_range") for o in observations
    )
    review = sum(
        o.status in ("needs_review", "reference_unavailable") for o in observations
    )
    qualitative = sum(o.status in ("qualitative", "not_reported") for o in observations)
    if observations:
        summary = f"{len(observations)} observations retained. {outside} outside the report’s interval; {review} need verification or a reference interval."
    else:
        summary = "No structured lab observations are available. This is not an all-clear result."
        if info.filename:
            info.warnings.append(
                "No test rows could be extracted. Try another format, enable consented OCR, or paste the report text."
            )
    safety = [
        "If you have severe chest pain, difficulty breathing, fainting, or sudden weakness or speech changes, seek urgent medical help. Do not wait for this app."
    ]
    if context.emergency_symptoms:
        safety.insert(
            0,
            "You indicated potentially urgent symptoms. Seek emergency medical care now; this analysis cannot assess an emergency.",
        )
    if any(
        re.search(r"\b(critical|panic|hh|ll)\b", o.raw.flag, re.I) for o in observations
    ):
        safety.insert(
            0,
            "The report marks at least one result as critical or extreme. Contact your clinician or laboratory promptly; do not rely on this app to determine urgency.",
        )
    questions = []
    abnormal = [
        o
        for o in observations
        if o.status in ("above_report_range", "below_report_range")
    ]
    if abnormal:
        questions.append(
            "How should we interpret "
            + ", ".join((o.canonical_name or o.raw.name) for o in abnormal[:3])
            + " in my clinical context?"
        )
    if review:
        questions.append(
            "Could you confirm the units, reference intervals, and unclear observations before interpreting this report?"
        )
    if symptoms:
        questions.append(
            "Could my symptoms relate to these findings, and what possibilities remain unexplained?"
        )
    questions.extend(
        [
            "Could medications, fasting status, timing, or specimen quality affect these results?",
            "Is any follow-up needed, and when should I seek care sooner?",
        ]
    )
    limitations = [
        "This tool organizes report information; it does not diagnose, prescribe, or rule out disease.",
        "Intervals are taken from the report, not substituted from generic adult ranges. Verify that they apply to the correct person, age, method, and context.",
        "No automatic critical-value thresholds are implemented. Urgency cannot be inferred from a within-range label.",
        "Unknown, conflicting, scanned, or incomplete values remain visible and may require manual correction.",
    ]
    if context.age is not None and context.age < 18:
        limitations.append(
            "Pediatric interpretation requires age-specific laboratory intervals and a qualified clinician. No adult defaults are applied."
        )
    if context.pregnancy == "yes":
        limitations.append(
            "Pregnancy may change applicable reference intervals. Confirm the correct interval with your clinician."
        )
    return Analysis(
        id=str(uuid.uuid4()),
        created_at=datetime.now(timezone.utc).isoformat(),
        context=context,
        symptoms=symptoms,
        observations=observations,
        counts=AnalysisCounts(
            total=len(observations),
            within=within,
            outside=outside,
            review=review,
            qualitative=qualitative,
        ),
        extraction=info,
        summary=summary,
        safety_notices=safety,
        doctor_questions=questions[:8],
        limitations=limitations,
    )
