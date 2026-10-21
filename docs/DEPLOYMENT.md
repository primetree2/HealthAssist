# Vercel deployment guide

## 1. Repository and project settings

1. Unzip this project into a new repository or integration branch. Do not overwrite a production repository without reviewing the changes.
2. Commit the source, `frontend/package-lock.json`, `requirements.lock`, `.python-version`, and `vercel.json`.
3. In Vercel, import that repository and leave the **Root Directory at the repository root**.
4. Use the provided configuration: framework **Vite**, install command `npm --prefix frontend ci --ignore-scripts`, build command `npm --prefix frontend run build`, output `frontend/dist`.
5. The Python function is `api/index.py`. Its dependencies are installed from the root `requirements.txt`, which contains the same flat pinned dependency list as `requirements.lock`. The backend is explicitly included in the function bundle.
6. Node 22 LTS and Python 3.13 are selected by the supplied project files. No Docker, PostgreSQL, Torch, sentence-transformer download, Tesseract binary, CDN JavaScript, or separate frontend API URL is required.

**Do not import only `frontend/`:** you would deploy the interface without its API.

This project intentionally uses the file-based `/api` function alongside the explicitly selected Vite preset. Do not switch the project to the FastAPI framework preset without also adapting its frontend/static routing. Vercel’s framework-native FastAPI preset handles routing differently.

## 2. First deployment without optional AI

No secrets are required for digital report extraction. Deploy a Preview first.

Check:

- `/` loads the interface and its CSS/JS.
- `/api/health` returns JSON with `status: ok` and `version: 2.0.0`, not the frontend HTML.
- “Explore a sample report” returns 8 observations, 2 outside the sample interval, 5 within, and 1 qualitative finding.
- A digital PDF can be uploaded and row corrections recomputed.
- A photo without OCR configuration produces an explicit warning or safe error, never an all-clear result.

If `/api/health` returns HTML or 404, check the project root, selected Vite preset, rewrite, and Python function build logs. Do not “fix” it by exposing a secret through a frontend environment variable.

## 3. Enable shared request limits before public use

