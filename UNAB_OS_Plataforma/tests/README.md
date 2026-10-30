# tests

Test suites for the platform.

- `domain/`: Vitest tests for domain logic (academic collaboration, evidence, context, Codex sandbox).
- `integration/`: contract tests for Jarvis, Telegram pairing, attempts, Codex and study-map behavior.
- `e2e/`: Playwright learner loop (`learner-loop.spec.ts`).
- `python/`: unittest tests for the TEMA sync workers (state, file identity, snapshot policy, scheduling, text extraction).
- Run with `npm test` (Vitest) and `npm run test:python`.
