import io, json, zipfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from reportlab.pdfgen import canvas
from openpyxl import Workbook
from backend.app.cloud import CloudUnavailable
from backend.app.extraction import ExtractionError, extract
from backend.app.main import app
from backend.app.models import RawObservation

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = (ROOT / "frontend/public/samples/example-report.csv").read_bytes()


def pdf_bytes(lines, pages=1):
    b = io.BytesIO()
    c = canvas.Canvas(b)
    for _ in range(pages):
        for i, line in enumerate(lines):
            c.drawString(50, 780 - i * 22, line)
        c.showPage()
    c.save()
    return b.getvalue()


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


def test_digital_pdf_end_to_end():
    raws, info = extract(
        pdf_bytes(["Hemoglobin 140 g/L 120-160", "FBS: 5.5 mmol/L 4-6"]), "lab.pdf"
    )
    assert len(raws) == 2
    assert info.page_count == 1


def test_csv_preserves_8_rows():
    raws, info = extract(SAMPLE, "report.csv")
    assert len(raws) == 8
    assert raws[2].unit == "10^9/L"
    assert info.methods


def test_semicolon_csv():
    rows, _ = extract(b"Test;Result;Unit;Range\nHemoglobin;14;g/dL;12-16", "report.csv")
    assert len(rows) == 1


def test_tsv():
    rows, _ = extract(
        b"Test\tResult\tUnit\tRange\nHemoglobin\t14\tg/dL\t12-16", "report.tsv"
    )
    assert len(rows) == 1


def test_json_schema():
    rows, _ = extract(
        json.dumps(
            [
                {
                    "name": "Hemoglobin",
                    "result": "14",
                    "unit": "g/dL",
                    "reference_text": "12-16",
                }
            ]
        ).encode(),
        "report.json",
    )
    assert len(rows) == 1


def test_json_unknown_fields_rejected():
    with pytest.raises(ExtractionError):
        extract(
            b'[{"name":"Hb","result":"14","execute":"do bad things"}]', "report.json"
        )


def test_xlsx():
    book = Workbook()
    sheet = book.active
    sheet.append(["Test", "Result", "Unit", "Range"])
    sheet.append(["Hemoglobin", 14, "g/dL", "12-16"])
    out = io.BytesIO()
    book.save(out)
    rows, info = extract(out.getvalue(), "report.xlsx")
    assert len(rows) == 1
    assert rows[0].result == "14"
    assert info.warnings


def test_docx_table():
    xml = """<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Test</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Result</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Unit</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Range</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>Hemoglobin</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>14</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>g/dL</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>12-16</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>"""
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w") as z:
        z.writestr("word/document.xml", xml)
    rows, _ = extract(out.getvalue(), "report.docx")
    assert len(rows) == 1


@pytest.mark.parametrize(
    "data,name",
    [
        (b"", "empty.pdf"),
        (b"not pdf", "bad.pdf"),
        (b"<svg/>", "image.png"),
        (b"hello", "file.exe"),
    ],
)
def test_invalid_files(data, name):
    with pytest.raises(ExtractionError):
        extract(data, name)


def test_oversized_file():
    with pytest.raises(ExtractionError):
        extract(b"a" * 4_000_001, "x.txt")


def test_page_limit():
    with pytest.raises(ExtractionError):
        extract(pdf_bytes(["Hemoglobin 14 g/dL 12-16"], 16), "too-many.pdf")


def test_image_without_consent_gives_explicit_ocr_warning():
    img = Image.new("RGB", (300, 300), "white")
    out = io.BytesIO()
    img.save(out, format="PNG")
    rows, info = extract(out.getvalue(), "scan.png")
    assert rows == []
    assert any("not sent" in w for w in info.warnings)


def test_opted_in_ocr_is_unverified(monkeypatch):
    img = Image.new("RGB", (300, 300), "white")
    out = io.BytesIO()
    img.save(out, format="PNG")

    def fake(*args):
        return [
            RawObservation(
                name="Hemoglobin",
                result="14",
                unit="g/dL",
                reference_text="12-16",
                source_kind="cloud_ocr",
            )
        ]

    monkeypatch.setattr("backend.app.cloud.extract_with_cloud", fake)
    rows, info = extract(out.getvalue(), "scan.png", allow_cloud=True)
    assert not rows[0].user_verified
    assert info.cloud_used


def test_multiple_patient_ids_flagged():
    text = b"Patient ID: ONE\nHemoglobin 14 g/dL 12-16\nPatient ID: TWO\nFBS 90 mg/dL 70-99"
    rows, info = extract(text, "report.txt")
    assert any("Multiple patient" in x for x in info.warnings)
    assert all(x.issues for x in rows)


