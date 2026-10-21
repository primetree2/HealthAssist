import pytest
from backend.app.catalog import match_name
from backend.app.interpretation import build_analysis
from backend.app.models import PatientContext, RawObservation
from backend.app.numbers import convert, parse_number, parse_reference, compare
from backend.app.parsing import ParseAccumulator, deduplicate, parse_rows, parse_text


def row(name="Hemoglobin", result="14", unit="g/dL", reference_text="12–16", **kw):
    return RawObservation(
        name=name, result=result, unit=unit, reference_text=reference_text, **kw
    )


def analyze(*rows):
    return build_analysis(list(rows), PatientContext(), "")


@pytest.mark.parametrize(
    "name,expected",
    [
        ("Hb", "Hemoglobin"),
        ("HbA1c", "Hemoglobin A1c"),
        ("Vitamin B12", "Vitamin B12"),
        ("HDL Cholesterol", "High-Density Lipoprotein"),
        ("LDL Cholesterol", "Low-Density Lipoprotein"),
        ("Non HDL Cholesterol", "Non-HDL Cholesterol"),
        ("Absolute Neutrophil Count", "Absolute Neutrophil Count"),
        ("Urea", "Urea"),
        ("BUN", "Blood Urea Nitrogen"),
        ("hs-CRP", "High-Sensitivity C-Reactive Protein"),
        ("Plateletcrit", "Plateletcrit"),
    ],
)
def test_exact_aliases(name, expected):
    assert match_name(name)[0]["name"] == expected


@pytest.mark.parametrize(
    "name", ["PCT", "Unlisted Zeta Marker", "Probably hemoglobin maybe"]
)
def test_no_fuzzy_diagnosis(name):
    assert match_name(name)[0] is None


@pytest.mark.parametrize(
    "name,value,unit,expected",
    [
        ("FBS", 5.5, "mmol/L", 99.1001),
        ("Hemoglobin", 140, "g/L", 14),
        ("WBC", 7, "10^9/L", 7000),
        ("Platelet Count", 250, "10^9/L", 250000),
        ("Vitamin D", 75, "nmol/L", 75 / 2.496),
        ("Creatinine", 88.4, "µmol/L", 1),
        ("Troponin I", 50, "ng/L", 0.05),
        ("Absolute Neutrophil Count", 4, "10³/µL", 4000),
    ],
)
def test_conversion(name, value, unit, expected):
    e = match_name(name)[0]
    converted, canonical, error = convert(value, unit, e)
    assert error is None and canonical == e["unit"]
    assert converted == pytest.approx(expected)


def test_unknown_unit_is_not_relabelled():
    v, u, e = convert(5, "bananas/L", match_name("FBS")[0])
    assert v is None and u is None and e


def test_missing_unit_is_not_inferred():
    assert analyze(row(unit="")).observations[0].status == "needs_review"


def test_glucose_compares_in_report_units():
    o = analyze(row("FBS", "5.5", "mmol/L", "4.0–6.0")).observations[0]
    assert o.status == "within_report_range"
    assert o.raw.result == "5.5"
    assert o.canonical_value == pytest.approx(99.1001)


def test_lab_reference_preserved_not_adult_default():
    o = analyze(row("Hemoglobin", "140", "g/L", "120–160")).observations[0]
    assert o.status == "within_report_range"
    assert o.reference_low == 120
    assert o.canonical_value == 14


def test_extreme_result_is_retained():
    o = analyze(row("Troponin I", "5", "ng/mL", "0–0.04")).observations[0]
    assert o.value == 5 and o.status == "above_report_range"


def test_no_reference_means_no_default():
    assert (
        analyze(row(reference_text="")).observations[0].status
        == "reference_unavailable"
    )


def test_age_has_no_silent_adult_defaults():
    a = build_analysis([row(reference_text="")], PatientContext(age=4), "")
    assert a.observations[0].status == "reference_unavailable"
    assert any("Pediatric" in l for l in a.limitations)


def test_unknown_analyte_is_retained():
    o = analyze(row("Unusual Marker")).observations[0]
    assert o.raw.name == "Unusual Marker" and o.status == "needs_review"


def test_qualitative_is_preserved():
    o = analyze(row("HIV Ab", "Reactive", "", "Non-reactive")).observations[0]
    assert o.status == "qualitative"
    assert o.value is None


def test_comma_values_are_reviewable():
    o = analyze(row("WBC", "7,000", "cells/mcL", "4000–11000")).observations[0]
    assert o.value == 7000 and o.status == "needs_review"


@pytest.mark.parametrize(
    "raw,expected",
    [("4,50", 4.5), ("1,50,000", 150000), ("1e3", 1000), ("١٤", 14), (".5", 0.5)],
)
def test_numeric_formats(raw, expected):
    assert parse_number(raw).value == expected


@pytest.mark.parametrize(
    "raw", ["NaN", "inf", "1,2,3", "1e999", "400 500", "12 mg/dL", ""]
)
def test_ambiguous_numbers_are_not_guessed(raw):
    assert parse_number(raw).value is None


