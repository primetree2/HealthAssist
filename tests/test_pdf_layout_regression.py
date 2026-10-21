"""Synthetic regressions for separated PDF headers; no patient report is shipped."""

import io

import pytest
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from reportlab.pdfgen import canvas

from backend.app.catalog import match_name
from backend.app.extraction import extract
from backend.app.interpretation import build_analysis
from backend.app.models import PatientContext, RawObservation
from backend.app.parsing import ParseAccumulator, parse_rows, parse_text


def ruled_pdf(rows, header=None, body_x=30):
    out = io.BytesIO()
    c = canvas.Canvas(out, pagesize=(600, 800))
    widths = [220, 70, 100, 80, 100]
    header = header or ["Test Name", "Result", "Bio. Ref. Range", "Unit", "Method"]
    for content, y, x in [([header], 690, 30), (rows, 640, body_x)]:
        table = Table(content, colWidths=widths)
        style = [("GRID", (0, 0), (-1, -1), 0.5, colors.black)]
        for i, row in enumerate(content):
            if row[0] and not any(row[1:]):
                style.append(("SPAN", (0, i), (-1, i)))
        table.setStyle(TableStyle(style))
        table.wrapOn(c, 580, 600)
        table.drawOn(c, x, y - table._height)
    c.save()
    return out.getvalue()


def test_headerless_range_before_unit_does_not_overwrite_interval():
    acc = ParseAccumulator()
    parse_rows([["Hemoglobin", "14", "12-16", "g/dL", "Photometry"]], acc)
    assert len(acc.items) == 1
    assert acc.items[0].reference_text == "12-16"
    assert acc.items[0].unit == "g/dL"


def test_headerless_unit_before_range_still_works():
    acc = ParseAccumulator()
    parse_rows([["Hemoglobin", "14", "g/dL", "12-16"]], acc)
    assert acc.items[0].reference_text == "12-16"
    assert acc.items[0].unit == "g/dL"


def test_bio_ref_range_header_maps_by_label_not_position():
    acc = ParseAccumulator()
    parse_rows(
        [
            ["Test Name", "Result", "Bio. Ref. Range", "Unit", "Method"],
            ["Novel Assay", "4", "1-6", "mg/L", "Example"],
        ],
        acc,
    )
    assert len(acc.items) == 1
    assert acc.items[0].reference_text == "1-6"
    assert acc.items[0].unit == "mg/L"


def test_pdf_separated_header_unknown_test_and_wrapped_name():
    pdf = ruled_pdf(
        [
            ["Hemoglobin (Hb)", "14", "12-16", "g/dL", "Photometry"],
            ["Novel Assay", "4", "1-6", "mg/L", "Example"],
            [
                "Mean Corpuscular Hb Concentration\n(MCHC)",
                "33",
                "31-35",
                "g/dL",
                "Calculated",
            ],
        ]
    )
    rows, info = extract(pdf, "synthetic.pdf")
    assert len(rows) == 3  # No second free-text copy of a table row.
    assert rows[0].name == "Hemoglobin (Hb)"
    assert rows[1].reference_text == "1-6" and rows[1].unit == "mg/L"
    assert rows[2].name.endswith("(MCHC)")
    analysis = build_analysis(rows, PatientContext(), "", info)
    assert analysis.counts.within == 2
    assert analysis.counts.review == 1  # Unknown assay retained, not force-matched.


def test_separated_pdf_header_arbitrary_column_order():
    pdf = ruled_pdf(
        [["Hemoglobin", "g/dL", "12-16", "14", "Photometry"]],
        header=["Test Name", "Unit", "Bio. Ref. Range", "Result", "Method"],
    )
    rows, _ = extract(pdf, "synthetic.pdf")
    assert len(rows) == 1
    assert (rows[0].result, rows[0].unit, rows[0].reference_text) == (
        "14",
        "g/dL",
        "12-16",
    )


def test_incompatible_table_geometry_does_not_inherit_unknown_test_header():
    pdf = ruled_pdf([["Novel Assay", "4", "1-6", "mg/L", "Example"]], body_x=60)
    rows, _ = extract(pdf, "synthetic.pdf")
    assert not any(r.name == "Novel Assay" and r.unit == "mg/L" for r in rows)


def test_percent_and_absolute_differential_are_not_duplicates():
    pdf = ruled_pdf(
        [
            ["Differential Leucocyte Count (DLC)", "", "", "", ""],
            ["Neutrophils", "50", "40-80", "%", "Example"],
            ["Absolute Leucocyte Count", "", "", "", ""],
            ["Neutrophils", "3500", "2000-7000", "Cells/cu.mm", "Calculated"],
            ["Monocytes", "400", "200-1000", "Cells/cu.mm", "Calculated"],
        ]
    )
    rows, info = extract(pdf, "synthetic.pdf")
    analysis = build_analysis(rows, PatientContext(), "", info)
    assert len(rows) == 3
    assert [o.canonical_name for o in analysis.observations] == [
        "Neutrophils",
        "Absolute Neutrophil Count",
        "Absolute Monocyte Count",
    ]
    assert analysis.counts.within == 3


