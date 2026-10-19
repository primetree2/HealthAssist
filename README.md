# Health Assist 2

### Your health, in context.

A rebuilt, **local-first health journal and lab companion**, not an LLM diagnosis wrapper. A complete Next.js/TypeScript application designed for Vercel, with no database provisioning or paid API required.

> **Educational portfolio prototype. Not medical advice, a diagnostic system, an emergency service, or a validated medical device.** Do not use it to decide that someone is safe, diagnose disease, or change treatment. It is intended for adults organizing their own observations. See [Safety](docs/SAFETY.md).

## Run in three commands

Requires Node.js 22+ and npm. Recommended: Node 22 LTS. Use a current browser with Web Crypto, IndexedDB and Web Locks. Localhost is a secure context; public deployments need HTTPS.

```sh
npm ci
npm run dev
# Open http://localhost:3000
```

No `.env` values are required. Click **Explore with fictional data** for a polished demo without creating a journal. Demo edits disappear on refresh. For persistent records, create a journal with a strong passphrase (12–256 characters). Do not use sensitive real health data to evaluate this unreviewed prototype.

## What actually works

- **Longitudinal journal:** dated symptom observations, personal intensity ratings, notes, required warning-sign acknowledgment, unified searchable timeline, per-entry deletion.
- **History-informed outputs:** recurrence counts on distinct days within a rolling 30-day window; visit questions grounded in those counts and your latest report entries. No fabricated associations.
- **Lab notebook:** six explicitly supported tests, exact alias mapping, test-specific units, two-sided report-bound comparisons, unit-scaled changes, blocked ambiguous comparisons, provenance labels, original values retained.
- **Reviewable CSV import:** strict header, quoted fields, bounded size/row count, exact numeric parsing, atomic validation, duplicate protection, full preview and required human confirmation. No fuzzy matching or silent dropping of rows.
- **Private browser vault:** AES-256-GCM authenticated encryption, PBKDF2-SHA-256 derivation, non-extractable in-memory key, IndexedDB ciphertext, background/idle lock, exclusive multi-tab locking, encrypted backup/restore, destructive action confirmation.
- **Visit preparation:** deterministic questions, preview, portable plaintext export with privacy warning. Not a generated clinical summary.
- **Intentional UI:** calm editorial typography, petrol/olive visual system, warm surfaces, responsive desktop/mobile layouts, dark-mode support, keyboard focus, reduced-motion support, source and safety pages. Soft CSS-only aurora accents preserve the original visual identity without animating data-entry surfaces.
- **Small server boundary:** read-only `/api/health` and versioned `/api/catalog` endpoints. Journal content never goes to an app API, model, analytics provider or remote database.

## Deliberate scope boundaries

**No chat model, automatic PDF/OCR extraction, authentication service, cloud sync, drug advice, diagnosis ranking, risk scoring, clinical urgency classifier, or medical threshold database.** These are not hidden “coming soon” stubs. The old blood-report analyzer's _workflow_ is integrated; its unsafe matching and default-reference code is not reused. PDF support would require extraction/review UX and a validation corpus before it deserves trust.

Only hemoglobin, glucose, white blood cells, platelets, creatinine and HbA1c are accepted. Supported units are listed in-app. Results with `<`, `>`, qualitative values, one-sided limits and unsupported units must not be stripped or relabeled to fit. Use the original report with a clinician instead.

## Project map

```text
app/                    Next App Router, CSS, metadata, two read-only APIs
components/             Workspace orchestration, feature forms and UI primitives
lib/catalog.ts          Versioned exact aliases, dimensional factors, sources
lib/schema.ts           Zod boundary validation and schema version
lib/engine.ts           Pure deterministic longitudinal/lab functions
lib/csv.ts              Strict bounded CSV pipeline
lib/vault.ts            Authenticated encryption, IndexedDB, Web Locks
lib/demo.ts             Explicitly fictional, date-relative sample records
tests/                  Node test runner: domain/validation/crypto regressions
e2e/                    Playwright + axe: desktop/mobile workflows and a11y
docs/                   Product plan, audit, architecture, safety, deployment
```

Feature forms, data settings, source content, and shared UI primitives are separate modules; the workspace orchestrates navigation and journal lifecycle. Domain and security code remains independent and tested. This is a personal application, not a production-scale multi-team architecture.

## Quality commands

```sh
npm run check            # lint, strict TypeScript, unit tests, production build
npx playwright install chromium
npm run test:e2e         # starts production server; run build first
npm audit               # includes development dependencies
npm run sources:check   # URL availability only, not clinical content review
```

If using an installed browser: `CHROMIUM_PATH=/absolute/path/to/chromium npm run test:e2e`. Test harness runs 1440px desktop and 390px mobile Chromium. See [testing](docs/TESTING.md) for the observed results and limitations.

## Deploy to Vercel

1. Commit **the contents of this directory** to a new GitHub repository. Do not upload `node_modules`, `.next`, screenshots or the original archives.
2. Import it into Vercel. Framework: **Next.js**. Root directory: repository root (or this project folder if nested).
3. Node.js: **22.x** (24.x also supported). Install: `npm ci`. Build: `npm run build`. Output directory: **leave at framework default**.
4. No environment secrets or database integrations. Deploy and test on its HTTPS preview URL.
5. Run the acceptance checklist in [deployment](docs/DEPLOYMENT.md) before advertising it as a demo.

The same browser uses a different IndexedDB store on each origin: localhost, each Vercel preview hostname, production `vercel.app`, and a custom domain do **not** share records. Back up before changing domains.

## Recruiter demo (about 4 minutes)

1. Open fictional demo → explain what every number is based on.
2. Timeline → search fatigue → show distinct-day recurrence, not a diagnosis.
3. Add a lab result → use a report-bound interval → demonstrate an unsupported CSV unit being rejected.
4. Visit notes → explain which facts produced each question.
5. Read the pure engine and tests → show unit conversion, same-day ambiguity, zero denominators and tamper detection.
6. Create a disposable vault → save a test observation → reload/unlock → show ciphertext in IndexedDB and no PHI request in Network.

**Defensible engineering story:** explicit invariants, conservative failure modes, deterministic logic, provenance, encrypted local persistence, race protection, CI, accessibility and honest limitations. No claim of novel medical science or production compliance.

## Documentation

- [Product and phased rebuild plan](docs/PLAN.md)
- [Original project audit and migration decisions](docs/AUDIT.md)
- [Architecture and algorithms](docs/ARCHITECTURE.md)
- [Security model and privacy](docs/SECURITY.md)
- [Safety and intended use](docs/SAFETY.md)
- [Sources and update procedure](docs/SOURCES.md)
- [Aurora design and motion](docs/DESIGN.md)
- [Testing and QA](docs/TESTING.md)
- [Deployment and operations](docs/DEPLOYMENT.md)
- [Contributing](CONTRIBUTING.md) · [Credits](docs/CREDITS.md)

No real-user data or credentials are included. The original repository contained an apparent credential in a commented line; revoke/rotate it and review the original Git history. That credential and the original code archives are deliberately excluded from this handoff.