@pytest.mark.parametrize(
    "value,ref,status",
    [
        ("5", "0–5", "within_report_range"),
        ("5", "<5", "above_report_range"),
        ("<5", "<5", "within_report_range"),
        ("<5", "0–5", "needs_review"),
        (">5", "0–5", "above_report_range"),
        ("<3", "5–10", "below_report_range"),
        ("≥5", "≥5", "within_report_range"),
        ("≤5", "5–10", "needs_review"),
        ("10", "5–10", "within_report_range"),
    ],
)
def test_interval_math(value, ref, status):
    assert compare(parse_number(value), parse_reference(ref)) == status


def test_negative_is_flagged_not_diagnosed():
    assert (
        analyze(row("Potassium", "-1", "mEq/L", "3.5–5.2")).observations[0].status
        == "needs_review"
    )


def test_percent_over_100_not_discarded():
    assert len(analyze(row("Neutrophils", "150", "%", "40–75")).observations) == 1


def test_repeated_values_retained_and_require_review():
    a = analyze(row(result="14"), row(result="8"))
    assert len(a.observations) == 2
    assert all(o.status == "needs_review" for o in a.observations)


def test_user_review_can_resolve_ocr():
    o = row(source_kind="cloud_ocr")
    assert analyze(o).observations[0].status == "needs_review"
    o.user_verified = True
    assert analyze(o).observations[0].status == "within_report_range"


def test_verifying_does_not_override_bad_unit():
    assert (
        analyze(row(unit="unknown", user_verified=True)).observations[0].status
        == "needs_review"
    )


def test_flag_conflict_requires_review():
    assert analyze(row(flag="H")).observations[0].status == "needs_review"


def test_printed_critical_flag_adds_notice():
    assert "critical" in analyze(row(flag="CRITICAL")).safety_notices[0]


def test_table_keeps_units_and_interval():
    acc = ParseAccumulator()
    parse_rows(
        [
            [
                "Investigation",
                "Observed Value",
                "Units",
                "Biological Reference Interval",
            ],
            ["Hemoglobin", "140", "g/L", "120–160"],
        ],
        acc,
    )
    assert len(acc.items) == 1
    assert acc.items[0].unit == "g/L"
    assert acc.items[0].reference_text == "120–160"


@pytest.mark.parametrize(
    "line,name,value,unit,reference",
    [
        ("Vitamin B12 250 pg/mL 200-900", "Vitamin B12", "250", "pg/mL", "200-900"),
        ("HbA1c 5.5 % 4.0–5.6", "HbA1c", "5.5", "%", "4.0–5.6"),
        ("Hemoglobin 14 g/dL 13.2-16.6", "Hemoglobin", "14", "g/dL", "13.2-16.6"),
        ("FBS: 5.5 mmol/L 4–6", "FBS", "5.5", "mmol/L", "4–6"),
        (
            "Platelet Count 250 10^9/L 150–450",
            "Platelet Count",
            "250",
            "10^9/L",
            "150–450",
        ),
        (
            "HBsAg: Non-reactive Non-reactive",
            "HBsAg",
            "Non-reactive",
            "",
            "Non-reactive",
        ),
        ("Troponin I 5 ng/mL <0.04", "Troponin I", "5", "ng/mL", "<0.04"),
    ],
)
def test_text_formats(line, name, value, unit, reference):
    acc = ParseAccumulator()
    parse_text(line, acc)
    assert len(acc.items) == 1
    o = acc.items[0]
    assert (o.name, o.result, o.unit, o.reference_text) == (
        name,
        value,
        unit,
        reference,
    )


def test_two_panels_side_by_side():
    acc = ParseAccumulator()
    parse_rows(
        [
            ["Test", "Result", "Unit", "Range", "Test", "Result", "Unit", "Range"],
            [
                "Hemoglobin",
                "14",
                "g/dL",
                "12–16",
                "Platelets",
                "250",
                "10^9/L",
                "150–450",
            ],
        ],
        acc,
    )
    assert len(acc.items) == 2


def test_multiline_aligned_cells():
    acc = ParseAccumulator()
    parse_rows(
        [
            ["Test", "Result", "Unit", "Range"],
            ["Hemoglobin\nWBC", "14\n7000", "g/dL\ncells/mcL", "12–16\n4000–11000"],
        ],
        acc,
    )
    assert len(acc.items) == 2


def test_unparsed_rows_are_visible():
    acc = ParseAccumulator()
    parse_text("Unknown Assay 12.5 xyz/L", acc)
    assert acc.ignored == 1
    assert acc.unparsed


def test_distinct_pages_not_collapsed():
    assert len(deduplicate([row(page=1), row(page=2)])) == 2


def test_table_text_duplicate_collapsed():
    assert (
        len(
            deduplicate(
                [row(source_kind="table", page=1), row(source_kind="text", page=1)]
            )
        )
        == 1
    )


def test_symptoms_not_turned_into_fake_diagnosis():
    a = build_analysis([], PatientContext(), "Tired for two weeks")
    assert not a.observations
    assert not a.ai
    assert a.doctor_questions


def test_identical_measurements_in_different_sheets_are_retained():
    assert (
        len(
            deduplicate(
                [
                    row(source_kind="xlsx", source_row=2, source_section="Day 1"),
                    row(source_kind="xlsx", source_row=2, source_section="Day 2"),
                ]
            )
        )
        == 2
    )