def test_zip_expansion_limit():
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("word/document.xml", "a" * 16_000_001)
    with pytest.raises(ExtractionError):
        extract(out.getvalue(), "bomb.docx")


def test_health_is_not_secret(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert not r.json()["cloud_available"]
    assert r.headers["cache-control"] == "no-store"
    assert "key" not in r.text.lower()


def test_api_consent_required(client):
    assert client.post("/api/analyze", data={"symptoms": "tired"}).status_code == 422


def test_api_no_blank_success(client):
    assert (
        client.post("/api/analyze", data={"consent_processing": "true"}).status_code
        == 422
    )


def test_api_sample_success(client):
    r = client.post(
        "/api/analyze",
        data={"consent_processing": "true"},
        files={"file": ("sample.csv", SAMPLE, "text/csv")},
    )
    assert r.status_code == 200
    assert r.json()["counts"] == {
        "total": 8,
        "within": 5,
        "outside": 2,
        "review": 0,
        "qualitative": 1,
    }
    assert "X-Session-ID" not in r.headers


def test_bad_pdf_safe_error(client):
    r = client.post(
        "/api/analyze",
        data={"consent_processing": "true"},
        files={"file": ("bad.pdf", b"bad pdf", "application/pdf")},
    )
    assert r.status_code == 422
    assert "traceback" not in r.text.lower()


def test_input_validation_does_not_echo_phi(client):
    r = client.post(
        "/api/analyze",
        data={
            "consent_processing": "true",
            "context": json.dumps({"age": -5, "private": "SENSITIVE-PATIENT"}),
        },
    )
    assert r.status_code == 422
    assert "SENSITIVE" not in r.text


def test_cloud_requires_consent(client):
    assert (
        client.post(
            "/api/analyze",
            data={"consent_processing": "true", "symptoms": "tired", "explain": "true"},
        ).status_code
        == 422
    )


def test_ai_failure_does_not_destroy_report(client, monkeypatch):
    def fail(*args):
        raise CloudUnavailable("Provider is down.")

    monkeypatch.setattr("backend.app.main.explain_analysis", fail)
    r = client.post(
        "/api/analyze",
        data={"consent_processing": "true", "allow_cloud": "true", "explain": "true"},
        files={"file": ("s.csv", SAMPLE, "text/csv")},
    )
    assert r.status_code == 200
    assert r.json()["ai_status"] == "unavailable"
    assert r.json()["ai"] is None
    assert r.json()["counts"]["total"] == 8


def test_review_is_recomputed(client):
    r = client.post(
        "/api/review",
        json={
            "observations": [
                {
                    "name": "Hemoglobin",
                    "result": "8",
                    "unit": "g/dL",
                    "reference_text": "12-16",
                    "user_verified": True,
                }
            ],
            "context": {},
            "symptoms": "",
            "consent_processing": True,
        },
    )
    assert r.status_code == 200
    assert r.json()["counts"]["outside"] == 1


def test_review_rejects_injected_status(client):
    r = client.post(
        "/api/review",
        json={
            "observations": [
                {
                    "name": "Hemoglobin",
                    "result": "8",
                    "unit": "g/dL",
                    "reference_text": "12-16",
                    "status": "normal",
                }
            ],
            "consent_processing": True,
        },
    )
    assert r.status_code == 422


def test_request_rate_limit(client):
    for i in range(12):
        assert (
            client.post(
                "/api/analyze", data={"consent_processing": "true", "symptoms": "tired"}
            ).status_code
            == 200
        )
    r = client.post(
        "/api/analyze", data={"consent_processing": "true", "symptoms": "tired"}
    )
    assert r.status_code == 429
    assert r.headers["retry-after"] == "60"


def test_stream_body_limit(client):
    def chunks():
        for i in range(5):
            yield b"a" * 1_000_000

    r = client.post(
        "/api/review", content=chunks(), headers={"Content-Type": "application/json"}
    )
    assert r.status_code == 413


def test_vercel_cloud_disabled_without_shared_limit(client, monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("GOOGLE_API_KEY", "test-placeholder")
    monkeypatch.setenv("GEMINI_MODEL", "test-model")
    assert not client.get("/api/health").json()["cloud_available"]
    r = client.post(
        "/api/analyze",
        data={"consent_processing": "true", "allow_cloud": "true", "symptoms": "tired"},
    )
    assert r.status_code == 503


def test_fhir_quantity_and_ucum_units():
    obj = {
        "resourceType": "Observation",
        "code": {"text": "White Blood Cell Count"},
        "valueQuantity": {
            "value": 7,
            "code": "10*9/L",
            "system": "http://unitsofmeasure.org",
        },
        "referenceRange": [
            {
                "low": {"value": 4, "code": "10*9/L"},
                "high": {"value": 11, "code": "10*9/L"},
            }
        ],
    }
    rows, info = extract(json.dumps(obj).encode(), "fhir.json")
    from backend.app.interpretation import build_analysis
    from backend.app.models import PatientContext

    a = build_analysis(rows, PatientContext(), "")
    assert a.observations[0].canonical_value == 7000
    assert a.observations[0].status == "within_report_range"
    assert info.methods == ["FHIR observations / components"]


def test_fhir_qualitative_component_and_loinc():
    obj = {
        "resourceType": "Bundle",
        "entry": [
            {
                "resource": {
                    "resourceType": "Observation",
                    "code": {
                        "coding": [{"system": "http://loinc.org", "code": "718-7"}]
                    },
                    "valueQuantity": {"value": 14, "code": "g/dL"},
                    "effectiveDateTime": "2026-01-01",
                }
            },
            {
                "resource": {
                    "resourceType": "Observation",
                    "component": [
                        {
                            "code": {"text": "HBsAg"},
                            "valueCodeableConcept": {"text": "Non-reactive"},
                        }
                    ],
                }
            },
        ],
    }
    rows, _ = extract(json.dumps(obj).encode(), "fhir.json")
    assert len(rows) == 2
    assert rows[0].name == "Hemoglobin"
    assert rows[0].report_date == "2026-01-01"
    assert rows[1].result == "Non-reactive"


def test_fhir_does_not_fetch_remote_results():
    rows, info = extract(
        json.dumps(
            {
                "resourceType": "DiagnosticReport",
                "result": [{"reference": "https://example.invalid/Observation/1"}],
            }
        ).encode(),
        "fhir.json",
    )
    assert not rows
    assert info.warnings


def test_fhir_multiple_ranges_require_review():
    obj = {
        "resourceType": "Observation",
        "code": {"text": "Hemoglobin"},
        "valueQuantity": {"value": 14, "code": "g/dL"},
        "referenceRange": [
            {"low": {"value": 12}, "high": {"value": 16}},
            {"low": {"value": 13}, "high": {"value": 17}},
        ],
    }
    rows, _ = extract(json.dumps(obj).encode(), "fhir.json")
    assert rows[0].issues
    assert ";" in rows[0].reference_text


def test_partial_pdf_retained_when_cloud_fails(monkeypatch):
    def fail(*args):
        raise CloudUnavailable("Synthetic provider failure.")

    monkeypatch.setattr("backend.app.cloud.extract_with_cloud", fail)
    out = io.BytesIO()
    c = canvas.Canvas(out)
    c.drawString(50, 780, "Hemoglobin 14 g/dL 12-16")
    c.showPage()
    c.showPage()
    c.save()
    rows, info = extract(out.getvalue(), "mixed.pdf", allow_cloud=True)
    assert len(rows) == 1
    assert any("Cloud OCR failed" in w for w in info.warnings)


def test_cloud_output_cannot_set_user_verified(monkeypatch):
    from backend.app.cloud import extract_with_cloud

    monkeypatch.setattr(
        "backend.app.cloud.call_cloud",
        lambda *a: {
            "observations": [
                {
                    "name": "Hemoglobin",
                    "result": "14",
                    "unit": "g/dL",
                    "reference_text": "12-16",
                    "user_verified": True,
                    "source_text": "Hemoglobin 14 g/dL 12-16",
                }
            ]
        },
    )
    rows = extract_with_cloud(b"test", "image/jpeg")
    assert not rows[0].user_verified
    assert rows[0].source_kind == "cloud_ocr"


def test_ai_rejects_unknown_evidence_ids(monkeypatch):
    from backend.app.cloud import explain_analysis
    from backend.app.interpretation import build_analysis
    from backend.app.models import PatientContext, RawObservation

    a = build_analysis(
        [
            RawObservation(
                name="Hemoglobin", result="14", unit="g/dL", reference_text="12-16"
            )
        ],
        PatientContext(),
        "",
    )
    monkeypatch.setattr(
        "backend.app.cloud.call_cloud",
        lambda *args: {
            "overview": "A cautious overview.",
            "context_notes": [
                {"text": "Unsupported claim.", "observation_ids": ["made-up-id"]}
            ],
            "doctor_questions": ["What should I ask?"],
            "limitations": ["Educational only."],
        },
    )
    with pytest.raises(CloudUnavailable):
        explain_analysis(a)
