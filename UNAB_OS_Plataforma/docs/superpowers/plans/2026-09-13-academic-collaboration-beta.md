# Academic Collaboration Beta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Railway-deployable UNAB-only shared academic workspace: students join professor-specific sections and collaboratively manage notes, reminders, tasks, events, and evaluations without seeing unrelated sections.

**Architecture:** Add an isolated Supabase collaboration domain (`profiles → catalog → class sections → memberships → academic items → immutable revisions`) beside, never inside, the private `tema_*` domain. Server Actions and App Router server reads use the existing SSR auth boundary; Postgres constraints/RLS enforce duplicate prevention, membership isolation, append-only history, soft deletion, and optimistic concurrency. The UI extends the existing `ApplicationShell`, design tokens, dashboard, and Materias surface.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Supabase Auth/Postgres/RLS, `@supabase/ssr`, Vitest 3, Supabase CLI DB tests, Docker standalone build, Railway.

**Spec:** `docs/superpowers/specs/2026-09-13-academic-collaboration-beta-design.md`

## Global Constraints

- Do not migrate, expose, or couple `tema_*`, study sessions, Tutor IA, Jarvis, Telegram, attempts, progress, or course-study data to shared collaboration.
- Use semantic/component tokens in `app/design-tokens.css`; no raw colors, alternative typography, emoji icons, or new visual identity.
- Passwordless access is only for verified `@unab.edu.co` mail. No passwords, cédula, public anonymous production sign-in, or browser-authoritative authorization.
- Catalog normalizes Unicode, whitespace, case, diacritics, and punctuation; database active-record uniqueness and idempotent create-or-return resolve races.
- Every collaboration read/write is bounded by active `section_memberships`. Same subject with a different professor or term is isolated.
- Mutations derive actor/server section data, append attributable immutable revisions atomically, and soft-delete/restore instead of hard-delete.
- Enable RLS on all new public tables; every policy uses `TO authenticated` plus membership/ownership predicate; index FKs/RLS paths; no client JWT metadata or exposed service key.
- All displayed dates use `America/Bogota`; meet WCAG 2.2 AA, 44px controls, focus visibility, keyboard calendar/list alternative, adjacent errors, retained failed input, and reduced-motion support.
- TEMA is visibly `Beta — no conectado`; it cannot imply import, sync, or verification of shared content.
- Strict TDD per task: red test, failing run, smallest green implementation, refactor, focused green run, conventional commit with no AI attribution.
- Before deploy: `npm run test`, `npm run typecheck`, `npm run build`; never commit/copy `.env`, secrets, database dumps, or test credentials.

---

## File Map

| File | Purpose |
| --- | --- |
| `supabase/migrations/<generated>_academic_collaboration_beta.sql` | Additive schema, constraints, indexes, RLS, grants, audit, RPCs. Generate via `supabase migration new academic_collaboration_beta`; never invent timestamp. |
| `supabase/tests/academic_collaboration_beta.sql` | DB/RLS tests using separate authenticated fixtures. |
| `lib/domain/academic-collaboration.ts` | Pure types, email/catalog normalization, validation, priority/agenda rules. |
| `lib/academic-collaboration/queries.ts` | Server-only scoped read models. |
| `app/actions/academic-collaboration.ts` | Server-side form mutations and typed results. |
| `app/(app)/materias/**` | Membership onboarding route/states. |
| `app/(app)/section/[sectionId]/**` | Section workspace route/states. |
| `app/(app)/evaluaciones/**` | Calendar and detail routes/states. |
| `components/academic-*.tsx` | Onboarding, workspace/form/history, calendar, dashboard presentation. |
| `app/(app)/dashboard/page.tsx`, `app/(app)/tema/page.tsx`, `components/application-shell.tsx`, `app/styles.css` | Existing UI integration without TEMA coupling. |
| `app/login/auth-form.tsx`, `app/login/page.tsx`, `app/auth/callback/route.ts`, `lib/supabase/auth.ts`, `proxy.ts` | Institutional auth/server gate/new protected paths. |
| Existing domain/integration/E2E contract tests, `.env.example`, `README.md`, `docs/railway-deployment.md` | Regression, rollout, and Railway safety. |

## Shared Interfaces

