"""Conservative FHIR Observation/Bundle adapter. Resolves values, never clinical meaning."""

from .models import RawObservation
from .numbers import normalize_unit

LOINC_NAMES = {
    "718-7": "Hemoglobin",
    "6690-2": "White Blood Cell Count",
    "777-3": "Platelet Count",
    "4548-4": "Hemoglobin A1c",
    "2345-7": "Glucose, Random",
    "1558-6": "Glucose, Fasting",
    "2160-0": "Creatinine",
    "2951-2": "Sodium",
    "2823-3": "Potassium",
    "3016-3": "Thyroid-Stimulating Hormone",
    "2276-4": "Ferritin",
}


def label(code):
    if not isinstance(code, dict):
        return ""
    if code.get("text"):
        return str(code["text"])
    for coding in code.get("coding", []):
        if coding.get("display"):
            return str(coding["display"])
        if (
            coding.get("system") == "http://loinc.org"
            and coding.get("code") in LOINC_NAMES
        ):
            return LOINC_NAMES[coding["code"]]
    return (
        str(code.get("coding", [{}])[0].get("code", "Unknown observation"))
        if code.get("coding")
        else ""
    )


def extract_fhir(obj):
    resources = []
    warnings = []
    if obj.get("resourceType") == "Bundle":
        resources = [
            e.get("resource", {}) for e in obj.get("entry", []) if isinstance(e, dict)
        ]
    else:
        resources = [obj]
    observations = []
    for resource in resources:
        if resource.get("resourceType") == "Observation":
            observations.append(resource)
        for item in resource.get("contained", []):
            if item.get("resourceType") == "Observation":
                observations.append(item)
    if len(observations) > 300:
        raise ValueError("Too many FHIR observations")
    patients = {
        r.get("subject", {}).get("reference")
        for r in observations
        if r.get("subject", {}).get("reference")
    }
    rows = []
    for resource in observations:
        parts = resource.get("component") or [resource]
        for part in parts:
            if len(rows) >= 300:
                raise ValueError("Too many FHIR components")
            name = label(part.get("code", {})) or "Unknown observation"
            issues = []
            result = ""
            unit = ""
            quantity = part.get("valueQuantity")
            if isinstance(quantity, dict) and quantity.get("value") is not None:
                result = str(quantity.get("comparator", "")) + str(quantity["value"])
                unit = str(quantity.get("code") or quantity.get("unit") or "")
            elif "valueCodeableConcept" in part:
                result = label(part["valueCodeableConcept"])
            elif "valueString" in part:
                result = str(part["valueString"])
            elif "valueBoolean" in part:
                result = str(part["valueBoolean"])
            elif "dataAbsentReason" in part or "dataAbsentReason" in resource:
                result = "Not reported"
            else:
                issues.append(
                    "FHIR observation has no supported value type. The observation was retained without interpretation."
                )
            intervals = part.get("referenceRange", resource.get("referenceRange", []))
            refs = []
            for interval in intervals:
                low = interval.get("low", {})
                high = interval.get("high", {})
                if interval.get("text"):
                    refs.append(str(interval["text"]))
                elif low.get("value") is not None and high.get("value") is not None:
                    refs.append(str(low["value"]) + "–" + str(high["value"]))
                elif low.get("value") is not None:
                    refs.append("≥" + str(low["value"]))
                elif high.get("value") is not None:
                    refs.append("≤" + str(high["value"]))
                for bound in [low, high]:
                    boundunit = bound.get("code") or bound.get("unit")
                    if (
                        boundunit
                        and unit
                        and normalize_unit(str(boundunit)) != normalize_unit(unit)
                    ):
                        issues.append(
                            "FHIR interval unit differs from the measurement unit. Verify and correct it before interpretation."
                        )
                if interval.get("appliesTo") or interval.get("age"):
                    issues.append(
                        "FHIR reference has demographic applicability. Confirm that this is the correct interval for the person."
                    )
            if len(intervals) > 1:
                issues.append(
                    "Multiple FHIR reference intervals were supplied. Select the applicable interval manually."
                )
            if len(patients) > 1:
                issues.append(
                    "FHIR bundle contains multiple subjects. Verify that this row belongs to the intended person."
                )
            flags = part.get("interpretation", resource.get("interpretation", []))
            flag = label(flags[0]) if flags else ""
            if flags and not flag:
                flag = str(flags[0].get("coding", [{}])[0].get("code", ""))
            source = f"{name} | {result} | {unit} | {'; '.join(refs)}"
            rows.append(
                RawObservation(
                    name=name[:160],
                    result=result[:160],
                    unit=unit[:80],
                    reference_text="; ".join(refs)[:240],
                    flag=flag[:30],
                    source_kind="fhir",
                    source_text=source[:600],
                    source_row=len(rows) + 1,
                    source_section="FHIR Observation",
                    report_date=str(
                        resource.get("effectiveDateTime")
                        or resource.get("issued")
                        or ""
                    )[:40],
                    issues=list(dict.fromkeys(issues))[:12],
                )
            )
    if not observations:
        warnings.append(
            "No inline FHIR observations were available. Referenced results must be included in a Bundle; remote patient records are never fetched automatically."
        )
    if len(patients) > 1:
        warnings.append(
            "Multiple FHIR subjects were detected. Separate the reports or verify every observation."
        )
    return rows, warnings