@pytest.mark.parametrize(
    "name,expected",
    [
        ("Neutrophils", "Absolute Neutrophil Count"),
        ("Lymphocytes", "Absolute Lymphocyte Count"),
        ("Monocytes", "Absolute Monocyte Count"),
        ("Eosinophils", "Absolute Eosinophil Count"),
        ("Basophils", "Absolute Basophil Count"),
    ],
)
def test_explicit_count_units_disambiguate_differential(name, expected):
    assert match_name(name, "Cells/cu.mm")[0]["name"] == expected
    assert match_name(name, "%")[0]["name"] == name


@pytest.mark.parametrize(
    "line",
    [
        "Age/Gender : 25 Y /Male",
        "MobileNo : 0000000000",
        "UHID : SYNTHETIC123 Client No. : 0000000000",
        "Visit ID : 12345",
        "Client Code : 12345",
    ],
)
def test_patient_metadata_never_becomes_an_observation(line):
    acc = ParseAccumulator()
    parse_text(line, acc)
    assert not acc.items
    assert not acc.unparsed


def test_narrative_ranges_are_not_patient_measurements():
    pdf = ruled_pdf(
        [
            [
                "Interpretation: Example guidance mentions values 20-30 and 100. "
                "This is not a measured result.",
                "",
                "",
                "",
                "",
            ],
        ]
    )
    rows, info = extract(pdf, "synthetic.pdf")
    assert not rows
    assert any("Narrative" in warning for warning in info.warnings)


def test_missing_ratio_unit_and_unsupported_esr_unit_remain_reviewable():
    rows = [
        RawObservation(
            name="Albumin:Globulin Ratio", result="0.8", reference_text="1.1-2.5"
        ),
        RawObservation(name="ESR", result="10", unit="mm", reference_text="0-15"),
    ]
    analysis = build_analysis(rows, PatientContext(), "")
    assert analysis.counts.review == 2
    assert all(o.status == "needs_review" for o in analysis.observations)


def test_table_extraction_keeps_valid_measurements_outside_owned_regions():
    from pypdf import PdfReader, PdfWriter

    base = PdfReader(
        io.BytesIO(
            ruled_pdf(
                [
                    ["Hemoglobin", "14", "12-16", "g/dL", "Photometry"],
                ]
            )
        )
    )
    overlay = io.BytesIO()
    c = canvas.Canvas(overlay, pagesize=(600, 800))
    c.drawString(35, 450, "CRP 3 mg/L <5")
    c.save()
    writer = PdfWriter()
    writer.add_page(base.pages[0])
    writer.pages[0].merge_page(PdfReader(overlay).pages[0])
    out = io.BytesIO()
    writer.write(out)
    rows, _ = extract(out.getvalue(), "synthetic.pdf")
    assert len(rows) == 2
    assert {r.name for r in rows} == {"Hemoglobin", "CRP"}


def test_percent_unit_in_absolute_panel_is_not_silently_treated_as_valid_count():
    row = RawObservation(
        name="Neutrophils",
        result="50",
        unit="%",
        reference_text="40-80",
        source_section="Absolute Leucocyte Count",
    )
    analysis = build_analysis([row], PatientContext(), "")
    assert analysis.observations[0].status == "needs_review"


def test_separate_repeated_measurements_still_require_review():
    pdf = ruled_pdf(
        [
            ["Hemoglobin", "14", "12-16", "g/dL", "Photometry"],
            ["Hemoglobin", "14", "12-16", "g/dL", "Photometry"],
        ]
    )
    rows, info = extract(pdf, "synthetic.pdf")
    analysis = build_analysis(rows, PatientContext(), "", info)
    assert len(rows) == 2
    assert analysis.counts.review == 2


def test_pdf_api_returns_correct_mapping_without_cloud(monkeypatch):
    from fastapi.testclient import TestClient
    from backend.app.main import app

    def forbid_cloud(*args, **kwargs):
        raise AssertionError("Cloud must not be called for this digital report")

    monkeypatch.setattr("backend.app.cloud.extract_with_cloud", forbid_cloud)
    pdf = ruled_pdf(
        [
            ["Hemoglobin (Hb)", "14", "12-16", "g/dL", "Photometry"],
            ["Packed Cell Volume (PCV) / Hematocrit", "42", "40-50", "%", "Calculated"],
        ]
    )
    response = TestClient(app).post(
        "/api/analyze",
        files={"file": ("synthetic.pdf", pdf, "application/pdf")},
        data={"consent_processing": "true", "allow_cloud": "false"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["counts"]["total"] == 2
    assert body["counts"]["within"] == 2
    assert not body["extraction"]["cloud_used"]
