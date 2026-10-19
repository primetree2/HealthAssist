# Vercel deployment and operations

## Prerequisites

Git repository containing this project's root; Node.js 22+; standard modern browser. No Supabase, PostgreSQL, Redis, Gemini or OpenAI account is required. Do not add secrets just to deploy the demo.

## Local release check

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
npm audit
```

Use production `npm run start` after build to reproduce deployment behavior. `npm run dev` is for development only. Next.js framework telemetry can be disabled locally with `NEXT_TELEMETRY_DISABLED=1`; it is build tooling telemetry, not app health-data analytics.

## Vercel dashboard

- Import repository → Framework preset: **Next.js**.
- Root directory: folder with this `package.json`.
- Node: **22.x** or supported 24.x runtime.
- Install command: `npm ci`.
- Build command: `npm run build`.
- Output: framework default; do not set `dist` or `out`.
- Environment variables: none required. Do not expose private keys with `NEXT_PUBLIC_`.
- Deploy. Test using the HTTPS preview address before promoting.

No `vercel.json` is necessary: the framework discovers App Router and route handlers. Vercel CLI is optional (`vercel` then `vercel --prod`) and requires the owner to authenticate; no actual Vercel deployment was performed in this handoff.

## Acceptance on the deployed URL

- `/` loads and the fictional demo works without secrets.
- `/api/health` says browser-only; `/api/catalog` returns current registry.
- Create a **disposable synthetic** journal, add a check-in and lab, reload, unlock, export and restore encrypted backup, delete it.
- Confirm unsupported CSV input is rejected with no partial import.
- In Network, saving journal data creates no remote write/LLM requests.
- Open a second tab; unlock should be blocked while the first owns the vault. Lock first tab then retry.
- Background tab and return: vault should be locked. Confirm 10-minute idle lock behavior.
- Check desktop, 390px mobile, light/dark, keyboard focus and modal Escape.
- Verify HTTP security headers and confirm no sensitive information appears in query strings/logs.

## Data and domain changes

IndexedDB is scoped by origin. Vercel preview URLs, production `vercel.app`, custom domains and localhost are separate stores. An empty vault on a different domain is not evidence that records vanished from the original domain. Export encrypted backup **before** changing origins. Users need the backup's original passphrase. Restore to a new journal replaces its entries and re-encrypts under the current passphrase.

This app does not sync across devices. Host restarts cannot erase local IndexedDB, but clearing browser storage, private browsing, storage eviction, device loss and browser policies can. There is no account recovery service.

## Operations

- Review dependency alerts and source links at least monthly; pin release lockfile.
- CI runs lint/types/tests/build, Playwright/axe workflows and dependency audit. CI has no access to patient data.
- Keep session replay, analytics and request-body logging disabled.
- For problems, collect app version, browser family and a **synthetic** reproduction, never a real report or decrypted journal.
- Rollback a failed code deployment with Vercel's deployment history. Do not change the journal version without a tested migration/rollback policy.
- Current schema accepts only v1; future versions should introduce explicit migrations, not unchecked casts.
