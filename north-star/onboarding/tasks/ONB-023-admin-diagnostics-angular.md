# ONB-023 — Build administrator diagnostics Angular feature

Status: DONE

Priority: P2

Order: 200

Delivery class: Implementation

GitHub issue: [#273](https://github.com/vokerg/chess_repertoir_trainer/issues/273)

Target branch: `main`

Suggested branch: `admin/onb-023-diagnostics-angular`

Promotion pull request: [#298](https://github.com/vokerg/chess_repertoir_trainer/pull/298)

Runtime branch: `admin/onb-023-diagnostics-angular`

Runtime pull request: [#307](https://github.com/vokerg/chess_repertoir_trainer/pull/307)

Completion branch: `admin/onb-023-completion-reconciliation`

Completion pull request: [#312](https://github.com/vokerg/chess_repertoir_trainer/pull/312)

## Objective

Build a lazy direct-link administrator diagnostics experience over ONB-022 without moving authorization decisions into Angular or modifying normal user-owned feature behavior.

## Dependencies

- ONB-005 accepted and merged;
- ONB-022 runtime merged through PR #284 and its canonical `DONE` transition merges through PR #298;
- coordinate visual implementation with Visual Transformation without changing diagnostics behavior.

## Primary repository touch points

- `apps/web/src/app/app.routes.ts`;
- new `apps/web/src/app/features/admin/` data-access/state/pages structure;
- existing `ApiService` and auth interceptor;
- existing shared page-header, panel, table/filter, empty/error, and responsive patterns;
- focused route/store/component/accessibility tests.

## Scope

- add lazy protected `/admin` route using the normal `authGuard` for sign-in only;
- initialize server capability from `GET /api/admin/me`;
- add typed administrator data access using `@chess-trainer/contracts/admin`;
- add a feature-provided signal store with request cancellation/stale-response protection;
- present cursor-paginated user summaries;
- present bounded user detail and work sections;
- render exact ONB-007 warning codes with measured ages/counts, not ETA/SLA copy;
- support loading, empty, partial, forbidden, unavailable, stale, and error states;
- preserve direct navigation/reload behavior;
- validate responsive, keyboard, focus, zoom, and basic screen-reader behavior.

## Navigation boundary

The current main navigation is static. The first release requires no normal-navigation entry. Operators use a direct link/bookmark.

A conditional administrator navigation entry is optional only if this task deliberately introduces a small shared capability service and tests signed-in/non-admin/admin transitions. It remains convenience only and must not be required for authorization or route safety.

## Explicit exclusions

- no administrator subject/role/claim rule in Angular configuration;
- no client-side authorization decision;
- no destructive controls;
- no impersonation;
- no email/username search;
- no raw PGN/token/position/scenario/AI/course-tree browser;
- no separate frontend deployment;
- no new global state framework;
- no broad navigation refactor merely to expose the route.

## Acceptance criteria

- direct navigation by an unauthenticated user preserves normal login return behavior;
- direct navigation by an authenticated non-admin is denied by the API and rendered generically;
- capabilities and diagnostics restore after navigation/reload;
- pagination is cursor-based and does not accumulate an unbounded client list;
- partial section failures remain visible and do not invent zero values;
- warning presentation includes evidence and avoids timing promises;
- sensitive fields are absent from requested models and rendered DOM;
- keyboard/focus/semantic behavior is covered;
- API authorization remains authoritative even if route guards/navigation state are bypassed.

## Validation

- route/auth-return tests;
- capability bootstrap and forbidden-state tests;
- typed API and store tests for loading/success/partial/error/stale requests;
- pagination and reload restoration tests;
- component tests for empty/warning/unavailable states;
- keyboard, focus, semantics, and responsive tests;
- browser validation for admin, non-admin, direct URL, reload, partial API failure, and narrow viewport;
- full web/contracts build, lint, and test gates.

## Claim rule

Do not claim until PR #298 is approved and merged, issue #272 is closed, and `TASKS.md`, this task file, and issue #273 execution metadata all show ONB-023 as `READY`. Re-inspect current navigation, merged administrator contracts, shared UI patterns, active Visual Transformation #133 work, and parallel administrator branches before implementation. Do not commit directly to `main`.

## Completion

Runtime review-ready: 2026-08-08.

Final runtime pull-request head: `d9b826054748d9d891584a593954c82b65520965`.

Runtime validation: CI run #2237 (`31248860891`) passed dependency installation, lint, the full repository build, opening audits, architecture and accessibility guardrails, the migration chain, imported-game audits, the full test suite, artifact handling, and cleanup on that exact head.

Runtime integration: PR #307 squash-merged into `main` as `07d19790a20beedf79bb094fead2c48c76404912`.

Implementation self-review found and fixed one pagination-recovery defect before merge: retry after a failed next-page request now preserves and retries the failed cursor/page instead of reloading the last successful page, with regression coverage.

Delivered runtime preserves the server authorization boundary: Angular uses the existing `authGuard` only for sign-in and bootstraps capability from `GET /api/admin/me`; it contains no local administrator identity, role, claim, or destructive-action authority.

Completion evidence is reconciled in `north-star/onboarding/reports/ONB-023-2026-08-09-completion-reconciliation.md` together with `TASKS.md`, `STATUS.md`, and issue #273 execution metadata through completion PR #312.

Residual handoff: ONB-024 remains `PROPOSED` behind its lifecycle-service and signed-reverification dependencies. This task does not promote or enable administrator mutation behavior.

Completed at: 2026-08-09, effective when PR #312 is approved and squash-merged. Issue #273 remains open until that merge.