```ts
export const ACADEMIC_ITEM_TYPES = ["note", "event", "reminder", "task", "evaluation"] as const;
export const ACADEMIC_IMPORTANCE = ["low", "normal", "high", "critical"] as const;
export type AcademicItemType = (typeof ACADEMIC_ITEM_TYPES)[number];
export type AcademicImportance = (typeof ACADEMIC_IMPORTANCE)[number];
export type AcademicItemInput = Readonly<{ sectionId: string; itemType: AcademicItemType; title: string; body: string; importance: AcademicImportance; startsAt: string | null; dueAt: string | null; expectedVersion: number | null }>;
export type AcademicActionState = Readonly<{ ok: boolean; message: string; fieldErrors?: Readonly<Record<string, string>>; conflict?: Readonly<{ currentVersion: number; currentBody: string; attemptedBody: string }> }>;
export type AcademicAgendaEntry = Readonly<{ id: string; sectionId: string; subjectName: string; professorName: string; itemType: AcademicItemType; title: string; importance: AcademicImportance; occursAt: string; href: string }>;
```

Database RPCs derive `auth.uid()` and have fixed signatures:

```sql
academic_find_or_create_catalog_entry(p_kind text, p_display_name text) returns uuid;
academic_find_or_create_section(p_subject_id uuid, p_professor_id uuid, p_term_key text) returns uuid;
academic_join_section(p_section_id uuid) returns void;
academic_mutate_item(p_item_id uuid, p_expected_version integer, p_payload jsonb) returns public.academic_items;
academic_soft_delete_item(p_item_id uuid, p_expected_version integer) returns public.academic_items;
academic_restore_item(p_item_id uuid, p_expected_version integer) returns public.academic_items;
```

### Task 1: Establish domain rules and strict unit contracts

**Files:**
- Create: `lib/domain/academic-collaboration.ts`
- Create: `tests/domain/academic-collaboration.test.ts`
- Modify: `package.json`

**Interfaces:** Produces `normalizeInstitutionalEmail`, `normalizeCatalogKey`, `validateAcademicItem`, `compareAcademicAgendaEntries`, and the shared types. Consumes no database or environment state.

- [ ] **Step 1: Write the failing tests**

```ts
expect(normalizeInstitutionalEmail(" ANA@UNAB.EDU.CO ")).toBe("user9@example.edu");
expect(normalizeInstitutionalEmail("user10@example.edu")).toBeNull();
expect(normalizeCatalogKey(" CÁLCULO. I ")).toBe("calculo i");
expect(normalizeCatalogKey("calculo-i")).toBe("calculo i");
expect(validateAcademicItem({ itemType: "evaluation", dueAt: null } as AcademicItemInput).dueAt).toContain("fecha");
expect(validateAcademicItem({ itemType: "note", dueAt: null, startsAt: null } as AcademicItemInput)).toEqual({});
```

Also prove order is overdue/imminent evaluation, task, event/reminder, then importance (`critical`, `high`, `normal`, `low`), timestamp, title.

- [ ] **Step 2: Run the red test**

Run: `npm run test -- tests/domain/academic-collaboration.test.ts`

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement the minimum pure module**

```ts
export function normalizeCatalogKey(value: string) {
  return value.normalize("NFKD").replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es").replace(/[\p{P}\p{S}_]+/gu, " ")
    .trim().replace(/\s+/g, " ");
}
export function normalizeInstitutionalEmail(value: string) {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@unab\.edu\.co$/.test(email) ? email : null;
}
```

Add per-type time requirements: evaluation/task/reminder require due time; event requires start; note requires neither. Add `"test:db": "supabase test db"` to `package.json` for Task 2.

- [ ] **Step 4: Verify green**

Run: `npm run test -- tests/domain/academic-collaboration.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Refactor and reverify**

Move time rules and importance weights into readonly constants, preserve exports, then run `npm run test -- tests/domain/academic-collaboration.test.ts` expecting PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json lib/domain/academic-collaboration.ts tests/domain/academic-collaboration.test.ts
git commit -m "feat: add academic collaboration domain rules"
```

### Task 2: Add isolated schema, audit trail, RLS, and direct DB proof

**Files:**
- Create: migration generated by `supabase migration new academic_collaboration_beta`
- Create: `supabase/tests/academic_collaboration_beta.sql`
- Modify: `package.json`

