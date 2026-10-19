# Contributing

Use synthetic data only. Never commit health records, API credentials, `.env`, browser-profile data or decrypted backups. If you discover a credential in the legacy repository, report privately and rotate it.

1. Describe the user problem and intended safety/privacy effect before adding features.
2. Keep pure domain functions separate from UI and storage side effects.
3. Add regression tests for input errors and ambiguous cases, not just happy paths.
4. Run `npm run check`, `npm run test:e2e`, `npm audit` and inspect changed screens at desktop/390px mobile, light/dark.
5. For clinical-content changes, update source review/version, limitations and tests. Obtain qualified review before increasing claims.
6. No silent unit guessing, default demographic interval selection, diagnosis generation or clinical “all clear.”

Formatting and lint policy: TypeScript strict + ESLint recommended/TypeScript/react-hooks rules. UI forms, settings, sources and shared primitives are separate feature modules. Keep further refactors behavior-preserving and covered by accessibility tests.

Pull requests should include intent, scope, screenshots for visual changes, verification commands, risks and rollback notes. Do not claim medical accuracy based on unit-test counts.
