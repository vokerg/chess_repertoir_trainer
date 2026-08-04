# ONB-022 — Build administrator authorization and read-only diagnostics foundation

Status: IN_PROGRESS

Priority: P1

Order: 190

Delivery class: Implementation

GitHub issue: [#272](https://github.com/vokerg/chess_repertoir_trainer/issues/272)

Target branch: `main`

Claimed branch: `admin/onb-022-authorization-diagnostics`

Pull request: [#284](https://github.com/vokerg/chess_repertoir_trainer/pull/284)

Claimed by: ChatGPT

Claimed at: 2026-08-04

## Objective

Implement a migration-free server-only administrator authorization layer and bounded read-only diagnostics API on top of the existing Clerk authentication hook.

## Dependencies

- ONB-005 accepted and merged;
- consume ONB-007 warning semantics;
- coordinate actor-key domain and future audit handoff with ONB-019;
- recheck current API deployment topology before selecting the request-budget implementation.

## Claim-time coordination

- Current authentication retains a minimal ownership `RequestAuth`; ONB-022 adds a separate normalized verified-session context and leaves normal user-owned authorization semantics unchanged.
- No ONB-019 branch or pull request exists. ONB-022 owns only read-access actor/target HMAC domains and a replaceable policy interface; ONB-019 retains lifecycle persistence, tombstones, mutation audit, fences, and destructive behavior.
- No parallel administrator implementation branch or pull request exists.
- The hosted deployment documentation describes a Render API Web Service but does not guarantee one replica and the repository has no shared limiter. The initial `AdminRequestBudget` is therefore injectable but unenforced; strict bounds and telemetry ship without a `429` claim.
- No Prisma migration, Angular change, mutation route, persisted audit/rate-limit state, Clerk Organizations rollout, impersonation, shared secret/email allowlist, raw-content browser, broker, or new service is included.

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
- deterministic `id DESC` ordering over the existing `AppUser` primary key;
- opaque versioned cursor encoding the last returned id;
- default 25, maximum 100 rows;
- no email/username/free-text search;
- no arbitrary sort/field selection/export.

Do not require a new `AppUser.createdAt` index merely to support administrator pagination. A different sort/index strategy requires measured evidence and an explicitly coordinated migration outside this migration-free task.

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
- use already-existing shared infrastructure only when it provides a real multi-instance budget without new persistence;
- if multiple API replicas exist and no shared budget mechanism already exists, ship strict query/concurrency bounds and security telemetry but do not emit `429` or claim a distributed rate limit in ONB-022;
- allocate any new PostgreSQL persistence or infrastructure required for shared rate limiting as a separate reviewed task rather than violating ONB-022's migration-free scope;
- add no Redis or new service.

## Explicit exclusions

- no Prisma schema or migration;
- no Angular changes;
- no lifecycle mutation routes;
- no persisted mutation audit model;
- no new rate-limit persistence;
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
- user pagination uses opaque `id DESC` keyset cursors over the existing primary key;
- list/detail/work endpoints are cursor-bounded and database-aggregated without N+1 user queries;
- sensitive fields cannot appear in response schemas or security logs;
- partial diagnostic sections are explicit rather than invented zeroes;
- warning codes contain exact evidence and no ETA/SLA claim;
- `429` is returned only when an actual request budget is enforced for the verified topology;
- absence of a shared multi-instance limiter is represented honestly and does not block strict bounded diagnostics;
- no runtime destructive capability exists.

## Validation

- configuration parser and unsafe-combination tests;
- app-factory configuration isolation tests;
- verified-claim shape tests for `sid`, `v`, `iat`, `jti`, `fva`, `reverification_id`, and authorized party;
- allowlist/capability/actor-key tests;
- 401/403/404 non-enumeration tests;
- contract/OpenAPI tests;
- opaque `id DESC` cursor boundary/replay tests;
- pagination/filter tests;
- representative aggregate-query and no-N+1 tests;
- query-plan evidence showing the primary-key cursor path and bounded section queries;
- sensitive-field schema/logging tests;
- request-budget/no-budget behavior tests for the verified topology;
- full API/contracts build, lint, test, OpenAPI convergence, and architecture gates.

## Completion

Review-ready: pending exact-head CI and final PR transition.

Completed at: none.
