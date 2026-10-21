# PDF parser patch 2.0.3

## Upgrade an existing 2.0.2 deployment

1. Extract the patch ZIP into a temporary folder.
2. Copy its `backend/`, `tests/`, `docs/`, `frontend/` and root package/README files into the matching locations in your existing repository, replacing only matching files. The frontend folder in this patch contains package metadata only, not a replacement interface. Do not delete unrelated files.
3. Keep your existing flattened `requirements.txt`, `requirements.lock`, `api/index.py`, `.python-version`, and `vercel.json`. This patch does not require new packages or environment variables.
4. Review and commit the changes, then push. The connected Vercel project should deploy the new commit.
5. Confirm `/api/health` reports `version: 2.0.3`. Run the synthetic sample, then upload a fresh copy of the previously affected PDF with cloud processing disabled.
6. Previously saved/exported briefs contain old extracted rows; they are not automatically migrated or reparsed. Start a new analysis from the original file. Do not rely on rechecking an old misparsed brief to restore missing columns.

PowerShell, from the repository root after copying:

```powershell
git diff --stat
git add backend tests docs frontend/package.json frontend/package-lock.json package.json README.md
git commit -m "Fix separated PDF headers and result-column mapping"
git push
```

## Fixes

- Recognize abbreviated biological-reference-range headers.
- Carry separated PDF header mappings to following tables only when their column boundaries align on the same page.
- Correct the headerless range-before-unit fallback so the interval is not overwritten.
- Join wrapped exact catalog names without confusing them with multiple measurements.
- Keep table parsing and free-text fallback spatially separate, avoiding duplicate, conflicting extraction paths while preserving measurements outside tables.
- Exclude common patient/client metadata from observation candidates.
- Resolve percentage versus absolute white-cell observations from explicit cell-count units or an absolute-count panel. Keep printed names and source sections.
- Add conventional exact aliases and missing absolute monocyte, absolute basophil and indirect bilirubin entries; no generic clinical reference intervals were added.
- Warn when narrative comments or interpretation guidance are present, rather than treating reference examples as patient measurements.

## Safety boundaries retained

Unknown names are not fuzzy-matched. Grouped numeric separators still require checking. A blank ratio unit is not silently filled in; ESR reported in `mm` is not relabeled as `mm/hr`. Clinical narrative and smear findings are not fully interpreted: read them in the original report. Unsupported layouts and low-quality scans still need review. No AI key is needed for this digital-PDF correction.

## Validation

138 backend tests passed, including 23 new synthetic regressions, plus a local API check of the supplied PDF. No personal PDF, identifying information, or extracted patient-data fixture is included in this patch. Live Vercel verification of this release remains the operator's smoke test.
