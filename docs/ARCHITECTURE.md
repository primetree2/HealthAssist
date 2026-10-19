# Architecture and reasoning

## Trust boundaries

```text
Untrusted UI / CSV / encrypted backup
                  |
             Zod validation
                  |
       Pure deterministic engine
          /                 \
  React views          Visit text export
       |
 AES-256-GCM encryption <— PBKDF2 passphrase derivation
       |
 IndexedDB (ciphertext only)

Next.js server: static application + public GET health/catalog
No journal POSTs, remote accounts, file-upload service, LLM, or PHI database
```

“Local-first” does not mean an installable PWA or fully offline application. The shell must initially load from the host; there is no service-worker offline guarantee. Once loaded, journal operations are client-side. No health data is intentionally transmitted; the hosting provider still sees ordinary web connection metadata.

## Domain invariants

`Journal v1` = check-ins + lab entries. Strict objects reject unknown fields. Each list is capped at 5,000 records. Dates are real local-calendar dates, 1900 through local today. IDs are unique across both lists. Check-ins require 1–8 unique supported observations, personal intensity 1–10, bounded note text and explicit safety acknowledgment.

Lab entries require a known test, finite nonnegative value, explicitly supported unit, collection date, bounded source/report label, and either two ordered report bounds or neither. A reported inequality is not a numeric value. Imported backup data is untrusted even when encrypted: decrypt, parse, validate, then commit.

## Algorithms

1. **Range comparison:** evaluate the original value against original report bounds in the same unit. `< low` = below; `> high` = above; endpoints included. Missing bounds = unknown reference. No demographic fallback, disease mapping, clinical critical thresholds or “healthy” label.
2. **Unit scaling:** per-analyte lookup, not a global text similarity. g/L × 0.1 = g/dL; mg/L × 0.1 = mg/dL; K/uL and 10^9/L are numerically equivalent. Scale bounds and value together. No glucose mmol/L or creatinine µmol/L conversion is offered. HbA1c % and mmol/mol are not interchangeable here.
3. **Chronology:** only strictly earlier collection dates for the same analyte can be a prior result. Prior candidate is latest earlier date; any ambiguity on that date or the current date blocks comparison. A changed lab label blocks comparison. Matching labels do not prove matching methods, so the UI says so.
4. **Delta:** current canonical value minus prior canonical value. Percentage = delta / prior × 100; prior zero produces no percentage. Display rounds to two decimals, while calculation uses original JS numeric precision. Direction is not “improvement.”
5. **Latest entries:** preserve _all_ entries tied on the latest collection date for each analyte; never silently choose a winning same-day draw. Counts refer to latest-date entries, not a medical risk score.
6. **Recurrence:** retain entries whose date age is `0 <= age < 30` calendar days; count unique days and entry count separately for each observation label. Never infer causality or disease from recurrence.
7. **Question assembly:** template from a recurring observation with at least two recorded days, then latest out-of-range report values, then general visit questions. Maximum seven; no generated medical claims. Full record export is distinct from the 30-day recurrence window.

Most operations are linear in journal size; per-result comparisons sort filtered prior records. At the intentional 5,000-record cap this is appropriate for a personal prototype. Consider indexed read models for larger datasets rather than inflating limits blindly.

## Persistence lifecycle

1. Acquire exclusive Web Lock for this origin before unlock/create.
2. Re-read most recent envelope to avoid using a stale locked-screen snapshot.
3. Derive non-extractable key using random 16-byte salt, PBKDF2-SHA-256, 310,000 iterations.
4. Encrypt the entire validated journal using fresh random 12-byte IV and AES-256-GCM; authenticated additional data `health-assist:v1` binds format context.
5. Wait for IndexedDB transaction completion before updating rendered state/announcing success.
6. Serialize saves; an idle/background lock during save is deferred until persistence finishes. Reject stale asynchronous restores after lock.
7. Lock clears application journal/key references and releases exclusive tab ownership. JavaScript cannot guarantee forensic zeroization or clear OS/browser memory snapshots.

Backup is the same encrypted envelope, never a plaintext journal dump. Restore is replace-not-merge and is re-encrypted with the **current** vault key. Wrong passphrase/tamper/invalid schema leaves existing state unchanged. CSV imports similarly validate all rows before writing any.

## API contracts

- `GET /api/health`: status, version, browser-only data boundary, `llmRequired:false`; no-store.
- `GET /api/catalog`: registry version, exact aliases, units, source links; one-hour public cache. No personalized records or default reference intervals.

These are intentionally small. Adding empty health-data endpoints just to claim a “full backend” would make the project less secure, not more impressive.
