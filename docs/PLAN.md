# Product plan and delivery boundaries

## Problem statement

A one-shot symptom chatbot has no durable context and can sound authoritative without being dependable. A generic report parser may silently confuse names, numbers, ranges and units. A recruiter should be able to inspect concrete engineering decisions, not just a prompt and a glossy chat UI.

## Chosen product

**Health Assist: a private personal health notebook that helps an adult organize observations and prepare for a clinician conversation.** Merge the lab workflow into the journal, not the old parser or unreviewed clinical database. Core value exists with no API keys, model latency, hallucination risk or cloud health-data service.

Primary jobs:

1. Remember what happened, when, and in what context.
2. Transcribe supported report results without inventing interpretation.
3. See repeats and arithmetic changes with explicit limitations.
4. Prepare a useful, reviewable set of visit questions.
5. Keep control of sensitive information and understand recovery limitations.

Non-goals: clinical diagnosis, triage, treatment, medical advice, medication checks, automated medical clearance, pediatric or pregnancy-specific interpretation, clinical-grade records, emergency monitoring.

## What was rebuilt

| Original concern               | Implemented response                                                 | Remaining limit                                    |
| ------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------- |
| LLM-only wrapper               | Pure longitudinal/CSV/unit/range engine                              | No disease inference; not medical AI research      |
| Session-only history           | Encrypted IndexedDB journal                                          | Browser-specific; no cloud sync                    |
| History doesn't affect outputs | Repeat counts and grounded visit questions                           | No causal associations or predictions              |
| Faulty lab parsing             | Exact catalog and human-reviewed structured input                    | No arbitrary PDFs or OCR                           |
| Generic UI                     | Editorial hierarchy, distinctive palette, true task-oriented screens | Usability testing with real users still needed     |
| Unsafe backend/data handling   | No health-data endpoints or upload server                            | Hosting still sees connection metadata             |
| Poor practices                 | Strict schemas, test suites, CI, docs, source policy                 | Independent security/clinical review not performed |
| Missing disclosures            | In-app limits, emergency reminder, source links, export warnings     | Disclaimers alone never establish safety           |

## Delivery phases

### Phase 1 — Shipped in this handoff

Validated domain model, pure engine, complete check-in/lab/timeline/visit/settings/source flows, encrypted local persistence and backups, desktop/mobile/dark layouts, tests, build, deployment instructions.

Acceptance: reproducible `npm ci`, passing checks, functional demo without keys, no silently accepted invalid units, no plaintext journal persistence, usable 390px interface, no claim of diagnosis.

### Phase 2 — After user feedback, before broader real-world use

- Recruit 5–8 adult usability testers using **synthetic** scenarios; measure task completion and input mistakes, not medical outcomes.
- Independent security review of key lifecycle, CSP, third-party dependencies and browser-storage failure cases.
- Clinical review of all health wording; legal/regulatory review if claims or use expand.
- Feature-level component extraction; error boundaries and more complete keyboard/screen-reader review.
- More robust source-review automation, signed release notes and dependency-update cadence.

### Phase 3 — Evidence-gated features, not implemented

- **PDF assistance:** browser-side extraction, raw line provenance, per-field confidence, mandatory confirmation, scanned/rotated/ambiguous-report test corpus, bounded workers and cancellation. Never auto-save extraction as truth.
- **Cloud sync:** authenticated user identity, row-level access controls, migrations, data retention/deletion, access logs without health text, secure backup/recovery, incident response and region/privacy review. Local vault keys must not be casually repurposed for server sync.
- **Optional LLM explanation:** opt-in, minimal redacted structured facts, governed source retrieval, constrained/validated output, request timeouts and quotas, safety checks, no disease ranking. Core experience must remain useful without it. Add an evaluation set and abuse tests before enabling.
- More analytes only with exact mappings, unit tests and a source/provenance review. Clinical threshold databases require population/method context and qualified review; never scrape generic ranges into “truth.”

## Success measures

Journal save/restore integrity, zero silently dropped CSV rows, input error detection, source clarity, task completion at mobile widths, and users correctly understanding that the app cannot diagnose or clear emergencies. Do not invent health-outcome or accuracy metrics.
