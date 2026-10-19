# Verification and QA

## Observed handoff checks

Local verification on 2026-10-19, Linux / Node 24. Browser tests ran against an optimized production build, not just development mode.

| Check                                 | Observed result                                                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| ESLint (JS/TypeScript/hooks rules)    | Pass                                                                                                           |
| Strict TypeScript                     | Pass                                                                                                           |
| Node unit/regression tests            | 26 passed                                                                                                      |
| Next.js production build              | Pass                                                                                                           |
| Playwright desktop/mobile suite       | 18 passed                                                                                                      |
| Automated axe WCAG A/AA scans         | No violations on scanned welcome, overview, lab, check-in and source screens in light/dark at 1440px and 390px |
| npm audit, including dev dependencies | 0 reported vulnerabilities at handoff                                                                          |
| Visual inspection                     | Desktop/mobile core screens, emergency state, modal, menu, light/dark layouts inspected                        |

Counts are observed runs, not medical-accuracy, performance, test-coverage percentage or security-certification claims. Scanner databases and dependency versions change. See the included `verification/` logs for the final run. Vercel has **not** been deployed or tested from an owner account.

## Unit regression coverage

- Exact alias mapping; unsupported names/units rejected.
- Inclusive interval endpoints; no default range; missing interval is not “normal.”
- Values and bounds scale together; dimensional conversion invariant across many values.
- Chronological deltas; percentage withheld at zero denominator.
- Same-day ambiguity and different-lab guard; latest-date ties preserved.
- Distinct-day recurrence window edges, future exclusion, same-day multiple entries.
- Questions grounded in history and report entries, no diagnosis inference.
- Real-date, finite-number, version, cardinality and duplicate-ID schema validation.
- CSV strict header, quoted fields, nonnumeric/comparator/injection input, row/byte limits, duplicate detection and atomic failure.
- Encryption round trip, non-extractable key, random IV, wrong passphrase, tamper authentication, malformed envelope, long valid journal encryption.

## Aurora revision (2.0.1)

The updated 18-test browser suite also checks decorative semantics, pause/resume, live system reduced-motion handling, and the absence of ambient aurora layers from lab forms. Welcome/overview layouts and mobile navigation were visually rechecked in light/dark themes. No new runtime dependency was added.

## Browser workflows

Both desktop (1440 × 1100) and mobile (390 × 844), Chromium:

- Demo navigation, history filtering and grounded visit questions.
- Check-in with a visible emergency warning before save; notes rendered as text, not markup.
- Manual lab entry, CSV invalid-unit rejection, review/confirm import, deletion confirmation.
- Encrypted persistence inspected for absence of a plaintext sentinel, lock, incorrect-passphrase failure, reload/unlock, full local deletion.
- Encrypted backup download, removal of source entry, wrong-passphrase rejection, confirmed restore, restored record verification.
- Native dialog keyboard dismissal/focus return, public API shape/security header, no remote write requests in observed demo flow.
- Automated accessibility and no-page-horizontal-overflow checks on core screens in both color schemes.

## Visual QA

Core screen layouts were rendered and inspected separately at desktop/mobile dimensions; no stock/generated imagery was needed for this data-focused product. Source table intentionally scrolls horizontally **inside a named keyboard-focusable region**, never at page level. Visit preview intentionally scrolls internally. Mobile navigation scrolls within the panel at shorter heights. Reduced-motion is respected; screenshots should wait for animations or use reduced-motion to avoid capturing a transition midpoint.

## Limits and still-required manual review

- Not a full screen-reader audit, certified WCAG conformance report, penetration test or clinical validation.
- Tests use synthetic entries and a small explicitly supported catalog, not a corpus of real blood reports.
- No PDF/OCR accuracy evaluation is claimed because automatic PDF interpretation is not shipped.
- Chrome-family desktop/mobile emulation is not testing on actual iOS Safari, Firefox, low-end phones or assistive technology.
- Full browser-storage eviction/quota fault injection, 10-minute idle timing, OS suspension, and multi-tab lifecycle permutations need additional manual testing. The Web Locks and transaction code is conservative, but not exhaustively formally verified.
- No CI run on a remote GitHub repository or deployed Vercel preview was executed during this handoff.
- No numeric coverage percentage or benchmark is claimed. Passing tests does not mean bug-free or vulnerability-free.

## Reproduce

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
npm audit
```

Use `CHROMIUM_PATH` only if an installed browser executable is intentionally selected. Ordinary CI installs the Playwright-pinned Chromium build. Run quality checks after any dependency, medical wording, source, unit mapping, storage or UI change.
