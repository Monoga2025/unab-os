# Academic Collaboration Beta Design

## Decision

Extend Universidad OS with a shared academic workspace that lets students organize the current week by the exact class section they attend. The beta keeps the product's existing visual language and treats TEMA as a visible, nonfunctional integration surface: shared academic data is created and governed inside Universidad OS, not imported from TEMA.

The core boundary is **canonical subject → professor-led class section → membership → scoped content**. A student only sees collaboration content from sections they joined, so a Calculus section taught by one professor is fully isolated from the same subject taught by another.

## Quick path

1. A student signs in through a passwordless link or one-time code sent only to an `@unab.edu.co` email address.
2. On first entry, the student adds subjects by selecting a normalized catalog entry and then selecting or creating the relevant professor-led section.
3. The student lands on Inicio, where the urgent shared evaluation, tasks, and reminders from their sections appear in the existing priority and short-agenda patterns.
4. Section members collaboratively create notes, reminders, tasks, events, and evaluations; every material change has attributable, append-only history and deleted content can be restored.

## Scope and success criteria

The beta serves a small, invitation-distributed cohort while allowing any verified UNAB student with the link to enter. Its success is that a student can identify this week's academic obligations, open a section-specific evaluation, understand its instructions, and safely collaborate without seeing unrelated classes.

| In scope | Explicitly not in scope |
| --- | --- |
| Passwordless institutional access | Password authentication, cédula-based login, or public anonymous access |
| Shared subject catalog and professor-led sections | Automatic enrollment or university SIS integration |
| Notes, events, reminders, tasks, and evaluations | File collaboration, chat, grade calculation, or push-notification delivery |
| Full audit history, restore, and section-scoped authorization | Real-time multiplayer editing, conflict-free collaborative cursors, or moderation workflows |
| Existing Inicio, Materias, and Evaluaciones UX patterns | A new visual identity, an independent dashboard, or a working TEMA sync |

## Product and UI integration

### Existing product language is the design system

The implementation extends the current Universidad OS shell rather than introducing an academic micro-product. It must use `app/design-tokens.css` semantic and component tokens, especially the soft academic lavender primary system, white surface cards, `--color-bg-inverse` dark priority panel, subtle lavender interactions, semantic status colors, and `--shadow-card`. No raw colors, alternative typography system, emoji iconography, or unrelated card style is introduced.

The existing application shell remains the navigation and responsive frame. Its outlined SVG icon language, active-state treatment, labels, desktop sidebar, and mobile details menu are reused. The planned **Evaluaciones** navigation entry becomes an active route only when its beta scope is delivered; **Materias** continues at `/tema` but gains a clearly labeled internal shared-workspace area. TEMA remains marked “Beta / not connected” and cannot claim that it imported, synchronized, or verified collaboration data.

### Inicio

Inicio preserves the existing focus hero and two-card support grid. Its priority calculation gains a collaboration source after section membership exists:

1. overdue or imminent shared evaluation;
2. overdue or imminent shared task;
3. active or planned personal study session;
4. existing TEMA-derived deadline, only when a separately configured integration is functional;
5. the existing empty state.

The selected card names the class section (subject and professor), includes due date and importance, and links to the shared item detail. The “Agenda corta” card combines the nearest section-scoped events, evaluations, tasks, and reminders without exposing content from another section. If no membership exists, it replaces uncertainty with an onboarding call to action: “Add your subjects.”

### Materias

Materias becomes the entry point for academic membership. The first-use flow asks the student to add subjects, then makes the catalog search mandatory before any creation path. A selected subject shows its existing professor-led sections; joining a section is explicit. If the section does not exist, a member may propose it through a confirmation screen that re-runs normalized duplicate checks before creation.

Subject and section cards reuse existing surface-card, button, field, and state tokens. Each section identifies subject, professor, and member count, then links to its scoped workspace. No global feed appears in Materias.