**Interfaces:** Consumes Task 1 normalization semantics; produces schema/RPCs in Shared Interfaces and `npm run test:db` coverage.

- [ ] **Step 1: Write the failing SQL tests first**

Create 16 pgTAP assertions using fixture auth UUIDs and `set_config('request.jwt.claim.sub', ...)` / `set_config('role', 'authenticated', ...)`: normalized subject/professor and `(subject, professor, term)` uniqueness; self-only membership; member allow/nonmember deny direct select/insert/update/delete; append-only revisions; creator/section immutable; soft-delete invisibility; restore visibility; stale-version error; RLS index existence. Include:

```sql
select plan(16);
select throws_ok($$ insert into public.subjects(display_name, normalized_key) values ('calculo-i','calculo i') $$, '23505', null, 'duplicate rejected');
select throws_ok($$ update public.academic_item_revisions set action='update' $$, '42501', null, 'revisions append-only');
select finish();
```

- [ ] **Step 2: Execute red database suite**

Run: `supabase start && npm run test:db`

Expected: FAIL because collaboration tables/RPCs are absent. If CLI is missing, inspect `supabase --help`, install team-approved CLI outside repository, then rerun; never replace RLS proof with mocks.

- [ ] **Step 3: Generate and implement additive migration**

Create `profiles`, `subjects`, `professors`, `class_sections`, `section_memberships`, `academic_items`, `academic_item_revisions`. Use UUID PKs, `auth.users` FKs, `retired_at` partial unique active catalog/section constraints, active membership partial uniqueness, `item_type`, `importance`, `version integer default 1`, immutable creator/timestamps, `updated_by`, soft delete fields, JSON before/after snapshots, changed-field summary, and check constraints on lengths/type/time requirements.

Implement trusted `normalize_academic_catalog_key(text)`, idempotent catalog/section create-or-return routines, `auth.uid()` verification, membership checks, atomic `where version = expectedVersion` updates, distinct stale conflict SQLSTATE, and revision creation in the same transaction. Add indexes for every FK/RLS membership path. Enable RLS; policies use `TO authenticated` plus predicates; grants never allow revision update/delete. Use `security invoker`; no service role/metadata authorization.

- [ ] **Step 4: Verify migration and advisor result**

Run: `supabase db reset && npm run test:db && supabase db advisors`

Expected: PASS and no collaboration missing-index/RLS/exposed-function warning.

- [ ] **Step 5: Refactor and reverify**

Replace duplicated membership predicates only with a safe `security invoker` helper while policies remain `TO authenticated`; run `supabase db reset && npm run test:db` expecting PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json supabase/migrations supabase/tests
git commit -m "feat: add academic collaboration schema"
```

### Task 3: Restrict passwordless authentication to UNAB and route onboarding

**Files:**
- Modify: `app/login/auth-form.tsx`, `app/login/page.tsx`, `app/auth/callback/route.ts`, `lib/supabase/auth.ts`, `proxy.ts`
- Modify: `tests/integration/passwordless-login-contract.test.ts`, `tests/integration/session-onboarding-controls.test.ts`

**Interfaces:** Consumes Task 1 normalizer and existing Supabase SSR modules. Produces `requireInstitutionalUser(): Promise<{ supabase; userId; email }>` and protected matcher entries.

- [ ] **Step 1: Write failing auth contracts**

```ts
expect(authForm).toContain('normalizeInstitutionalEmail(email)');
expect(authForm).toContain('"Usá tu correo institucional @unab.edu.co."');
expect(callback).toContain('normalizeInstitutionalEmail(user.email ?? "")');
expect(callback).toContain('supabase.auth.signOut({ scope: "local" })');
expect(proxyConfig.matcher).toContain('/materias/:path*');
expect(proxyConfig.matcher).toContain('/section/:path*');
expect(proxyConfig.matcher).toContain('/evaluaciones/:path*');
```

Also require magic-link callback target `/materias`, retain recovery `/reset-password`, and forbid password/public anonymous production path.

- [ ] **Step 2: Run red contracts**

Run: `npm run test -- tests/integration/passwordless-login-contract.test.ts tests/integration/session-onboarding-controls.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement server/client enforcement**

