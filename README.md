# HealthAssist 2.0 — unified, evidence-first health briefs

A source-code merge of HealthAssist and the Blood Report Analyzer, rebuilt around **extract → verify → compare with the report → prepare for a clinician conversation**.

**This is a tested engineering prototype, not a clinically validated medical device or a universal report parser.** A production deployment still needs representative-report validation, clinician review, privacy/legal review, monitoring, and a live deployment smoke test.

## PDF parser patch 2.0.3

Separated PDF headers now propagate only to geometrically aligned table grids. Range-before-unit layouts, wrapped catalog names, patient-header exclusion and percent-versus-absolute differential counts have regression coverage. Table-owned regions are not parsed a second time as free text. See `docs/PDF-PARSER-FIX.md` for upgrade steps and remaining limitations.

## What changed

- One React + TypeScript interface and one FastAPI backend, using same-origin `/api` routes.
- Retained aurora effects, with calm light/dark/system themes, responsive layouts, readable result cards, reduced motion, keyboard navigation, and safe error states.
- Digital PDF tables and text, coordinate-derived columns, fallback PDF text extraction, scanned documents via optional consented cloud transcription, delimited files, spreadsheets, DOCX, structured JSON, and a conservative FHIR adapter.
- Exact analyte aliases instead of forced fuzzy/semantic matches. Ambiguity is visible, not converted to a confidence percentage.
- Original results, comparators, units, laboratory intervals, qualitative findings, source snippets, page/row/table/sheet provenance, and repeated observations are retained.
- Explicit analyte-aware conversions. No unknown unit is silently replaced with a canonical unit.
- Arithmetic compares values against the **interval on that report, in the report’s units**. No unsourced adult reference ranges are substituted.
- Extreme observations are not discarded just for being extreme. Invalid or uncertain values stay visible for correction.
- Scanned/cloud-extracted rows are withheld from interpretation until checked by the user.
- Row corrections are validated and recomputed on the backend. Printed flag conflicts remain reviewable even after a user checks a row.
- Optional Google Gemini explanation uses structured facts and validates evidence IDs. No model or OCR engine downloads at startup.
- No server-side report history. Explicit local saving, deletion, CSV/JSON export, and a selectable-text print/PDF brief with **all observations**, independent of active filters.
- Bounded uploads/inputs, safe errors, no-store API responses, source-size limits, Office-container checks, request limits, and a shared cloud-spend quota option.
- Heavy ML dependencies, original database scaffolding, deprecated AI SDK, CDN scripts, and embedded credentials are not carried into this version.

## Quick start

Prerequisites: **Python 3.13**, **Node 22.12+** (Node 22 LTS recommended).

```bash
# From the repository root
python3.13 -m venv .venv
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
npm --prefix frontend ci --ignore-scripts
```

Terminal 1:

```bash
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2:

```bash
npm --prefix frontend run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to the Python service. Do not open the HTML file directly and do not run only the frontend if you want extraction to work.

No API key is needed for digital/structured extraction, report-relative arithmetic, editing, or the standard clinician questions. The “Explore a sample report” button processes synthetic CSV data through the actual API; it does not fabricate a response.

### Optional local cloud processing

Copy `.env.example` to `.env`, fill in only the settings you want, and start:

```bash
uvicorn backend.app.main:app --reload --env-file .env --port 8000
```

`python-dotenv` is a development dependency for the `--env-file` option. Production reads environment variables supplied by the host. **Never use `VITE_*` variables for secrets.**

## Supported inputs and honest limits

| Input | Method | Important limitation |
|---|---|---|
| Digital PDF | Table lines, coordinate/text table fallback, anchored text, pypdf text fallback | PDF up to 15 pages; unusual reading order or multiple interval columns may need correction. |
| Scanned/mixed PDF | Optional Google Gemini transcription | Cloud consent + configured model required; up to 8 pages for OCR. OCR is probabilistic and rows require checking. |
| PNG / JPEG / WebP | Signature/image validation, metadata-stripping re-encode, optional cloud transcription | Up to 16 megapixels; one frame; cannot transcribe without consented cloud processing. |
| TXT | UTF-8/UTF-16, anchored names and values, column headers | Primarily English laboratory names. Unknown/unparsed lines are exposed for review. |
| CSV / TSV | Quoted delimited columns, common header aliases | Preserve name/result/unit/interval columns. Decimal commas require checking. |
| XLSX | Read-only, cached cell values, up to 8 sheets | No macro-enabled/legacy XLS; formulas are not calculated; 5,000 rows and 40 columns per sheet. |
| DOCX | Secure XML, table cells and direct body paragraphs | Embedded images are not automatically OCR’d; export those pages to an image/PDF. |
| Observation JSON | Validated observation objects | Schema below; not arbitrary JSON. |
| FHIR JSON | Observation, components, Bundle entries, inline DiagnosticReport-contained observations | No remote patient-record fetches. Multiple subjects/ranges require verification. Not a complete FHIR validator. |