### Evaluaciones and section workspace

Evaluaciones is a calendar-first view with week navigation and list fallback. Selecting an evaluation opens a detail page or side panel with importance, time, section identity, author and latest editor, instructions, preparation notes, and structured exercise guidance. Example: “Three exercises will be provided; choose one.” The detail view makes urgency recognizable by status text, icon, and semantic color; color alone never conveys priority.

A section workspace presents tabs or filtered lists for Notes, Calendar, Tasks, and Evaluations. Creation uses progressive disclosure: type, title, due date/time when applicable, body/instructions, and optional importance. It never forces irrelevant fields on a note. Mutations show creator, last editor, and a History action without making audit metadata dominate the study workflow.

### Responsive and accessibility constraints

- Maintain the shell's desktop sidebar and mobile navigation behavior; section lists and calendars reflow to a single-column agenda on narrow screens.
- Preserve a minimum 44×44 CSS-pixel target for interactive controls, visible keyboard focus using the existing focus-border token, semantic headings, descriptive control names, and logical focus restoration after dialogs.
- Support keyboard-accessible calendar navigation and a non-grid list alternative. Do not rely on drag-and-drop, hover, color, or motion as the only way to act or understand state.
- Meet WCAG 2.2 AA contrast, respect reduced motion, keep error messages adjacent to their controls, and retain submitted values after validation failures.

## Architecture

### Identity and authentication

Use the existing Supabase SSR/auth boundary and server-side route/session checks. The login flow sends a magic link or one-time passcode only after normalizing the entered email and verifying the exact lowercase domain suffix `@unab.edu.co`. The redirect/callback performs the same server-side validation before creating or accepting an application session. Client-side checks are only usability feedback and never authorization.

The system stores the authenticated Supabase user ID and a minimal profile record. It does not store cédula numbers, passwords, university mail credentials, or any academic identity assertion beyond the verified institutional email and required display name. Auth callback failures, expired/used codes, malformed redirects, and non-UNAB accounts receive generic, non-enumerating errors with retry guidance. Rate limiting belongs at the auth edge/provider configuration; the beta does not implement a custom password flow.

### Domain model

| Entity | Purpose | Essential invariants |
| --- | --- | --- |
| `profiles` | Application profile for a verified auth user | One profile per user; display name is required; institutional email derives from auth identity, not editable client input. |
| `subjects` | Canonical academic subject catalog | Stores `display_name` and a server-derived normalized key; active entries have a unique normalized key. |
| `professors` | Canonical professor catalog | Stores display name and a server-derived normalized key; names are not identities beyond catalog use. |
| `class_sections` | A subject taught by one professor for the beta cohort | References one subject and one professor; active tuple `(subject_id, professor_id, term_key)` is unique. The beta uses one configured current `term_key`. |
| `section_memberships` | A student's membership in a class section | Unique `(section_id, user_id)`; only active memberships authorize shared content. |
| `academic_items` | Shared section-scoped material | References exactly one section and one item type: `note`, `event`, `reminder`, `task`, or `evaluation`; creator and timestamps are immutable. |
| `academic_item_revisions` | Immutable mutation log | Append-only record for create, update, delete, restore, and membership/catalog governance actions; records actor, timestamp, action, changed-field summary, and a safe before/after snapshot. |

`academic_items` carries common fields: title, rich or plain structured body, importance (`low`, `normal`, `high`, `critical`), optional `starts_at`, optional `due_at`, creator ID, `updated_by`, timestamps, and `deleted_at`/`deleted_by`. Item-type validation is enforced server-side: evaluations require an occurrence/due time and structured instructions; events require a start time; reminders require a trigger/due time; tasks require a due time; notes do not require time metadata. Evaluations may store an exercise brief such as count, selection rule, and preparation instructions in structured content rather than hard-coded columns.

### Duplicate prevention and catalog governance

