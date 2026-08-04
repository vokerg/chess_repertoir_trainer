# ONB-022 — Build administrator authorization and read-only diagnostics foundation

Status: PROPOSED

Priority: P1

Order: 190

Delivery class: Implementation

GitHub issue: [#272](https://github.com/vokerg/chess_repertoir_trainer/issues/272)

Target branch: `main`

Suggested branch: `admin/onb-022-authorization-diagnostics`

## Objective

Implement a migration-free server-only administrator authorization layer and bounded read-only diagnostics API on top of the existing Clerk authentication hook.

## Dependencies

- ONB-005 accepted and merged;
- consume ONB-007 warning semantics;
- coordinate actor-key domain and future audit handoff with ONB-019;
- recheck current API deployment topology before selecting the request-budget implementation.

## Primary repository touch points

- `apps/api/src/app.ts`;
- `apps/api/src/auth/auth.config.ts`;
- `apps/api/src/auth/auth.plugin.ts`;
- `apps/api/src/auth/request-auth.ts`;
- `apps/api/src/auth/fastify-auth.d.ts`;
- new `apps/api/src/modules/admin/` module;
- `apps/api/src/routes/index.ts`;
- new `packages/contracts/src/admin/` export;
- `packages/contracts/package.json`;
- focused API/auth/OpenAPI tests.

## Scope

### Authorization

- add injectable administrator configuration with disabled-by-default behavior;
- support exact Clerk subject allowlist bootstrap behind `AdminAuthorizationPolicy`;
- reject unsafe production combinations, including administrator authority with `dev-single-user`;
- normalize a minimal verified Clerk session context containing session/freshness fields required by future reverification;
- derive a pseudonymous versioned HMAC actor key with domain separation from deleted-identity tombstones;
- expose explicit capabilities;
- authorize before target lookup.

### Read-only API

Provide:

- `GET /api/admin/me`;
- cursor-paginated `GET /api/admin/users`;
- bounded `GET /api/admin/users/:userId`;
- bounded `GET /api/admin/users/:userId/work`.

Initial lookup/filter boundary:

- numeric internal user id;
- opaque deterministic cursor;
- default 25, maximum 100 rows;
- no email/username/free-text search;
- no arbitrary sort/field selection/export.

### Read model

Aggregate in PostgreSQL:

- account counts by provider/active state, without usernames;
- imported-game counts by speed/index/analysis state;
- course/chapter/line counts without move trees;
- training counts/latest timestamps;
- active/recent import/job summaries;
- optional preparation/lifecycle sections only when their models exist;
- exact approved row counts, not byte estimates;
- ONB-007 warning codes with triggering age/count and policy version.

### Security and abuse controls

- exclude PGN, provider URL, username, raw subject, email, token, FEN/position, scenario/tactical payload, AI review, raw job errors, and full course lines;
- add structured read-access security logging without response bodies;
- add strict query bounds and query-shape/performance tests;
- add an injectable request-budget seam;
- use in-process enforcement only as explicitly best-effort for a verified single-instance deployment;
- use PostgreSQL/existing infrastructure for shared enforcement if multiple instances are supported;
- add no Redis or new service.

## Explicit exclusions

- no Prisma schema or migration;
- no Angular changes;
- no lifecycle mutation routes;
- no persisted mutation audit model;
- no `AppUser.isAdmin`;
- no Clerk Organizations rollout;
- no shared secret/email allowlist/client role;
- no impersonation;
- no global auth SDK rewrite;
- no full content browser or arbitrary export.

## Acceptance criteria

- non-admin authenticated callers receive `403` before any target lookup;
- unsafe production auth/admin configurations fail startup;
- exact allowlist membership is server-only and replaceable through one policy interface;
- normal user-owned route behavior and `RequestAuth` remain compatible;
- `/api/admin/me` exposes capabilities but no policy source or identity secret;
- list/detail/work endpoints are cursor-bounded and database-aggregated without N+1 user queries;
- sensitive fields cannot appear in response schemas or security logs;
- partial diagnostic sections are explicit rather than invented zeroes;
- warning codes contain exact evidence and no ETA/SLA claim;
- `429` is returned only when an actual request budget is enforced;
- no runtime destructive capability exists.

## Validation

- configuration parser and unsafe-combination tests;
- app-factory configuration isolation tests;
- verified-claim shape tests for `sid`, `v`, `iat`, `jti`, `fva`, `reverification_id`, and authorized party;
- allowlist/capability/actor-key tests;
- 401/403/404 non-enumeration tests;
- contract/OpenAPI tests;
- pagination/cursor/filter tests;
- representative aggregate-query and no-N+1 tests;
- sensitive-field schema/logging tests;
- request-budget tests for the selected topology;
- full API/contracts build, lint, test, OpenAPI convergence, and architecture gates.

## Claim rule

Do not claim until ONB-005 is DONE and `TASKS.md` promotes ONB-022 to READY. Before branching, re-inspect current authentication and ONB-019 activity. Do not commit directly to `main`.
