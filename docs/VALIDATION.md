# Validation record — HealthAssist 2.0

This is an implementation test record, not clinical validation or a guarantee of universal report compatibility.

## Parser patch 2.0.3

The backend suite was rerun after the PDF parser fix: **138 tests passed**, including 23 new synthetic layout, metadata-exclusion, contextual differential-count and API regressions. The supplied digital PDF was also processed locally through the API, without cloud processing. The personal PDF and its extracted contents are not included in this project or test fixtures.

Browser, accessibility, contrast, print and dependency-audit records below are earlier baseline checks; this patch does not change UI behavior or dependency versions. A successful deployment of the preceding fixes was subsequently reported by the owner, not independently audited here. Deploy and smoke-test 2.0.3 separately.

## Executed checks

| Area | Result | Scope |
| --- | --- | --- |
| Backend regression suite | 138 passed | Parsing, units, comparator intervals, qualitative results, unknown/duplicate/conflicting observations, FHIR, file limits, consent, safe errors, cloud failure recovery and verification requirements |
| Browser integration checks | 26 passed; no page errors | Actual local frontend/API integration, sample report, correction/recheck, filters, saving/restoring, error recovery and empty scans |
| Responsive layouts | No horizontal overflow in checked states | Viewports 320, 390, 768, 1024, 1440 and 1920 pixels wide; not every device/browser combination |
| Automated accessibility | 0 detected violations in 5 checked states | Desktop/mobile intake, mobile privacy dialog, mobile report, dark report; some gradient contrast checks remain incomplete in axe |
| Palette contrast | 22 checked pairs passed | Text at least 4.5:1; tested control boundaries at least 3:1; not pixel-by-pixel WCAG certification |
| Production frontend build | Passed | TypeScript and Vite, including Node 22.23.3; also built on Node 24.14.1 |
| Python static checks | Passed | Ruff undefined/unused-name checks and formatting |
| Dependency scans | No known vulnerabilities reported | npm audit and pip-audit against the locked runtime dependencies at implementation time; not proof of absence of vulnerabilities |
| Print layout | Visually inspected, 2 A4 pages | Synthetic clinician brief, repeated table heading and unfiltered observations; selectable text |
| Vercel configuration | Schema instance validation passed | Configuration only; no live deployment performed |

The pytest run emits one upstream Starlette test-client deprecation warning. It does not fail the tests. No patient records were used for these checks.

## Reproduce core checks

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
pytest -q
ruff check --select F backend api tests
ruff format --check backend api tests
npm --prefix frontend ci --ignore-scripts
npm --prefix frontend run build
npm --prefix frontend audit
```

Machine-readable local browser, accessibility and contrast results are included in `validation-artifacts/`. The browser QA harness and its external test tooling are not runtime dependencies. The shipped pytest tests can be run directly from this source package.

## Not yet verified / release gates

- Actual Vercel deployment, production routing, function packaging, latency, concurrency and provider timeouts.
- Live Google model OCR/explanations, exact model schema support and account/region access. Provider behavior was tested through controlled mocks, not live calls.
- Live Upstash Redis integration, distributed production limits and billing controls.
- Clinician-reviewed accuracy across laboratories, languages, populations, uncommon assays, handwriting and unusual layouts. The parser deliberately preserves unknowns rather than claiming universal coverage.
- Full manual accessibility audit and broad browser/device assistive-technology testing.
- Independent penetration test, privacy/regulatory review, and third-party licensing review before customer-facing healthcare use.

Reference intervals are taken from the supplied report, not clinical default ranges. A within-interval result is not evidence that a person is healthy; no automatic critical-value thresholds, diagnosis or emergency assessment are implemented. Extraction gaps and unsupported formats must be treated as incomplete, never as an all-clear.