Catalog creation is collaborative but constrained. Every lookup normalizes Unicode, trims and collapses whitespace, lowercases, removes diacritics, and removes punctuation separators before searching. “Cálculo I”, “calculo-i”, and “ CÁLCULO. I ” resolve to the same normalized subject key. The database—not the UI—enforces uniqueness with active-record unique constraints/indexes on normalized keys and section tuples.

The create flow is deliberately confirmation-based:

1. Search the existing catalog while typing and display exact and normalized matches.
2. Require the student to choose a matching subject/professor if one exists.
3. Only when no match exists may the student enter a new value, review the normalized representation, and confirm.
4. The server rechecks and performs an idempotent create-or-return operation. A concurrent equivalent request returns the existing entry rather than producing a duplicate.

Any active section member can create a missing catalog entry or section in beta. This is not administrator approval; governance is technical prevention, attributable creation, and recoverable correction. Catalog corrections create audit entries. A subject/professor/section with memberships or content is never hard-deleted; it is retired and redirects/alerts users to a canonical replacement when one is selected.

### Collaboration, history, and concurrency

Every active section member may create, edit, soft-delete, and restore items in that section. The original author has no exclusive edit lock. All writes execute through server actions or route handlers that identify the actor from the server session and append an audit record in the same database transaction as the material change.

The history is append-only: application roles cannot update or delete revision rows. Each entry shows actor, timestamp, action, changed fields, and enough content snapshot to understand or restore the prior version. Soft delete hides items from normal lists but preserves them and the audit trail. Restore creates a new revision; it does not erase the delete event.

Updates use optimistic concurrency with an item version or `updated_at` precondition. When a submitted version is stale, the server rejects the overwrite, preserves both users' work, and returns a conflict state that displays the latest version, the student's attempted text, attribution, and choices to reload or copy their draft. The beta does not attempt automatic text merging.

### Authorization, privacy, and RLS

All exposed collaboration tables enable RLS. Authorization is section membership-based and enforced at the database and server boundaries:

- A verified user can read only their profile, active catalog entries, their memberships, sections they belong to, and active/shared content within those sections.
- A verified user can create a membership only for themselves; self-removal is allowed. They cannot create memberships for other users in beta.
- Item inserts require membership and force `created_by`/`updated_by` to the authenticated user. Updates, soft deletes, and restores require membership plus server-side actor assignment; users cannot reassign content, authors, section IDs, or audit actors.
- Revision rows are readable only to current section members and insertable only through controlled server/database paths. They are never writable or deletable by clients.
- Catalog browsing is limited to verified institutional users. Catalog mutation requires verification and creates an audit entry. No policy accepts client-controlled user metadata, an email string, or a user ID as proof of authority.

Use `TO authenticated` together with membership predicates for every policy; it is not sufficient alone. Index the membership lookup and all foreign keys used by RLS predicates. Avoid `SECURITY DEFINER` for ordinary access; if an internal idempotent catalog routine eventually requires privileged execution, keep it outside exposed schemas, restrict execution, set a safe search path, and independently authorize the caller. Service-role credentials remain server-only.

Privacy is intentionally narrow: other section members may see display name and audit actions for that same section, but never another student's email, authentication details, private personal study workspace, TEMA records, Telegram linkage, or memberships in unrelated sections. Data exports, public profiles, and external sharing links are not beta features.

## Error and empty states

| Situation | Required behavior |
| --- | --- |
| First login with no memberships | Explain that content is visible only after joining a class section; provide “Add your subjects.” |
| Existing normalized catalog match | Prevent duplicate creation and guide selection of the existing record. |
| Race while creating a catalog record | Return the canonical record created by the competing request and continue the flow without duplicate data. |
| Unauthorized item URL or mutation | Return a generic not-found/forbidden response without exposing section or member details; log server diagnostics safely. |
| Validation failure | Keep form values, announce field errors, focus the error summary when multiple fields fail, and describe the correction. |
| Network or load failure | Preserve local unsaved draft where possible, give a retry action, and never imply a mutation succeeded without server confirmation. |
| Stale collaborative edit | Do not overwrite; show the conflict process described above. |
| Deleted item link | Show a recoverable-deleted state only to authorized members, including restore action and attribution; otherwise respond as unavailable. |
| TEMA integration entry | Display “Beta — not connected” with no sync controls, no implied import, and no academic-content dependency. |