Normalize before `signInWithOtp`; invalid UI keeps typed input and shows generic domain guidance. After callback exchange/OTP verification, fetch server-side user email, validate, local signout and redirect `/login?error=institutional-email-required` on failure. `requireInstitutionalUser` repeats check server-side and is mandatory in collaboration reads/actions. Centralize generic error copy in login page; do not enumerate account existence. Add `/materias`, `/section`, `/evaluaciones` to `proxy.ts` matcher.

- [ ] **Step 4: Verify/refactor/commit**

Run: `npm run test -- tests/integration/passwordless-login-contract.test.ts tests/integration/session-onboarding-controls.test.ts && npm run typecheck` expected PASS. Refactor error mapping then rerun same command. Commit:

```bash
git add app/login app/auth/callback/route.ts lib/supabase/auth.ts proxy.ts tests/integration/passwordless-login-contract.test.ts tests/integration/session-onboarding-controls.test.ts
git commit -m "feat: restrict collaboration access to UNAB email"
```

### Task 4: Build scoped reads and mutation Actions

**Files:**
- Create: `lib/academic-collaboration/queries.ts`, `app/actions/academic-collaboration.ts`, `tests/integration/academic-collaboration-contract.test.ts`

**Interfaces:** Consumes Tasks 1–3; produces `getAcademicOnboarding`, `getSectionWorkspace`, `getEvaluationWeek`, `getEvaluationDetail`, `getAcademicDashboard` and Actions `findOrCreateCatalogEntry`, `findOrCreateSection`, `joinSection`, `createAcademicItem`, `updateAcademicItem`, `softDeleteAcademicItem`, `restoreAcademicItem` returning `AcademicActionState`.

- [ ] **Step 1: Write failing server-boundary contracts**

```ts
expect(actions).toContain('"use server"');
expect(actions).toContain('requireInstitutionalUser()');
expect(actions).toContain('validateAcademicItem');
expect(actions).not.toMatch(/formData\.get\("(?:userId|actorId|createdBy|updatedBy)"\)/);
expect(queries).toContain('.eq("user_id", userId)');
expect(queries).toContain('.eq("deleted_at", null)');
expect(queries).toContain('getAcademicDashboard');
```

Test stale result maps to a `conflict` preserving attempted body and unauthorized section returns unavailable with no section title.

- [ ] **Step 2: Run red test**

