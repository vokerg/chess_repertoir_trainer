# ONB-022 self-review — administrator authorization and read-only diagnostics

Date: 2026-08-04

Task: ONB-022 / issue #272

Branch: `admin/onb-022-authorization-diagnostics`

Pull request: #284

## Review scope

This review challenged the implementation against the accepted ONB-005 contract, current repository authentication and OpenAPI conventions, ONB-007 warning evidence, current deployment documentation, Prisma query shape, sensitive-field exclusions, and the future ONB-019 actor/audit boundary.

## Findings and corrections

### 1. Route handlers initially reparsed schema-backed request values

Severity: medium

The first implementation used Zod `.parse(request.query/params)` inside route handlers. The repository architecture guardrail requires handlers to consume values already validated by Fastify's Zod type provider.

Correction:

- restored `FastifyPluginAsyncZod` for the administrator module;
- route handlers now consume `request.query` and `request.params` directly;
- retained shared schemas as the single validation and OpenAPI source.

CI run #2011 caught this defect after lint/build and failed at the architecture guardrail. The correction passed the guardrail in run #2013.

### 2. Invalid-cursor and ordinary validation failures shared HTTP 400 but not one body schema

Severity: medium

`GET /api/admin/users` can return either the standard validation body or the typed `ADMIN_CURSOR_INVALID` body. Advertising only the standard validation schema would make generated OpenAPI incomplete and could make response serialization discard the typed cursor error.

Correction:

- the route now exposes an explicit union of standard validation and typed administrator error schemas for HTTP 400;
- focused tests cover cursor rejection and route schema generation.

### 3. User summary active work omitted current import runs

Severity: medium

The initial `activeWorkCount` included active imported-game jobs and preparation runs but excluded current account import runs, despite the module treating import work as a first-class diagnostic section.

Correction:

- add one page-bounded grouped `ImportRun` query for rows whose `completedAt` remains null;
- include that count in `activeWorkCount`;
- extend the disposable-database repository test with an active import fixture.

The user list still performs a constant number of queries per page rather than one query set per returned user.

### 4. Request-budget behavior could not honestly claim distributed enforcement

Severity: high if overclaimed

The current deployment documentation describes a Render API Web Service but does not guarantee one replica, and the repository contains no existing shared request limiter. An in-process bucket would not establish a deployment-wide limit.

Correction:

- add an injectable `AdminRequestBudget` interface;
- ship `UnenforcedAdminRequestBudget` by default;
- keep strict route/query bounds and pseudonymous security telemetry;
- emit HTTP 429 only when an injected budget explicitly reports `ENFORCED` and rejects the request;
- document that any shared persistence or infrastructure is a separate reviewed task.

### 5. Administrator identity and target logs needed separate domains

Severity: high

Reusing one HMAC domain for actor and target identifiers, or sharing the future deleted-identity tombstone domain, would create avoidable cross-context correlation.

Correction:

- use distinct versioned domains for read actor keys and read target keys;
- retain no raw Clerk subject in administrator feature state or structured read logs;
- leave lifecycle mutation audit and deleted-identity tombstones entirely ONB-019-owned;
- add a test proving actor and target keys differ for the same underlying identity.

### 6. Capability checks had to precede target existence checks

Severity: high

A target lookup before capability authorization would let ordinary authenticated callers distinguish existing and missing internal user IDs.

Correction:

- all administrator routes resolve capability before calling the diagnostics service;
- a focused test injects a denied policy and proves the target service is not called;
- separate tests cover unauthenticated 401, non-admin 403, and authorized missing-target 404 behavior.

### 7. Optional diagnostics needed explicit partial-state behavior

Severity: medium

Returning zero for a failed aggregate query would misrepresent missing evidence as an exact empty result.

Correction:

- detail and work sections use independent bounded queries and `Promise.allSettled`;
- failed sections return `available: false` with `QUERY_FAILED`;
- lifecycle returns `MODEL_NOT_AVAILABLE` until its persistence exists;
- focused tests force one section failure while verifying successful neighboring sections remain available.

### 8. Query shape and cursor plan required direct evidence

Severity: medium

A logically bounded API can still hide N+1 behavior or use an unindexed page scan.

Correction:

- list users by `AppUser.id DESC`, fetching only `limit + 1` rows;
- aggregate account/import/job/preparation counts for the page through grouped `userId IN (...)` queries;
- add a 105-user disposable-database fixture;
- verify cursor replay, page size, grouped counts, and no per-user query loop;
- run `EXPLAIN (FORMAT JSON)` with sequential scans disabled and assert the cursor query uses `AppUser_pkey`.

### 9. Sensitive response and logging fields needed enforceable exclusions

Severity: high

The administrator surface must not drift into a raw support-data browser.

Correction:

- shared response schemas contain no email, raw auth subject, provider username/URL, token, PGN, FEN/position, tactical/scenario payload, AI review, raw error, or course-tree content;
- security logs contain pseudonymous actor/target keys, operation, request correlation, result class, and duration only;
- focused source/schema tests reject representative sensitive identifiers;
- exact footprint values are row counts, never byte estimates.

## Warning evidence review

The implemented warnings expose exact metric, observed value, threshold, unit, and policy version. They make no ETA or SLA statement.

