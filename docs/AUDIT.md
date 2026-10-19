# Audit of the supplied archives

Static source review, not a penetration test or a claim that every vulnerability was found. References below are relative to the supplied original projects. Neither archive is included in the release zip.

## HealthAssist-main

| Evidence                                                  | Finding                                                                                   | Rebuild decision                                                     |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `backend/app/main.py`: `SESSION_HISTORY = {}`             | Active history is process memory, not durable across restarts/instances; unbounded growth | Encrypted local persistence with explicit schema/cardinality limits  |
| `main.py`: supplied `x_session_id` selects history        | A client-chosen session string is not authenticated ownership                             | Remove remote health-history API entirely                            |
| `main.py`: `call_llm(...)` happens before history access  | Previous records do not influence output                                                  | Pure engine explicitly consumes whole journal                        |
| `utils.py`: permissive JSON regex fallback                | Extracting any JSON-looking substring is not schema validation                            | No generative medical output; Zod at persistence/input boundaries    |
| `utils.py`: exception messages returned in results        | Internal/provider details can reach UI                                                    | Fixed user-safe storage/import errors; no provider boundary          |
| `utils.py`: commented apparent API credential             | Credentials may remain in repository history                                              | Exclude original source; owner must revoke/rotate and review history |
| `main.py`: unrestricted `file.read()`                     | No clear request-byte/page/time limits before PDF work                                    | No upload endpoint; bounded local CSV only                           |
| `crud.py`: global history query and symptom debug logging | Unsafe to expose as multi-user API; sensitive debug output                                | No health-data logs/server database                                  |
| `frontend/src/api.js`: sessionStorage ID                  | Tab/session continuity is not durable person history                                      | Explicit persistent vault and in-memory demo                         |
| `db.py`: schema creation at import                        | Not a versioned production migration strategy                                             | Local versioned schema; no pretend cloud DB                          |

## blood-report-analyzer-main

| Evidence                                                                              | Finding                                                                               | Rebuild decision                                                        |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `app/main.py`: traceback included in JSON                                             | Leaks implementation details and potentially report-processing context                | No report-upload server                                                 |
| `main.py`: wildcard CORS plus credentials                                             | Broad, invalid/unsafe cross-origin assumptions                                        | Same-origin read-only endpoints, no credentialed cross-origin API       |
| `main.py`: temp file removed only after success                                       | Exceptions can leave uploaded report files behind                                     | No report temp files                                                    |
| `analyzer.py`: `convert_unit_if_applicable` returns canonical unit for unknown inputs | Can relabel incompatible units without a valid conversion                             | Exact per-test unit allowlist; reject unsupported input                 |
| `analyzer.py`: `pick_reference_range` picks first available group as fallback         | Missing patient context can select an inappropriate interval                          | Never guess demographic range; use original report bounds only          |
| `analyzer.py`: `parse_numeric_value` fallback regex                                   | Can pull unrelated digits out of an ambiguous string                                  | Strict full-string numeric CSV parsing                                  |
| `analyzer.py`: table extraction discards range/unit column context                    | Original report context can be lost before interpretation                             | Require range/unit provenance in the reviewed input                     |
| `analyzer.py`: fuzzy/semantic matching for lab identity                               | Similar text is not proof of identical clinical analyte                               | Exact aliases only                                                      |
| `analyzer.py`: groups pick one “best” candidate                                       | Multiple distinct draws/results may collapse silently                                 | Duplicate guard; preserve latest-date ties, block ambiguous comparisons |
| OCR/model initialization and broad optional imports                                   | Heavy runtime and external model dependency unsuitable for a small serverless request | Lightweight Next.js runtime; no model downloads                         |

## Migration

No automatic migration is supplied. The active legacy history store is transient, and arbitrary old model results should not be treated as verified observations. Re-enter verified observations and supported lab values, or convert _reviewed values_ into the exact CSV template. Back up original data separately, excluding credentials. Do not import legacy generated diagnoses.
