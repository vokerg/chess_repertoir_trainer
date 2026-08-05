# ONB-023 — Build administrator diagnostics Angular feature

Status: PROPOSED

Priority: P2

Order: 200

Delivery class: Implementation

GitHub issue: [#273](https://github.com/vokerg/chess_repertoir_trainer/issues/273)

Target branch: `main`

Suggested branch: `admin/onb-023-diagnostics-angular`

## Objective

Build a lazy direct-link administrator diagnostics experience over ONB-022 without moving authorization decisions into Angular or modifying normal user-owned feature behavior.

## Dependencies

- ONB-005 accepted and merged;
- ONB-022 accepted and merged;
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

Do not claim until ONB-022 is DONE and `TASKS.md` promotes ONB-023 to READY. Re-inspect current navigation and shared UI patterns before implementation. Do not commit directly to `main`.
