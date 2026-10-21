# Security, privacy and medical-safety notes

## Implemented controls

- Processing permission is required; optional cloud permission is separate.
- No report database, server-side history endpoint, client-supplied history identifier, or health-content telemetry is implemented.
- Files and requests are size-bounded before multipart processing; uploads are closed, processed in memory and never stored under a user-supplied filename.
- PDF signatures, page counts and geometry are checked. Office containers have expanded-size, member-count and path/encryption/macro checks. DOCX uses defused XML. Images are decoded, dimension/frame-checked and re-encoded without EXIF before cloud use.
- Input and output models reject unknown fields and bound lengths/counts. The frontend validates API responses before rendering.
- Unknown tests, unsupported units, missing intervals, conflicts, negative/invalid percentages, repeated measurements and OCR uncertainty remain visible rather than becoming diagnoses.
- No fuzzy score is presented as medical confidence. Urea/BUN, HDL/LDL/total cholesterol and absolute/differential counts are distinct.
- Client corrections do not supply trusted computed classifications: the server recomputes them.
- Provider calls are opt-in, bounded, schema-validated, and contain no tools or automatic external patient-record retrieval. Explanations must cite IDs from supplied eligible observations.
- No tracebacks, raw validation inputs or provider error bodies are intentionally returned to the browser. Application error logging records only an exception class.
- Same-origin frontend, no CDN scripts, no third-party fonts/analytics, production CSP, no-store API responses and framing restrictions.
- Local saving is explicit, size-bounded and schema-validated on load. It is not encryption or an authenticated medical record.
- CSV exports escape quotes and prefix potentially executable spreadsheet cells. JSON and print exports are deliberate user actions.
- Shared Redis rate/spend limits can be configured; cloud calls on Vercel fail closed without shared configuration. See the deployment guide for residual risks of per-instance limits.

## Threats that are not “solved” by this package

1. **Clinical error.** The test suite validates engineering behavior with synthetic fixtures, not medical safety across labs, conditions, ages or populations. A clinician must review conversions, applicable intervals, language, intended use and critical-result policies. Within-range is not a clean bill of health.
2. **Unknown formats / missing observations.** Layout heuristics and probabilistic OCR can omit or misassociate data. Unparsed-line examples and extraction warnings are aids, not proof of complete coverage. Handwriting and multilingual reports are not guaranteed.
3. **Malicious documents.** Resource limits and maintained parsers reduce exposure but do not sandbox all parser vulnerabilities or decompression/memory attacks. For adversarial uploads or higher assurance, move parsing into an isolated, killable worker with CPU/RAM/deadline budgets and controlled outbound access.
4. **Prompt injection / model hallucination.** System instructions and structural/evidence validation are defenses, not semantic truth guarantees. A provider can return medically unsound text while satisfying the schema. No model-generated treatment or diagnosis is a supported product function.
5. **Provider/hosting handling.** Cloud transcription can send identifying content contained in a PDF/image. Explanations send selected results plus symptoms/context, which can also identify a person. Provider policies and hosting logs require review and appropriate agreements. No claim of zero provider retention is made.
6. **Anonymous public abuse.** There is no account or authentication implementation because the app stores no server-side records. Configure shared limits/firewall/provider budgets, and add authentication if appropriate. The application does not offer multi-tenant persistent history.
7. **Local browser compromise.** Someone using the same browser, an extension, or an XSS vulnerability elsewhere in the same origin could read locally saved records. Use a dedicated origin, avoid shared devices, and provide a clear deletion policy. The app filters expired reports on load; deletion is explicit or occurs when records are overwritten, not a background browser-erasure guarantee.
8. **Provider availability and deployment routing.** Live Gemini calls and a real Vercel deployment were not performed. Preview smoke tests are required. The 60-second function configuration is not proof that every supported report finishes within it.
9. **Regulatory and licensing status.** No HIPAA/GDPR certification, diagnostic accuracy certification, FDA determination, or jurisdiction-independent legal compliance is asserted. Original blood-analyzer reuse rights must be confirmed because its archive lacked a license.

## Before production

Rotate any credential exposed by an earlier project, restrict the replacement, configure provider billing alerts/limits, enable shared abuse prevention, review access/retention/consent policies, validate representative reports, verify current dependency advisories and licenses, perform deployment smoke tests and clinical/privacy/security review.

## Dependency inventory and licensing

Runtime packages are pinned in `requirements.lock`; frontend versions are pinned in `frontend/package.json` and `package-lock.json`. `requirements.in` records the direct Python runtime choices. Development tools are separate. PyMuPDF, Torch and sentence-transformers are absent from the new dependency graph; this avoids carrying their large runtime or PyMuPDF licensing choice into this implementation. It is not a blanket license clearance for the project.

Review the actual installed distributions and transitive licenses before release. The existing HealthAssist MIT license is retained for attribution; it cannot grant rights to third-party work or data the original author did not own.