**Not guaranteed:** handwriting, every language, every lab’s layout, low-resolution scans, novel assays, password-protected PDFs, malformed documents, multiple people in one report, or reference intervals expressed as complex clinical algorithms.

Limits: 4,000,000 file bytes; 4,300,000 total request bytes; 300 observations; 150,000 extracted text characters; 20,000 pasted-text characters; 4,000 symptom characters. Large reports need splitting or a future direct-to-private-storage + asynchronous-worker workflow.

A failed or partial extraction is never an “all normal” conclusion. Review the extraction notes and original report.

## Structured JSON example

```json
[
  {
    "name": "Hemoglobin",
    "result": "140",
    "unit": "g/L",
    "reference_text": "120–160",
    "flag": "",
    "report_date": "2026-10-01"
  },
  {
    "name": "HBsAg",
    "result": "Non-reactive",
    "unit": "",
    "reference_text": "Non-reactive"
  }
]
```

`result` is a string, preserving `<`, `>`, qualitative values, and decimal formatting. The full brief exported by the UI is an archival API-response object, not this import schema; its observations include nested `raw` fields.

## Tests and production build

```bash
pytest -q
npm --prefix frontend run check
npm --prefix frontend run build
npm --prefix frontend run preview
```

See `docs/VALIDATION.md` for the executed checks and boundaries of the test evidence. Test fixtures are synthetic; no real medical records are included.

## Deploy to Vercel

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**. Import the **repository root**, not just `frontend/`. The root `vercel.json` explicitly selects Vite, builds the static app, bundles `api/index.py` plus the Python backend, and rewrites `/api/*` to the function. Python 3.13 is selected in `.python-version`.

Digital processing works without cloud settings. On Vercel, optional cloud features remain **disabled until shared rate limiting and the API/model are configured**.

## Project layout

```text
api/index.py                 Vercel ASGI function entry
backend/app/main.py          validated API endpoints
backend/app/extraction.py    bounded multi-format extraction
backend/app/parsing.py       table/text strategies + deduplication
backend/app/fhir.py          conservative structured-record adapter
backend/app/numbers.py       numeric, comparator, interval and unit arithmetic
backend/app/interpretation.py report-relative classifications and limitations
backend/app/catalog.py      exact alias matching
backend/app/cloud.py        opt-in provider integration
backend/app/security.py     body limits, response headers, request/spend limits
frontend/src/               responsive React interface
frontend/public/samples/    synthetic demonstration data
tests/                     reproducible synthetic regression tests
docs/                      deployment, validation and security notes
```

## Important clinical and privacy boundaries

The software does **not** determine a diagnosis, prescribe, rule out disease, apply clinically validated critical-value thresholds, or decide that urgent care is unnecessary. The urgent-symptom checkbox is an explicit warning mechanism, not a triage classifier. Printed critical flags are surfaced without pretending the app can assess their urgency.

No application-level server history is implemented. Hosting/provider operational logging and provider data policies still matter. Local saving is opt-in and **not encrypted by this app**. Use appropriate contracts and organizational controls before processing real patient records. Neither HIPAA, GDPR nor any other compliance certification is claimed.

The original HealthAssist archive contained an API-key-like string. **Rotate it if genuine, even though it is absent from this clean merge.** Deleting a line from a new version does not revoke an old credential.

## Credits and licensing

Original projects supplied by the user; HealthAssist’s existing MIT license is retained. The original blood-analyzer archive had no license file: confirm reuse rights before redistribution. The migrated catalog retains names/aliases/units but deliberately removes the old unsourced disease associations, medication groups and default ranges. PyMuPDF and the heavyweight semantic-model stack are not dependencies in this merge. Review all third-party licenses and report rights before release; see `docs/SECURITY.md`.
