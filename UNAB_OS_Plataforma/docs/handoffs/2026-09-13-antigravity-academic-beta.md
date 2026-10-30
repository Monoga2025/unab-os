# Antigravity Handoff — UNAB OS Academic Collaboration Beta

## Objective
Finish the approved academic collaboration beta and deploy it safely to Railway. The beta is a shared workspace for UNAB students, scoped by the exact professor-led class section they attend.

## Workspace and branch

- Repository: `C:\Users\Monoga\Desktop\Monoga OS\04_UNAB_INGENIERIA\UNAB OS\UNAB_OS_Plataforma`
- Implementation worktree: `C:\Users\Monoga\Desktop\Monoga OS\04_UNAB_INGENIERIA\UNAB OS\UNAB_OS_Plataforma\.worktrees\academic-collaboration-beta`
- Branch: `feat/academic-collaboration-beta`
- Current HEAD: `356c840 feat: add scoped academic collaboration actions`
- Do all work in this worktree; do not merge to `master` until the full implementation and launch checks pass.

## Authoritative documents

1. Design: `docs/superpowers/specs/2026-09-13-academic-collaboration-beta-design.md`
2. Implementation plan: `docs/superpowers/plans/2026-09-13-academic-collaboration-beta.md`
3. Execution ledger: `.superpowers/sdd/2026-09-13-academic-collaboration-beta/progress.md`
4. Per-task briefs/reports: `.superpowers/sdd/2026-09-13-academic-collaboration-beta/`

The design is the binding authority. The plan contains Tasks 1–10 with exact file, test, and commit guidance.

## Product decisions already approved

- Passwordless access is restricted server-side to verified `@unab.edu.co` addresses; no password, anonymous entry, or cédula-based login.
- Core data boundary: canonical subject → professor-led class section → membership → scoped content.
- Content in a section is collaborative: notes, events, reminders, tasks, and evaluations.
- Any section member can edit; every material change is attributable and recoverable through append-only history and soft delete/restore.
- Catalog creation is collaborative but canonicalized: trim, lowercase, remove diacritics/punctuation, database uniqueness, confirmation, and idempotent create-or-return.
- Same subject with distinct professors must be fully isolated.
- TEMA remains visible as beta/nonfunctional; do not import or leak TEMA data.
- UI must extend existing Inicio, Materias, Evaluaciones, semantic tokens, cards, local SVG icon language, responsive breakpoints, and no new visual identity.

## Completed work (reviewed)

### Task 1 — domain rules
Commit: `95b0c94 feat: add academic collaboration domain rules`

- Added `lib/domain/academic-collaboration.ts` and domain tests.
- 48-hour imminent horizon is the documented default.
- Focused tests and typecheck passed; review clean.

### Task 2 — schema/RLS/audit
Commits:
- `168918c feat: add academic collaboration schema`
- `cf185c9 fix: harden academic collaboration RLS`
- `15ad7e0 fix: close academic audit function`

- Additive schema, RLS, audit, normalization, indexes, and pgTAP tests exist.
- Static review passed after two fix rounds.
- **Unresolved verification:** Docker Linux engine was unavailable, so run `supabase db reset`, `npm run test:db`, and Supabase advisors before deployment. Do not claim database proof until these run.

### Task 3 — institutional authentication
Commits:
- `e1c001f feat: restrict collaboration access to UNAB email`
- `52b2d89 fix: enforce institutional auth through Next proxy`

- Upgraded and lockfile-pinned Next to 16.3.5.
- `proxy.ts` is the sole request boundary; `middleware.ts` was removed.
- `requireUser()` delegates to `requireInstitutionalUser()` so existing consumers receive server-side UNAB enforcement.
- Focused tests (23), typecheck, Next production build, and audit passed.
- Known low-priority warning: `lib/jarvis/bridge.ts:42` causes standalone output tracing bloat; not a Task 3 blocker.

### Task 4 — scoped reads/actions
Commit: `356c840 feat: add scoped academic collaboration actions`

- Added `lib/academic-collaboration/queries.ts`, `app/actions/academic-collaboration.ts`, and `tests/integration/academic-collaboration-contract.test.ts`.
- Focused tests/typecheck passed before review.
- Review found two REQUIRED issues. They are not yet fixed in committed source.

## Resume point: Task 4 fix round 1

Fix both issues, test, commit, then conduct a scoped re-review before marking Task 4 complete:

1. **Institutional guard on reads:** `lib/academic-collaboration/queries.ts` must derive identity through `requireInstitutionalUser()` at the query boundary. Do not accept caller-provided user IDs as authority. RLS `authenticated` is not a substitute for the UNAB domain rule.
2. **Trusted cache scope:** `updateAcademicItem` and soft-delete/restore mutations must derive the affected `section_id` from trusted RPC/query output. Do not use a client-submitted `sectionId` for `revalidatePath`.

### Partial uncommitted work

The interrupted agent left only this uncommitted file:

- `tests/integration/academic-collaboration-contract.test.ts`

It adds tests for the two Task 4 review findings. Inspect, preserve/adapt it only if it correctly supports the production fix; it currently has no corresponding source correction. Do not commit it alone.

## Remaining plan tasks

5. Materias onboarding and professor-specific membership UI.
6. Section workspace: items, history, soft delete/restore, stale-edit recovery.
7. Activate Evaluaciones weekly calendar/detail in existing navigation.
8. Add section-scoped priority and agenda to Inicio without TEMA coupling.
9. Accessibility, isolation, and legacy regression proof.
10. Feature flag, Railway readiness, deployment, staging smoke test, rollback instructions.

Use strict RED → GREEN → REFACTOR for each task. Review every task before proceeding. Keep commits conventional and never add AI attribution.

## Baseline and current verification

- `npm run typecheck` baseline: passed.
- Baseline/full-suite known failure: three pre-existing failures in `tests/integration/theme-token-contract.test.ts`, caused by CRLF-sensitive source slicing of the active theme marker. Do not silently treat these as beta regressions or as passing.
- Latest Task 3 full suite: 209 passed plus those 3 unrelated theme failures.
- Latest Task 4 full suite: 213 passed plus those 3 unrelated theme failures.

## Supabase and Railway safety gates

Before applying anything to remote Supabase or Railway:

1. Start/repair Docker’s Linux engine, then run local migration reset, pgTAP database tests, and advisors.
2. Verify all RLS policies against direct authenticated access, not only server-action tests.
3. Configure Railway environment variables without committing secrets; use production `NEXT_PUBLIC_SUPABASE_URL`, publishable key, and required server secrets only in Railway variables.
4. Apply reviewed migrations through the established Supabase workflow; do not use service-role secrets in client code.
5. Build and smoke-test passwordless UNAB sign-in, first enrollment, isolated sections, mutation history, and unauthorized access rejection in the Railway deployment.
6. Keep rollout behind a feature flag; document rollback before sharing the public link.

## Git identity

Repository-local identity is configured and user-approved:
`Monoga2025 <noreply@example.com>`.

## Rulings already made

- Use a 48-hour imminent window because the design needed a concrete student-focused default; cost if wrong: only prioritization behavior needs adjustment.
- Upgrade the implementation branch to Next 16 and use `proxy.ts` exclusively; cost if wrong: framework compatibility changes need remediation, but retaining Next 15 would leave the proxy inactive.
- Treat Docker-unavailable DB verification and CRLF-sensitive theme tests as explicitly unresolved/pre-existing evidence, never as PASS.