- direct user queued job age: more than 10 seconds;
- onboarding analysis queued job age: more than 5 minutes;
- queued import age: more than 5 minutes;
- import backlog: current queued count above 20 combined with queued-age evidence;
- preparation reconciliation lag: more than 15 seconds past `reconcileAfter`.

Imported-game jobs and their tasks are created atomically in the same transaction, so `JobRun.createdAt` is used as the durable queue-admission timestamp without another task-age query.

## Clerk claim verification

Current official Clerk documentation was checked for the pinned token contract:

- v2 session tokens include signed `sid`, `v`, `iat`, `jti`, and `fva` claims;
- `azp` may be absent for some clients and remains optional after signature/issuer/audience checks;
- `reverification_id` is an optional custom claim and is therefore retained only when present.

The administrator feature stores only the normalized fields required for current authorization and future reverification work. It does not expose raw claims to feature services.

## Collision and scope review

- no ONB-019 branch or pull request existed at claim or review time;
- no parallel administrator implementation branch or pull request existed;
- no Prisma schema or migration changed;
- no Angular, navigation, mutation, lifecycle, destructive, impersonation, audit-persistence, shared rate-limit persistence, broker, or deployment change was introduced;
- canonical `TASKS.md` and `STATUS.md` were not edited because open PR #279 already changes the canonical onboarding queue; the ONB-022 task file and issue comment carry the active claim without manufacturing a planning-file conflict.

## Residual boundaries

- The initial request budget remains honestly unenforced across replicas.
- Read-access logs are structured runtime telemetry, not persisted mutation audit.
- Lifecycle diagnostics remain explicitly unavailable until ONB-019 persistence exists.
- Angular administrator diagnostics remain ONB-023-owned.
- Mutation previews and controls remain ONB-024-owned and cannot reuse this read module as a destructive state machine.

## Second self-review — 2026-08-05

A second adversarial pass re-read the authorization, normalized session state, route handling, repository queries, warning semantics, worker-claim behavior, response schemas, tests, and the latest `main` delta rather than relying on the first review report.

### 10. Token-side administrator claim retention created an unnecessary authority seam

Severity: high as future drift risk

`VerifiedSessionContext` normalized an unused custom `crt_admin` token claim into `adminClaim`. Current authorization did not consult that value, but retaining a token-side role contradicts the server-only exact-subject allowlist boundary and makes a later accidental privilege check easier.

Correction:

- remove `adminClaim` from normalized verified session state;
- ignore `crt_admin` completely;
- add runtime and source-boundary tests proving a token-side administrator claim cannot enter feature state.

Administrator authority now has one source: the server-only `AdminAuthorizationPolicy` configured from the exact Clerk subject allowlist.

### 11. Import queue warnings depended on the bounded newest-first item page

Severity: high for operational correctness

The work endpoint returned a bounded newest-first list but derived oldest queued age from only those visible rows. An old queued import outside the page could therefore fail to produce the ONB-007 queue-age and backlog warnings.

Correction:

- retain the bounded newest-first item list;
- add one aggregate `_min(startedAt)` query across all queued imports for the target user;
- derive section-level `IMPORT_QUEUE_AGE_HIGH` and `IMPORT_QUEUE_BACKLOG_HIGH` warnings from the full queued population;
- keep item-level warnings tied only to each visible item's own evidence;
- add disposable-database and service tests where the visible row is recent but an older queued run exists outside the requested limit.

### 12. Non-null cancelled-task work keys were rechecked and retained

Severity: informational

`activeWorkKeys` counts non-null `JobTask.workKey` values. A cancelled task can deliberately retain its claim until the worker acknowledges cancellation or stale recovery clears it. Treating that key as active fencing evidence is therefore correct; filtering solely by `RUNNING` would hide an owned claim that still blocks same-game work.

No code change was made. The worker repository remains the authority for claim release and stale cleanup.

### 13. Latest `main` change was reviewed for collision

The new `main` commit `fb02c9e99a102092601ee10dde27238a861f6de4` reconciles Visual Transformation documentation. It does not change administrator, authentication, contracts, route-registration, Prisma, or test files. The feature branch still requires an explicit merge refresh and exact-head CI before squash merge.

### 14. Unexpected authorized failures bypassed the administrator response and audit boundary

Severity: high

Unexpected repository or request-budget errors fell through to the application-wide error handler. That path could serialize raw exception messages and did not emit the administrator-specific pseudonymous read event with an `ERROR` result class.

Correction:

- add one generic module-local HTTP 500 response schema that contains no exception detail;
- catch unexpected diagnostics and request-budget failures inside the administrator module;
- emit the same pseudonymous actor/target, operation, request id, result class, and duration security event used for successful reads;
- keep detailed exceptions only in the separate server operational log;
- add runtime tests proving sensitive exception text is absent from both diagnostics and budget failure responses;
- advertise the generic 500 response in OpenAPI for every administrator route.

## Review result

The second review found and corrected three material hardening/correctness defects without expanding ONB-022 into schema, frontend, lifecycle, or infrastructure work. No remaining architecture defect is known. Merge readiness requires the branch to be zero commits behind current `main`, the complete exact-head CI workflow to pass after these corrections, and PR review state to remain free of unresolved blockers.