Run: `npm run test -- tests/integration/academic-collaboration-contract.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement minimal secure server modules**

Queries use authenticated server client and explicit allowed fields only; check membership before detail and return `null` for denial. Actions validate UUID/form values, call Task 2 RPCs, map unique/race to canonical record, stale error to conflict, authorization errors to generic unavailable, and `revalidatePath` only after confirmed success for `/materias`, `/section/${sectionId}`, `/evaluaciones`, detail, dashboard. Do not log body/email/attempted text.

- [ ] **Step 4: Verify/refactor/commit**

Run: `npm run test -- tests/integration/academic-collaboration-contract.test.ts && npm run typecheck` expected PASS. Deduplicate safe form parsing/error mapping; rerun focused test. Commit:

```bash
git add lib/academic-collaboration app/actions/academic-collaboration.ts tests/integration/academic-collaboration-contract.test.ts
git commit -m "feat: add scoped academic collaboration actions"
```

### Task 5: Deliver Materias onboarding and professor-specific membership

**Files:**
- Create: `app/(app)/materias/page.tsx`, `app/(app)/materias/loading.tsx`, `app/(app)/materias/error.tsx`, `components/academic-onboarding.tsx`
- Modify: `app/(app)/tema/page.tsx`, `app/styles.css`, `tests/integration/academic-collaboration-contract.test.ts`, `tests/integration/theme-token-contract.test.ts`

**Interfaces:** Consumes Task 4 onboarding read/create/join Actions. Produces `/materias` with mandatory matching search, confirmation-only canonical creation, selection/join, and separate TEMA-beta link.

- [ ] **Step 1: Write failing route/UI tests**

```ts
expect(materiasPage).toContain('requireInstitutionalUser()');
expect(onboarding).toContain('Buscar materia');
expect(onboarding).toContain('normalizeCatalogKey');
expect(onboarding).toContain('Confirmar nueva materia');
expect(onboarding).toContain('Crear grupo con profesor');
expect(onboarding).toContain('formAction={joinSection}');
expect(temaPage).toContain('Beta — no conectado');
expect(styles).toContain('.academic-onboarding');
expect(styles).not.toMatch(/\.academic-[^{]+\{[^}]*#[0-9a-f]/i);
```

- [ ] **Step 2: Run red tests**

Run: `npm run test -- tests/integration/academic-collaboration-contract.test.ts tests/integration/theme-token-contract.test.ts`

Expected: FAIL because the route/component/styles are absent.

- [ ] **Step 3: Implement onboarding**

Server render memberships, active catalog candidates, and configured `ACADEMIC_CURRENT_TERM_KEY`; pass them to `AcademicOnboarding`. Client filtering uses `normalizeCatalogKey`: exact/normalized match exposes select/join only, while zero match exposes a review screen with original/normalized value and confirmed catalog Action. Repeat guard for professor and active `(subject, professor, term)` section. Canonical server response shows subject/professor/member count and explicit join. Cards link `/section/${sectionId}`. Add loading/error states. In `/tema`, add only compact `Beta — no conectado` link to `/materias`; do not change `loadTemaData` or render shared data in `TemaPanel`.

- [ ] **Step 4: Add token-only responsive styles**

Add `.academic-onboarding`, `.academic-catalog-results`, `.academic-section-card`, `.academic-empty-state` using `var(--color-*)`, `var(--field-*)`, `var(--shadow-card)`. At existing 900px/720px breakpoints stack cards and preserve 44px controls.

- [ ] **Step 5: Verify, refactor, commit**

Run: `npm run test -- tests/integration/academic-collaboration-contract.test.ts tests/integration/theme-token-contract.test.ts && npm run typecheck` expected PASS. Verify labels, error summaries, `aria-describedby`, focus, and failed-value retention; rerun focused tests. Commit:

```bash
git add app/(app)/materias app/(app)/tema/page.tsx components/academic-onboarding.tsx app/styles.css tests/integration/academic-collaboration-contract.test.ts tests/integration/theme-token-contract.test.ts
git commit -m "feat: add academic section onboarding"
```

### Task 6: Deliver section workspace, audit history, deletion, restore, and stale-edit recovery

**Files:**
- Create: `app/(app)/section/[sectionId]/page.tsx`, `loading.tsx`, `error.tsx`
- Create: `components/academic-section-workspace.tsx`, `components/academic-item-form.tsx`, `components/academic-item-history.tsx`
- Modify: `app/styles.css`, `tests/integration/academic-collaboration-contract.test.ts`

**Interfaces:** Consumes Task 4 workspace/Actions and Task 1 types. Produces authenticated section workspace with Notes, Calendar, Tasks, Evaluations views and mutation/history behavior.

- [ ] **Step 1: Write failing workspace tests**

```ts
expect(sectionPage).toContain('getSectionWorkspace(sectionId, userId)');
expect(sectionPage).toContain('notFound()');
expect(workspace).toContain('["note", "event", "reminder", "task", "evaluation"]');
expect(form).toContain('expectedVersion');
expect(form).toContain('itemType === "evaluation"');
expect(form).toContain('itemType === "note"');
expect(history).toContain('createdBy');
expect(history).toContain('updatedBy');
expect(history).toContain('Restaurar');
expect(workspace).toContain('Tu borrador no se guardó porque otra persona actualizó este contenido.');
```

- [ ] **Step 2: Run red test**

Run: `npm run test -- tests/integration/academic-collaboration-contract.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement workspace with no data leak**

Use `requireInstitutionalUser` and scoped query; `notFound()` on null. Render subject/professor and all five types through four views (Calendar includes event/reminder). Form fields are title, body, importance, and relevant date; only evaluation shows labelled instructions/exercise guidance (e.g. three exercises; choose one) stored in body/structured JSON—not new exam columns. Submit expected version. Stale response shows current attributed body plus preserved draft and Reload/Copy draft actions; never merge automatically. Show creator/latest editor/history; history has no editing. Soft-delete and restore require authorized current membership and each event appears in history.

- [ ] **Step 4: Implement accessible responsive styles**

Use semantic token styles for tabs/lists/history/conflict. Dialog/history manages focus and restores trigger focus; status is polite live region; controls are 44px; reduced-motion disables transitions.

- [ ] **Step 5: Verify, refactor, commit**

Run: `npm run test -- tests/integration/academic-collaboration-contract.test.ts && npm run typecheck` expected PASS. Centralize item label/filter mapping in one readonly constant then rerun test. Commit:

```bash
git add app/(app)/section components/academic-section-workspace.tsx components/academic-item-form.tsx components/academic-item-history.tsx app/styles.css tests/integration/academic-collaboration-contract.test.ts
git commit -m "feat: add collaborative academic workspace"
```

### Task 7: Activate Evaluaciones calendar/detail in existing navigation

**Files:**
- Create: `app/(app)/evaluaciones/page.tsx`, `loading.tsx`, `error.tsx`, `app/(app)/evaluaciones/[itemId]/page.tsx`, `components/academic-evaluation-calendar.tsx`
- Modify: `components/application-shell.tsx`, `app/styles.css`, `tests/integration/academic-collaboration-contract.test.ts`, `tests/integration/session-onboarding-controls.test.ts`

**Interfaces:** Consumes Task 4 evaluation queries and `AcademicAgendaEntry`. Produces `/evaluaciones`, `/evaluaciones/[itemId]`, and active navigation link.

- [ ] **Step 1: Write failing calendar/navigation tests**

```ts
expect(shell).toContain('{ href: "/evaluaciones", label: "Evaluaciones", icon: "calendar" as const }');
expect(shell).not.toContain('{ label: "Evaluaciones", icon: "calendar" as const }');
expect(calendar).toContain('aria-label="Semana anterior"');
expect(calendar).toContain('aria-label="Semana siguiente"');
expect(calendar).toContain('Vista de agenda');
expect(detailPage).toContain('getEvaluationDetail(itemId, userId)');
expect(detailPage).toContain('Instrucciones');
expect(detailPage).toContain('Ejercicios');
```

- [ ] **Step 2: Run red test**

Run: `npm run test -- tests/integration/academic-collaboration-contract.test.ts tests/integration/session-onboarding-controls.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement calendar/list/detail**

Move Evaluaciones from disabled navigation to `navigation`; nested paths remain active. Use server-derived Bogotá ISO week query. Navigation uses labelled buttons/URLs, never drag-only grid; each entry links detail. Always render chronological agenda fallback. Detail proves membership, shows importance text+semantic status/icon, time, subject/professor, creator/latest editor, instructions/exercise brief/history. Unauthorized or deleted detail is unavailable, except an authorized member gets recoverable deleted state.

- [ ] **Step 4: Style and verify**

Grid only at fitting widths; `max-width:720px` uses agenda primary. Importance uses existing semantic tokens plus text. Run focused tests/typecheck expected PASS; factor single Bogotá formatter in `lib/academic-collaboration/dates.ts`, rerun. Commit:

```bash
git add app/(app)/evaluaciones components/academic-evaluation-calendar.tsx components/application-shell.tsx app/styles.css lib/academic-collaboration tests/integration/academic-collaboration-contract.test.ts tests/integration/session-onboarding-controls.test.ts
git commit -m "feat: add shared evaluations calendar"
```

### Task 8: Merge shared priorities and agenda into Inicio without TEMA coupling

**Files:**
- Create: `components/academic-dashboard.tsx`
- Modify: `app/(app)/dashboard/page.tsx`, `lib/academic-collaboration/queries.ts`, `tests/domain/academic-collaboration.test.ts`, `tests/integration/academic-collaboration-contract.test.ts`

**Interfaces:** Consumes `getAcademicDashboard`, Task 1 comparator, and existing `prioritizedDeadlines`/session/Jarvis calls. Produces fixed precedence: shared evaluation → shared task → personal active/planned session → separately functional TEMA deadline → existing empty state.

- [ ] **Step 1: Write failing priority tests**

```ts
expect(compareAcademicAgendaEntries(sharedEvaluation, temaDeadline, now)).toBeLessThan(0);
expect(dashboard).toContain('getAcademicDashboard(userId, now)');
expect(dashboard).toContain('sharedDashboard.priority');
expect(dashboard).toContain('Add your subjects.');
expect(dashboard).not.toContain('from("tema_courses").select("*, academic_items")');
```

Add no-membership CTA and different-professor fixture excluded from dashboard agenda.

- [ ] **Step 2: Run red test**

Run: `npm run test -- tests/domain/academic-collaboration.test.ts tests/integration/academic-collaboration-contract.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement additive composition**

Fetch scoped dashboard read in existing `Promise.all`, preserve all current legacy queries. Pick shared only under required precedence and link section item detail with subject/professor label. Merge only member section entries into Agenda corta in deterministic order. With no memberships/no higher valid personal priority, exact CTA is `Add your subjects.` linking `/materias`. TEMA status card remains untouched.

- [ ] **Step 4: Verify/refactor/commit**

Run: `npm run test -- tests/domain/academic-collaboration.test.ts tests/integration/academic-collaboration-contract.test.ts && npm run typecheck` expected PASS. Extract pure `selectDashboardPriority` and cover all branches; rerun. Commit:

```bash
git add app/(app)/dashboard/page.tsx components/academic-dashboard.tsx lib/academic-collaboration tests/domain/academic-collaboration.test.ts tests/integration/academic-collaboration-contract.test.ts
git commit -m "feat: show academic priorities on dashboard"
```

### Task 9: Prove accessibility, isolation, and legacy regression behavior

**Files:**
- Modify: `tests/integration/academic-collaboration-contract.test.ts`, `tests/integration/theme-token-contract.test.ts`, `tests/integration/production-ui-consistency.test.ts`, `tests/integration/railway-deployment-contract.test.ts`, `tests/e2e/learner-loop.spec.ts`, `README.md`

**Interfaces:** Consumes Tasks 1–8. Produces regression coverage for direct RLS, UI semantics, independent sections, existing product behavior, and reproducible local validation.

- [ ] **Step 1: Write failing accessibility/isolation tests**

Require academic CSS blocks have no raw `#`, contain `:focus-visible` and `prefers-reduced-motion`; calendar has semantic buttons/list fallback; history includes actor/timestamp/action; academic route source does not import `lib/tema/data`. Extend E2E: first user joins Calculus/Professor A and creates critical evaluation; second A-member edits and revision attribution is visible; user in Calculus/Professor B cannot see item in dashboard/evaluations. Use non-production fixtures; never credentials in source.

- [ ] **Step 2: Run red suites**

Run: `npm run test -- tests/integration/academic-collaboration-contract.test.ts tests/integration/theme-token-contract.test.ts tests/integration/production-ui-consistency.test.ts`

Expected: FAIL until all required UX/isolation hooks and test fixtures exist.

- [ ] **Step 3: Implement only proven gaps**

Add missing labels, focus restoration, list fallback, reduced-motion rule, route boundaries, and documented Playwright local prerequisites. Retain direct database/RLS proof from Task 2; server Action membership checks never replace it.

- [ ] **Step 4: Validate full project**

Run: `supabase db reset && npm run test:db && npm run test && npm run typecheck && npm run build`

Expected: PASS. Then run `npx playwright test tests/e2e/learner-loop.spec.ts`; expected PASS when documented local auth/browser prerequisites exist, otherwise report exact unmet prerequisite and do not call it passed.

- [ ] **Step 5: Refactor fixture reuse and revalidate**

Centralize test-only collaboration fixtures with distinct professor/section IDs, rerun `supabase db reset && npm run test:db && npm run test && npm run typecheck && npm run build` expecting PASS.

- [ ] **Step 6: Commit**

```bash
git add tests README.md app/styles.css app/(app) components lib
git commit -m "test: cover academic collaboration beta"
```

### Task 10: Wire feature flag and prepare Railway rollout safely

**Files:**
- Modify: `.env.example`, `README.md`, `docs/railway-deployment.md`, `tests/integration/railway-deployment-contract.test.ts`
- Modify: collaboration route/action gate modules from Tasks 4–8

**Interfaces:** Consumes migration/auth/build behavior from preceding tasks and existing `railway.json`, `Dockerfile`, `app/api/health/route.ts`. Produces feature-flagged production runbook with no embedded secret.

- [ ] **Step 1: Write failing deployment contracts**

```ts
expect(envExample).toContain('ACADEMIC_COLLABORATION_ENABLED=false');
expect(railwayDocs).toContain('ACADEMIC_COLLABORATION_ENABLED=true');
expect(railwayDocs).toContain('https://<railway-domain>/auth/callback');
expect(railwayDocs).toContain('supabase db push');
expect(railwayDocs).toContain('NEXT_PUBLIC_ENABLE_TEST_ACCESS=false');
expect(railwayDocs).not.toMatch(/SUPABASE_(?:SERVICE_ROLE|SECRET)_KEY\s*=\s*\S+/);
expect(railway).toContain('healthcheckPath');
```

- [ ] **Step 2: Run red deployment test**

Run: `npm run test -- tests/integration/railway-deployment-contract.test.ts`

Expected: FAIL.

- [ ] **Step 3: Add safe configuration and operator runbook**

Add `ACADEMIC_COLLABORATION_ENABLED=false` and `ACADEMIC_CURRENT_TERM_KEY=2026-2` to `.env.example`. Collaboration routes/actions safely return unavailable when flag false; legacy routes remain unaffected. Validate current term key server-side; never accept it from browser forms. In README/Railway doc define exact operator order:

```text
1. Configure Supabase passwordless email provider.
2. Register Railway URL and https://<railway-domain>/auth/callback in Supabase Auth URL Configuration.
3. Set Railway NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
4. Set ACADEMIC_CURRENT_TERM_KEY and ACADEMIC_COLLABORATION_ENABLED=true.
5. Keep NEXT_PUBLIC_ENABLE_TEST_ACCESS=false and disable Supabase Anonymous Sign-Ins.
6. From protected operator environment apply reviewed additive migration: supabase db push.
7. Deploy and wait for GET /api/health HTTP 200.
```

Do not change `Dockerfile`/`railway.json` unless build proof requires it: existing standalone Docker build and Railway `PORT`/healthcheck are correct.

- [ ] **Step 4: Add exact beta smoke/rollback procedure**

Document: UNAB sign-in and non-UNAB rejection; `/materias` first-use; duplicate search; two Calculus professors; cross-section isolation with two accounts; evaluation instructions `three exercises; choose one`; edit/delete/restore/history; dashboard/calendar; TEMA separation; signout/signin; Railway logs without body/email. Rollback sets flag false/redeploys, retains additive schema/audit data, and investigates—never drops tables.

- [ ] **Step 5: Verify/refactor/commit**

Run: `npm run test -- tests/integration/railway-deployment-contract.test.ts && npm run build` expected PASS. Make README link to the Railway runbook instead of duplicate variable details; rerun focused test. Commit:

```bash
git add .env.example README.md docs/railway-deployment.md tests/integration/railway-deployment-contract.test.ts app lib
git commit -m "docs: prepare academic beta Railway rollout"
```

## Deployment Execution Checklist

- [ ] `supabase db reset && npm run test:db`
- [ ] `npm run test && npm run typecheck && npm run build`
- [ ] `git diff --check`; ensure no `.env`, secrets, emails, dumps, or test credentials are staged.
- [ ] Configure Supabase Site URL/redirect URL, email provider, and production anonymous sign-in disabled.
- [ ] Configure Railway public Supabase URL/publishable key, `ACADEMIC_CURRENT_TERM_KEY`, enabled flag, and disabled test access.
- [ ] Apply reviewed migration once with `supabase db push` before feature enablement.
- [ ] Deploy and verify `GET /api/health` returns 200.
- [ ] Complete Task 10 two-account smoke checklist.
- [ ] Critical rollback: flag false, redeploy, preserve schema/revisions, reproduce using logs/direct RLS test before re-enable.

## Plan Self-Review

- [x] **Spec coverage:** Tasks 1–3 cover institutional identity and trusted validation; Task 2 covers canonical model, duplicates, audit, soft delete, optimistic concurrency, RLS, indexes and direct DB proof; Tasks 5–7 cover Materias/workspace/calendar/detail/accessibility in the existing shell; Task 8 covers Inicio priority/agenda; Tasks 9–10 cover regression, TEMA isolation, feature flag, Railway, smoke, and rollback.
- [x] **Completeness:** The plan supplies concrete interfaces, commands, and acceptance criteria for every task. The migration name is generated by required CLI rather than guessed.
- [x] **Type consistency:** Shared inputs/states/agenda types and all query/action/RPC names are declared before use. Every read and mutation remains section-scoped.
- [x] **Existing integration:** Plan uses current `ApplicationShell`, dashboard, `/tema`, Supabase SSR/auth, `proxy.ts`, Vitest contracts, Dockerfile, Railway config/runbook while preserving existing domains.
