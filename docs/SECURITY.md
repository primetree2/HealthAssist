# Security and privacy model

## Status

Educational portfolio prototype. Not independently audited, clinically validated, HIPAA-certified, GDPR-certified, or suitable as an electronic health record. Passing automated tests does not establish compliance or absence of vulnerabilities.

## Protected assets and adversaries

- Browser journal at rest: protect against someone copying IndexedDB ciphertext without the passphrase.
- Transit boundary: no journal data is intentionally sent to a server, third-party analytics service or model provider.
- Input boundary: treat CSV, notes and backups as untrusted; reject ambiguity and avoid HTML injection.
- Accidental loss: offer encrypted export and restore; clearly explain lack of recovery.

Encryption does **not** protect against malicious extensions, compromised dependencies/browser/OS, injected scripts while unlocked, weak passphrases, shoulder surfing, screenshots, screen readers controlled by attackers, physical access to an unlocked device, or files exported as plaintext visit notes. Offline guessing is possible against a copied envelope; use a strong unique passphrase. There is no recovery backdoor.

## Controls

- AES-256-GCM; random IV on every write; 128-bit random salt; PBKDF2-SHA-256 310k rounds; non-extractable key.
- Passphrases are uncontrolled password fields; never placed in React state, URLs, logs or local/session storage. Browser password managers may offer to save them according to user settings. Key derivation happens locally.
- No journal plaintext in IndexedDB/localStorage/sessionStorage/cookies. Rendered plaintext and unlocked keys necessarily live in memory.
- Exclusive Web Locks ownership prevents concurrent journal writers in the same origin. Older browsers without safe locking fail closed. Long-running tabs or mobile browsers suspended by OS remain platform risks.
- Save acknowledgments follow transaction commit; saves serialize. Failed writes leave UI records unchanged and report failure.
- Auto-lock when document becomes hidden and after 10 minutes of inactivity. Unsaved forms may be lost when backgrounding; do not leave a sensitive form half-complete. Browser lifecycle events are best-effort, not a hardware security boundary.
- Strict Zod schemas, bounded notes, finite numeric values, CSV byte/record/row caps, encrypted-backup size cap, no untrusted HTML or `dangerouslySetInnerHTML`.
- React escaping for user notes. Plaintext export is `.txt`, not a spreadsheet formula-capable record export. CSV template contains only synthetic static values.
- HTTPS on Vercel, HSTS, no sniffing, no framing, no referrer leakage, camera/microphone/geolocation denied. No external fonts or imagery.
- CSP constrains origins and blocks objects/frames. **Residual risk:** static Next hydration and React styling require `unsafe-inline` in this build. This is not a strict nonce CSP; an XSS vulnerability could still be severe. For a higher-assurance release, add per-request nonces and evaluate dynamic-rendering/cache trade-offs. Development also permits eval and websocket transport.
- No request-body or health-data logging. Host may log IP, user agent, paths and timing. No analytics/tracking scripts are configured. Do not enable session replay.

## Operational rules

1. Treat the apparent commented key in the original archive as compromised; revoke/rotate, review provider usage, and remove from repository history with care. Do not just hide it in a new `.env`.
2. Run `npm ci`, `npm audit`, lint, typecheck, unit/e2e checks on each release. Review lockfile changes. No scanner is a guarantee.
3. Do not add remote health-data storage, analytics or a model call without updating the threat model, consent UX, data retention policy and server authorization tests.
4. File issues with synthetic reproductions only. Never request a user's real blood report as a debugging attachment.
5. If encryption/data corruption is suspected, stop writing; preserve an encrypted backup, reproduce with synthetic data, and investigate before shipping a fix.
6. Deletion removes the app's active record only; it cannot guarantee secure erasure of browser backups, exported files, storage-device remnants or RAM.

## Reporting

No security contact was provided by the project owner. Before making a repository public, configure GitHub private vulnerability reporting or a monitored security address. Do not publish secrets or patient data in a public issue.