## Data boundaries and migration strategy

This beta adds a separate shared-academic collaboration domain. It does not migrate, reinterpret, or expose existing personal `tema_*`, study-session, tutor, Jarvis, Telegram, attempts, or progress data. Existing dashboard queries continue to work before the collaboration data exists; the new priority source is additive and receives only section-scoped records.

Delivery uses additive, reversible schema migrations: new tables, constraints, indexes, RLS policies, and server-only mutation boundaries. No destructive migration, rename, backfill of TEMA records, or modification of existing personal-data policies is part of the beta. Test fixtures seed independent subjects, professors, sections, memberships, and items rather than reusing production-like user data.

## Testing strategy

| Layer | Coverage |
| --- | --- |
| Unit | Email/domain normalization, catalog normalization, priority ordering, item-type validation, date/time rendering, and stale-version detection. |
| Database | Unique normalized subject/professor/section constraints, idempotent concurrent catalog creation, append-only revision behavior, soft-delete/restore, foreign-key integrity, required indexes, and RLS allow/deny matrix. |
| Integration | Passwordless callback acceptance/rejection, first-use enrollment, catalog matching, member create/edit/delete/restore, authorization failures, and dashboard/agenda scoping. |
| UI and accessibility | Keyboard flow, focus behavior, mobile agenda fallback, visible validation, loading/error/empty states, semantic labels, contrast against real tokens, and reduced-motion behavior. |
| Regression | Existing personal dashboard, TEMA workspace, study sessions, Tutor IA, progress, Telegram pairing, and sign-out remain isolated and functional. |

No database policy is considered verified merely because a server action checks membership: tests must exercise direct authenticated data access attempts to prove RLS isolation.

## Phased delivery

### Phase 0 — design and safeguards

Confirm the feature flag/beta copy, current term configuration, Supabase auth provider configuration, and server-side institutional domain enforcement. Establish migration, RLS, audit, and test contracts before UI work.

### Phase 1 — identity and membership foundation

Deliver passwordless UNAB-only access, profiles, canonical subject/professor catalogs, section creation/join flows, uniqueness protections, and membership RLS. Add the Materias onboarding experience and its empty/error states.

### Phase 2 — shared weekly workspace

Deliver section-scoped notes, events, reminders, tasks, and evaluations with server-side validation, audit revisions, soft deletion, restoration, optimistic concurrency, and section RLS. Activate the section workspace and Evaluaciones calendar/list/detail experience.

### Phase 3 — Inicio synthesis and beta polish

Add the scoped priority and short agenda to Inicio, responsive/accessibility validation, observability for failed domain/auth attempts without personal-content logging, and regression coverage. Keep TEMA visibly beta/nonfunctional throughout.

### Deferred after beta validation

Consider notifications, file attachments, term rollover, moderators, richer professor identity, real-time updates, formal university integration, and working TEMA synchronization only after verifying that the core section-scoped workflow is used correctly.

## Review checklist

- [x] The data boundary separates same-subject sections by professor and term.
- [x] Duplicate prevention is database-enforced and safe under concurrency.
- [x] Every collaborative mutation is attributable, append-only, and recoverable.
- [x] RLS and server-side authorization make membership the only content boundary.
- [x] Inicio, Materias, and Evaluaciones extend existing Universidad OS tokens and shell patterns.
- [x] TEMA is explicitly beta/nonfunctional and outside the shared-data path.
- [x] No existing source, schema, package, or configuration change is included in this planning artifact.