Create a private Upstash Redis database, then set these **server-only** Vercel environment variables:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RATE_LIMIT_SALT` — a new random value; generate locally with Python’s `secrets.token_hex(32)`.

The implementation uses Redis REST `EVAL` with `INCR` and expiry, not a process-local counter for shared production limits. IP-derived keys are HMAC-hashed; raw report data is not sent to Redis. Vercel’s forwarding header is used only on Vercel; local development does not trust arbitrary `X-Forwarded-For` headers.

Limit: 12 processing requests per client key per 60-second window. A configured shared limiter that fails is **fail-closed** (503). Without Redis, deterministic processing has only a bounded, best-effort per-instance limiter; that is **not** distributed abuse protection. Configure Vercel Firewall, spend limits, alerts and, where appropriate, authenticated access for real customers.

A global rolling 24-hour cloud-request allowance is controlled by `CLOUD_DAILY_REQUEST_LIMIT` (default 100). A request can perform transcription and explanation, so this is not a token-level or currency-denominated budget. Configure provider-side billing controls as well.

## 4. Optional cloud transcription / explanations

Set:

- `GOOGLE_API_KEY` — new restricted key; never reuse a publicly exposed key.
- `GEMINI_MODEL` — a currently available model in your account supporting PDF/image input and structured JSON output.

Cloud features on Vercel require both these settings **and** the shared limiter settings above. Redeploy after changing variables; configure Preview and Production environments separately.

The application uses Google’s REST `generateContent` endpoint with `responseJsonSchema`, an explicit provider timeout, output-size limits, schema validation, and evidence-ID validation. It does not use the deprecated `google-generativeai` package.

**Live provider calls were not executed during this implementation.** Before enabling it for customers, test the exact selected model, schema support, account/region access, response time, consent language, data policy, and budgets with synthetic reports. Provider output can be structurally valid yet medically wrong; clinical review remains necessary.

Scanned documents are sent only after explicit cloud permission. Every cloud-transcribed row initially requires manual checking. For a mixed PDF, failed OCR preserves readable digital rows with a clear incomplete-extraction warning when available.

## 5. Serverless constraints

- Vercel documents a 4.5 MB function request/response payload limit. This app accepts files up to 4 MB and bounds the full request at 4.3 MB to leave room for multipart overhead.
- Configured function maximum duration: 60 seconds. Browser deadline: 65 seconds. Provider network deadline: 25 seconds per call. CPU parsing and provider work still need real deployment measurements.
- No persistent local files or process-memory history are used for records. PDFs and images are processed from bounded in-memory buffers. The upload stream is closed after processing.
- Static frontend assets are built separately and served from the CDN. The function excludes the frontend, tests, and documentation; Python dependencies are limited to extraction/API essentials.
- Security headers include no-store API responses, a same-origin CSP, framing restrictions and no-referrer policy. There are no analytics or third-party scripts in the interface.
- Client cancellation stops waiting; it does **not** guarantee server-side processing or a provider request is canceled.

For much larger reports, high throughput, stronger parser isolation, private cloud history, or guaranteed background processing, add private direct uploads, authenticated jobs and an isolated worker. Those are not implemented in this package and must not be simulated by increasing a progress bar.

## 6. Go-live checklist

- [ ] Preview deployment passes all smoke tests; routing and dependency bundling verified on Vercel.
- [ ] Old exposed credentials rotated; replacements restricted and budgeted.
- [ ] Shared limits and provider-side budgets tested, including failure behavior.
- [ ] Representative digital/scanned reports tested across intended labs and languages.
- [ ] Clinician validates intended classifications, conversion tables and warnings.
- [ ] Privacy, consent, contracts, jurisdictional regulation and licensing reviewed.
- [ ] Monitoring excludes raw reports, symptoms and provider secrets.
- [ ] Mobile, keyboard, dark mode, error states and exports checked on intended real devices.
- [ ] Incident response, support contact, retention/deletion policies and rollback established.

**The project has been built and tested locally; it has not been deployed to your Vercel account.**

## Official references

- [Vercel Python API directory](https://vercel.com/docs/functions/runtimes/python/api-directory)
- [Vercel Python versions](https://vercel.com/docs/functions/runtimes/python/python-version)
- [Vercel function limits](https://vercel.com/docs/functions/limitations)
- [Vercel FastAPI framework preset](https://vercel.com/docs/frameworks/backend/fastapi)
- [Google structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)


## Troubleshooting: unused_function / unmatched api/index.py

The initial source bundle had an entrypoint export removed during static cleanup. Ensure the committed root `api/index.py` contains:

```python
from backend.app.main import app as app
```

The explicit re-export is intentional: it preserves the ASGI callable through unused-import cleanup. `tests/test_vercel_entrypoint.py` guards this behavior. Commit the fix and redeploy. If the same discovery error remains, verify that Vercel's Root Directory is the repository root and that `api/index.py` is present in the deployed commit and not ignored. Do not simply delete the functions configuration: that can hide a missing API rather than fix it.


## Troubleshooting: PYTHON_REQUIREMENTS_PARSE_ERROR

Vercel CLI 64.5.0 rejected the original `-r requirements.lock` include while parsing the function dependencies. The corrected root `requirements.txt` contains every pinned runtime dependency directly, with the same contents as `requirements.lock`. Keep these files identical when upgrading dependencies. Do not substitute `requirements-dev.txt`: test tooling is not needed in production.

To patch an existing checkout:

```bash
cp requirements.lock requirements.txt
git add requirements.txt
git commit -m "Flatten Python requirements for Vercel"
git push
```

Redeploy the resulting commit. The Node 22-versus-24 notice is informational, not the cause of this failure.
