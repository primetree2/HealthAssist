# Source provenance and update process

## Registry

`lib/catalog.ts` is the versioned registry. Catalog version is exposed in-app and through `GET /api/catalog`. Initial content/link review: 2026-10-19. A review date is not clinical certification and must not be bumped by automation.

| Source                                                | Purpose                                                                                     | What it is not used for                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| MedlinePlus / NLM, How to Understand Your Lab Results | Limits of reference intervals, lab-to-lab differences, no reassurance from in-range results | Providing default clinical intervals, diagnosis or treatment               |
| MedlinePlus / NLM, Recognizing Medical Emergencies    | Non-exhaustive warning-sign examples and immediate-help principle                           | A complete triage protocol, regional number routing or automated detection |

No medical reference database is copied from the original blood-report project. The six test names and accepted units are an intentionally limited engineering catalog, not a comprehensive clinical ontology. Dimensional scaling is algebra: g/L → g/dL and mg/L → mg/dL multiply by 0.1; K/µL = 10^9/L. No molecular conversions are supported. Demo values and intervals are fictional.

## Update workflow

1. Monthly, and before each release, run `npm run sources:check` to detect unavailable URLs. A 200 response proves only URL availability, not correctness or unchanged content. Access blocks may require a manual browser check.
2. A maintainer reads the authoritative pages, checks relevance and revisions, and records what changed. Use only synthetic test data while revising rules/wording.
3. For changes affecting health content, require qualified clinical review before expanding claims. If no clinician is available, retain the conservative scope rather than inventing an update.
4. Update `reviewed` **only after human content review**, bump `CATALOG_VERSION`, explain the change in the changelog, update regression cases and run checks.
5. Review unit additions with explicit test-specific factors, provenance and invariant tests. Unknown inputs must continue to fail closed.
6. Never auto-overwrite a user's reported value/interval. A source update must not rewrite personal history. For a future version change, use a tested migration with a backup/rollback path.

A scheduled CI job checks URLs and fails visibly if unavailable; it does not ingest or publish new clinical data. Pinning a reviewed registry is safer here than scraping changing medical thresholds into a generic database.
