# ONB-005 — Administrator authentication, diagnostics, and action model

Date: 2026-08-04

Status: review candidate

Task: [ONB-005](../tasks/ONB-005-admin-auth-diagnostics-actions.md)

GitHub issue: [#152](https://github.com/vokerg/chess_repertoir_trainer/issues/152)

Pull request: [#275](https://github.com/vokerg/chess_repertoir_trainer/pull/275)

## Executive decision

Use the existing Clerk session as the only production authentication boundary. Introduce a server-only administrator authorization policy after normal Clerk JWT verification. Bootstrap the first production administrator set with an exact allowlist of Clerk user subjects, disabled by default and represented through a stable capability interface.

Do not add a shared administrator secret, email allowlist, `AppUser.isAdmin`, client-side role, second login surface, or administrator impersonation.

Do not introduce Clerk Organizations solely to model global product operators. Clerk Organizations are an active-organization, multi-tenant B2B authorization model; this repository currently has user-owned application data and no organization context. A future signed global operator claim may replace the allowlist through the same policy interface, but that migration is separate from organization membership.

Ship the administration capability in three bounded stages:

1. server-only authorization and read-only diagnostics;
2. a lazy Angular diagnostics feature with no destructive controls;
3. preview and execution adapters over the canonical ONB-019/020/021 lifecycle services after those services exist.

## Repository findings

### Authentication

The API has one global Fastify `onRequest` authentication hook. In Clerk mode it reads a bearer token or `__session` cookie, verifies the JWT with `jose`, validates issuer and optional audience, checks `azp` against configured authorized parties when present, resolves the Clerk subject to one `AppUser`, and stores a minimal `RequestAuth` object.

`RequestAuth` currently retains:

- application user id;
- provider;
- external subject;
- optional email.

It does not retain Clerk session id, token version, factor verification age, JWT id, issued-at time, or custom authorization claims. A later administrator mutation therefore cannot honestly prove recent authentication using the current request context.

`AuthConfig` has only `dev-single-user` and Clerk modes. The repository currently contains a temporary commented production guard for `dev-single-user`. Administrator configuration must therefore independently reject unsafe production combinations; ordinary dev authentication must never imply administrator authority.

The app factory accepts an injected `AuthConfig`, and its test suite already verifies per-app configuration isolation and invalid environment startup. Administrator configuration should follow the same injectable, instance-local pattern.

### Ownership and persistence

`AppUser` is the root for user-owned accounts, games, imports, jobs, courses, training, tactical data, and related projections. It also stores Clerk identity fields used for application-user resolution. It has no operator role.

Adding `isAdmin` to `AppUser` is rejected because it would couple operator authority to mutable product data and the ordinary external-user upsert path. ONB-022 should require no Prisma migration.

The existing schema contains sensitive payloads that must not leak into diagnostics, including PGN, provider URLs, usernames, analysis/tactical detail, FEN-derived positions, AI review content, and encrypted provider tokens.

### API conventions

Newer API features use isolated `FastifyPluginAsyncZod` modules, shared Zod contracts, explicit OpenAPI operation metadata, thin route handlers, feature services/repositories, and typed error mapping. The administrator API should use the same pattern under `apps/api/src/modules/admin/` and be registered once in `apps/api/src/routes/index.ts`.

The existing imported-game job API is user-owned and exposes bounded job/task projections. Administrator diagnostics should not bypass that ownership service by reusing a target user's `RequestAuth`; it should use dedicated aggregate queries and never impersonate the target user.

### Angular conventions

Protected routes are statically declared in `app.routes.ts` and use the normal `authGuard`. Main navigation is also a static readonly structure in `MainNavigationComponent`. The application has no global capability-aware navigation service.

The first administrator UI must therefore not assume that a server capability can silently hide or reveal an existing static navigation item. The initial implementation should provide a lazy `/admin` route, protected by the normal sign-in guard and authorized by `/api/admin/me`, with no entry in normal navigation. Operators can use a direct link/bookmark. ONB-023 may later add an explicitly capability-aware navigation entry, but it is not required for the first release and is never an authorization boundary.

Feature data access and state should follow the current typed API service plus feature-provided signal store pattern, including explicit loading, forbidden, partial, empty, and error states.

### Dependency boundary

The API has no route-rate-limit package or external rate-limit store. This research does not add one. ONB-022 must implement bounded reads and a tested abuse-control seam without introducing Redis, a new service, or pretending an in-process counter is globally authoritative across multiple API instances.

ONB-019 owns durable lifecycle operation, fence, idempotency, audit, and tombstone persistence. ONB-022 must not pre-empt that schema or create a second audit aggregate. Read-only access can use structured security logs; persisted mutation audit begins with ONB-019.

## External authentication findings

Clerk session-token version 2 includes signed default claims for the subject, session id, token version, issued-at time, JWT id, authorized party, and factor verification age (`fva`). Clerk documents `fva` as minutes since first- and second-factor verification.

Clerk also documents a one-time `reverification_id` custom claim for binding one reverification event to one sensitive action. Combined with `fva`, the backend can require both freshness and non-replay for destructive execution.

Clerk recommends explicit `authorizedParties` validation when authenticating requests. The repository already performs an authorized-party check and should retain that protection.

Clerk Organization roles are scoped to an active Organization and intended for multi-tenant B2B authorization. System permissions are not included in session claims; custom permissions are required for server-side checks. Introducing Organizations only for global operators would add a new tenant/context model that the product does not otherwise use.

Clerk custom session claims are size-limited. Any future global administrator claim should therefore be a small versioned value, not a copied permission document.

Official references:

- <https://clerk.com/docs/guides/sessions/session-tokens>
- <https://clerk.com/docs/reference/backend/authenticate-request>
- <https://clerk.com/docs/guides/secure/reverification>
- <https://clerk.com/docs/guides/sessions/customize-session-tokens>
- <https://clerk.com/docs/guides/organizations/overview>
- <https://clerk.com/docs/guides/organizations/control-access/roles-and-permissions>

## Threat model

The design must protect against:

- a normal authenticated user calling administrator endpoints;
- authority being inferred from email, display name, `AppUser` fields, route visibility, or client configuration;
- an unsafe `dev-single-user` production configuration granting operator authority;
- raw Clerk subjects appearing in application logs or retained audit;
- target-user impersonation and confused-deputy writes;
- target existence disclosure to unauthorized callers;
- unbounded joins, N+1 aggregate queries, arbitrary sort/filter expressions, or bulk exports;
- sensitive chess/auth payloads becoming a support-data copy;
- stale previews, replayed confirmations, or repeated destructive submissions;
- an administrator route bypassing lifecycle fences, acknowledged drain, checkpoints, or audit;
- simulated “recent authentication” that is not backed by signed Clerk session evidence;
- an in-memory rate limit being described as a distributed security control.

The design does not provide general support impersonation, arbitrary data editing, raw SQL, token access, full PGN browsing, or full course-tree browsing.

## Administrator authorization contract

### Configuration

Add a separate injectable configuration family equivalent to:

```ts
type AdminAuthConfig =
  | { mode: 'disabled' }
  | {
      mode: 'clerk-subject-allowlist';
      subjectAllowlist: ReadonlySet<string>;
      actorKeySecret: Uint8Array;
      actorKeyVersion: number;
    }
  | {
      mode: 'clerk-claim';
      claimName: string;
      acceptedValue: string;
      actorKeySecret: Uint8Array;
      actorKeyVersion: number;
    };
```

Environment names remain implementation-owned, but the behavior is fixed:

- default is disabled;
- production administrator modes require normal `AUTH_MODE=clerk`;
- production startup fails if administrator authority is configured with `dev-single-user`;
- subjects are exact opaque Clerk identifiers, never emails;
- blank, duplicate, malformed, or unexpectedly large allowlists are rejected;
- test/dev administrator access is explicit and non-production only;
- configuration is parsed once per app instance and remains injectable in tests.

### Verified session context

Extend authentication with a separate minimal verified context rather than exposing the full JWT payload to feature modules:

```ts
interface VerifiedSessionContext {
  provider: 'clerk';
  subject: string;
  sessionId: string;
  tokenVersion: number;
  issuedAt: Date;
  jwtId: string;
  authorizedParty?: string;
  factorVerificationAge?: readonly [number, number];
  reverificationId?: string;
  adminClaim?: string;
}
```

The auth plugin validates and normalizes these fields. The normal `RequestAuth` ownership contract stays unchanged. Raw claims are discarded after normalization.

The administrator resolver consumes both normal authenticated identity and verified session context. It returns no principal unless the configured policy authorizes the exact Clerk subject or accepted signed claim.

### Principal and capabilities

Use a narrow server-derived principal:

```ts
type AdminCapability =
  | 'ADMIN_DIAGNOSTICS_READ'
  | 'ADMIN_IDENTITY_READ'
  | 'ADMIN_AUDIT_READ'
  | 'ADMIN_LIFECYCLE_PREVIEW'
  | 'ADMIN_LIFECYCLE_EXECUTE';

interface AdminPrincipal {
  actorKey: string;
  actorKeyVersion: number;
  capabilities: readonly AdminCapability[];
  sessionId: string;
  factorVerificationAge?: readonly [number, number];
  reverificationId?: string;
}
```

`actorKey` is a versioned HMAC of the Clerk subject. It is stable enough for audit correlation without retaining the raw subject. The HMAC input and key version must be domain-separated from deleted-identity tombstone keys owned by ONB-019.

The bootstrap allowlist initially grants diagnostics read. Preview and execute capabilities remain separately configurable and should stay disabled until their dependencies and reverification flow are proven.

### Migration from allowlist

The allowlist is a bootstrap, not a route-level dependency. A future small signed global operator claim may replace it through the same `AdminAuthorizationPolicy` interface.

Do not make Clerk Organizations the default migration. Reconsider Organizations only if the application adopts real organization tenancy or operator membership itself becomes organization-scoped.

## API boundary

### Module shape

Recommended initial structure:

```text
apps/api/src/modules/admin/
  admin.routes.ts
  admin-auth.config.ts
  admin-authorization.service.ts
  admin-diagnostics.repository.ts
  admin-diagnostics.service.ts
  admin.dto.ts
  admin.errors.ts
packages/contracts/src/admin/
  index.ts
```

Add the `./admin` contract export using the existing package subpath convention.

### Initial routes

```text
GET /api/admin/me
GET /api/admin/users
GET /api/admin/users/:userId
GET /api/admin/users/:userId/work
```

`GET /api/admin/me` returns only enabled capabilities and reverification readiness. It does not return the allowlist source, raw subject, HMAC input, or policy configuration.

`GET /api/admin/users` is cursor-paginated. The first version supports only deterministic order and narrow filters:

- opaque cursor over `(createdAt, id)`;
- default limit 25, maximum 100;
- optional exact numeric `userId` lookup;
- optional active-work/warning-code filter after indexed query evidence exists.

No free-text email/username search, arbitrary sort expression, regex, bulk export, or client field selection is included initially.

### User summary projection

Return only:

- internal application user id;
- non-sensitive display label if already present and operationally acceptable;
- created/updated timestamps;
- counts of active external accounts, imported games, courses, and non-terminal work;
- last meaningful product activity timestamp derivable from current rows;
- warning codes and lifecycle-fence state when those models exist.

Email and raw auth subject are omitted. A future `ADMIN_IDENTITY_READ` capability may expose a masked email or exact normalized lookup only after a demonstrated operational need and separate audit.

### User detail projection

Use bounded database aggregates for:

- accounts grouped by provider and active state, without usernames;
- imported-game counts grouped by speed, index state, and latest analysis state;
- course/chapter/line counts without move trees;
- training session/attempt counts and latest timestamps;
- active/recent import and job summaries;
- preparation/lifecycle summaries once their models exist;
- exact row counts by approved user-owned model family.

Do not expose per-user “database bytes”. PostgreSQL relation size is table-wide and current rows do not carry trustworthy per-row storage attribution. Initial data footprint is exact row counts only.

Do not return PGN, provider URL, usernames, token fields, FEN/position content, tactical/scenario payload, AI review text, raw job errors, or full course lines.

### Work projection

Return bounded active/recent summaries with exact persisted timestamps and counts:

- work kind/source/status;
- queue age;
- claim/work-key presence and heartbeat age when available;
- first/last progress timestamps;
- exact completed/failed/skipped counts;
- cancellation request and acknowledgement state;
- provider retry-at/rate-limit state when durable imports exist;
- preparation reconcile lag and child settlement durations when available;
- lifecycle/cleanup lock and transaction timings when available.

Use ONB-007 thresholds to produce stable warning codes, never ETA or SLA prose. Every warning includes the measured age/count that triggered it and the policy version used.

### Query implementation constraints

- aggregate in PostgreSQL rather than loading user graphs into JavaScript;
- avoid one query per user row;
- keep each section independently bounded;
- use deterministic cursor predicates and indexed columns;
- support partial section failure with `available`, `unavailable`, and `warningCodes` rather than returning invented zeroes;
- add query-shape/performance tests against representative disposable fixtures;
- do not add a generic reporting framework.

### Error semantics

- `401`: normal authentication failed;
- `403`: authenticated but no required administrator capability;
- `404`: authorized administrator requested an absent target;
- `409`: stale preview, target state change, active incompatible operation, or idempotency mismatch;
- `422`: typed confirmation/request contract invalid;
- `429`: a real enforced administrator request budget rejected the call;
- `202`: durable lifecycle work accepted;
- `200`: read result or idempotent replay.

Unauthorized callers always receive `403` before target lookup so target existence is not disclosed.

## Abuse controls

Read-only diagnostics require multiple layers:

1. strict maximum page size and deterministic filters;
2. no unbounded export or arbitrary search;
3. database query-shape tests and operational query-duration warnings;
4. per-actor request budgets through an injectable `AdminRequestBudget` interface;
5. structured security logs for denied capability checks and repeated enumeration patterns.

The exact request-budget persistence mechanism is delegated to ONB-022 after deployment topology is rechecked:

- an in-process token bucket is acceptable only as a best-effort single-instance operational guard and must be documented as such;
- a multi-instance deployment requires a PostgreSQL-backed or existing infrastructure-backed shared budget;
- do not add Redis or another service solely for this feature;
- do not emit `429` unless a real budget is enforced.

Mutation concurrency and replay control belong to ONB-019 lifecycle uniqueness, preview, idempotency, and resource-fence persistence rather than an HTTP-only rate limiter.

## Audit and retention

### Read-only access

Read-only administrator access emits structured security logs containing:

- pseudonymous actor key/version;
- route/operation id;
- request correlation id;
- target type and pseudonymous target key where applicable;
- result class and duration;
- denied capability code.

It does not log response bodies, raw query text, raw subject, email, username, PGN, provider URL, token, FEN/scenario/AI content, or unbounded exception objects.

Default operational retention for read-access security logs is 30 days and remains configurable in deployment logging policy.

### Mutations

Persisted mutation audit is owned by ONB-019 and survives target deletion. Default retention is 365 days, configurable before production. HMAC key versions needed to interpret retained records remain available in read-only rotation state until the corresponding audit retention expires.

A key rotation:

- creates a new active actor/target key version;
- never rewrites historical audit rows;
- retains old verification/correlation material only for the configured audit period;
- keeps actor-key and deleted-identity-tombstone domains separate.

These are operational defaults, not legal claims. Production policy may lengthen or shorten them through reviewed configuration.

## Destructive action model

Administrator mutations never own deletion SQL. They call the same canonical lifecycle application services as self-service actions.

Flow:

1. authorize the explicit preview capability;
2. resolve the target without impersonation;
3. request the canonical lifecycle preview;
4. return aggregate counts, blockers, warnings, confirmation phrase, version, digest, and expiry;
5. trigger Clerk reverification in the Angular client;
6. receive a refreshed signed session token containing recent `fva` and a new `reverification_id`;
7. execute with preview token, typed confirmation, idempotency key, and request-bound reverification id;
8. create or return the canonical persisted lifecycle operation;
9. observe it by operation id;
10. rely on ONB-019/020/021 for fences, drain acknowledgement, bounded phases, retry, failure state, and audit.

The API consumes each reverification id at most once and binds it to actor, target, operation kind, preview digest, and idempotency key. A stale or reused id fails with a typed `ADMIN_REVERIFICATION_REQUIRED`/conflict response.

If the current Clerk JS integration cannot trigger and refresh a verifiable reverification flow, administrator destructive execution remains disabled. Do not replace it with a password prompt or shared secret.

### Initial action ownership

- read diagnostics: administrator only;
- un-analyse and un-index: self-service and administrator through one lifecycle service;
- account data purge and external-account deletion: self-service and administrator through one lifecycle service;
- whole-user deletion: self-service first; administrator execution deferred until policy and support need are proven;
- orphan shared-position cleanup: administrator/maintenance only after ONB-006 implementation;
- direct SQL/table deletion: never.

Dual control is not required for the initial single-operator system. Reconsider two-person approval for whole-user deletion only after at least two independent administrators exist and a concrete operational requirement is documented.

## Angular boundary

Create an isolated lazy `/admin` feature after ONB-022:

```text
apps/web/src/app/features/admin/
  data-access/
  state/
  pages/
```

Behavior:

- normal `authGuard` establishes sign-in only;
- the admin feature initializes from `GET /api/admin/me`;
- the API remains the authority for every request;
- non-admin direct navigation renders a generic unavailable/forbidden state;
- no administrator role, subject list, secret, or permission rule appears in `app-config.ts` or environment-generated browser code;
- no normal-navigation entry is required initially;
- a later conditional navigation entry requires an intentional shared capability service and still provides convenience only;
- feature state follows the existing signal-store and typed data-access conventions;
- pages cover loading, partial, empty, forbidden, stale, and error states;
- destructive controls are absent until ONB-024.

A separate frontend deployment is rejected initially because it would duplicate auth, deployment, routing, design-system, and CORS work without removing the API authorization requirement.

## Implementation decomposition

### ONB-022 — Administrator authorization and read-only diagnostics foundation

Issue: [#272](https://github.com/vokerg/chess_repertoir_trainer/issues/272)

Delivery class: implementation

Scope:

- injectable admin auth configuration;
- minimal verified Clerk session context;
- policy/capability resolver and guards;
- isolated Fastify module;
- `@chess-trainer/contracts/admin` export;
- `/api/admin/me`, user list/detail/work routes;
- bounded aggregate repository;
- warning codes, partial sections, structured security logs;
- real request-budget seam appropriate to verified deployment topology;
- startup, authorization, enumeration, projection, pagination, query-shape, and sensitive-field tests.

No Prisma migration, Angular UI, lifecycle mutation, impersonation, or PII search.

### ONB-023 — Administrator diagnostics Angular feature

Issue: [#273](https://github.com/vokerg/chess_repertoir_trainer/issues/273)

Delivery class: implementation

Scope:

- lazy `/admin` route;
- typed data access and feature-provided signal store;
- `/api/admin/me` capability bootstrap;
- bounded user/detail/work views;
- warning-code presentation;
- direct-link access with no required static navigation entry;
- responsive, keyboard, screen-reader, forbidden, partial, and reload tests.

No destructive controls or client-side authorization policy.

### ONB-024 — Administrator lifecycle previews and controls

Issue: [#274](https://github.com/vokerg/chess_repertoir_trainer/issues/274)

Delivery class: implementation

Scope:

- thin capability-gated adapters over ONB-019/020/021 services;
- preview, execute, operation status, allowed cancellation, and audit reads;
- signed `fva` freshness plus one-use `reverification_id` binding;
- typed confirmation, idempotency, actor/target pseudonyms, and retained audit;
- Angular controls only after API behavior is complete.

No raw-table writes, second lifecycle state machine, simulated recent auth, or whole-user administrator execution by default.

## Rejected alternatives

- shared administrator secret: rejected for weak attribution, browser handling, and rotation;
- email allowlist: rejected because email is mutable and not the verified opaque authorization identity;
- `AppUser.isAdmin`: rejected because product ownership rows must not own operator authority;
- client environment role: rejected as forgeable authority leakage;
- Clerk Organizations solely for operators: rejected because roles are active-organization scoped and would introduce an otherwise absent tenancy model;
- separate administrator login/user database: rejected as duplicate authentication/session security;
- support impersonation: rejected from initial scope;
- direct administrator delete SQL: rejected by ONB-004/D-076;
- per-user byte-size estimate: rejected as untrustworthy from the current schema;
- static normal-navigation item hidden only by CSS/client state: rejected as misleading and non-authoritative;
- in-memory limiter described as a cluster-wide security control: rejected;
- separate administrator frontend deployment: deferred without evidence of regulatory or identity isolation need.

## Acceptance assessment

- administrator authority is absent from normal client configuration: satisfied by server-only policy and capability resolution;
- no accidental production dev administrator: satisfied by mandatory startup rejection of Clerk/admin mode mismatch;
- every mutation is attributable: satisfied by versioned HMAC actor key and ONB-019 audit linkage;
- user/account/course lists are paginated and database-aggregated: satisfied by bounded cursor and aggregate-query contract;
- read-only diagnostics ship before destructive actions: satisfied by ONB-022/023 preceding ONB-024;
- dev and production behavior are explicit: satisfied;
- ONB-004/006/007/019/020/021 dependencies are explicit: satisfied;
- recent authentication is real rather than simulated: satisfied by signed `fva` plus one-use `reverification_id`, with execution disabled until verified;
- initial identity/course/footprint scope is bounded: satisfied by numeric-id lookup, counts only, no full content, and no byte estimates;
- abuse controls are honest about deployment topology: satisfied by an injectable real-budget requirement and no false distributed claim.

## Remaining implementation-local questions

ONB-005 does not leave architecture permission open. The following are implementation details owned by the allocated tasks:

- exact environment variable names and parser module;
- exact normalized custom claim name for a future global operator claim;
- exact PostgreSQL aggregate SQL/Prisma split and indexes proved necessary by query plans;
- exact shared request-budget mechanism after current production instance topology is verified;
- exact warning-code threshold configuration field names;
- exact Angular route/component names and optional later navigation integration;
- exact reverification trigger API supported by the pinned Clerk JS version;
- exact ONB-019 audit model/field names and retention cleanup implementation.

## Files inspected

- `apps/api/src/app.ts`
- `apps/api/src/auth/auth.config.ts`
- `apps/api/src/auth/auth.plugin.ts`
- `apps/api/src/auth/current-app-user.service.ts`
- `apps/api/src/auth/request-auth.ts`
- `apps/api/src/auth/fastify-auth.d.ts`
- `apps/api/src/routes/index.ts`
- `apps/api/src/modules/player-chess-profile/player-chess-profile.routes.ts`
- `apps/api/src/modules/opening-struggles/opening-struggles.routes.ts`
- `apps/api/src/modules/jobs/job-run.routes.ts`
- `apps/api/test/app/app-factory.test.mjs`
- `apps/api/package.json`
- `apps/api/prisma/schema.prisma`
- `packages/contracts/package.json`
- `apps/web/package.json`
- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/app.component.ts`
- `apps/web/src/app/core/auth/auth.service.ts`
- `apps/web/src/app/core/auth/auth.interceptor.ts`
- `apps/web/src/app/core/auth/auth.guard.ts`
- `apps/web/src/app/core/api/api.service.ts`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.ts`
- `apps/web/src/app/features/player-chess-profile/data-access/player-chess-profile-api.service.ts`
- `apps/web/src/app/features/player-chess-profile/state/player-chess-profile.store.ts`
- `north-star/onboarding/TASKS.md`
- `north-star/onboarding/STATUS.md`
- `north-star/onboarding/DECISIONS.md`
- `north-star/onboarding/OPEN_QUESTIONS.md`
- `north-star/onboarding/ROADMAP.md`
- `north-star/onboarding/GITHUB_ISSUES.md`
- ONB-004 task/report handoff
- ONB-007 report/self-review handoff
- issues #152, #259, #260, #261, #272, #273, and #274
- pull requests #263, #266, and #275

## Validation boundary

This task is architecture research. No API, Angular, Prisma, migration, dependency, worker, deployment, or authentication runtime is changed.

Validation for this branch consists of:

- direct inspection of current `main` and closest implementation patterns;
- current official Clerk documentation review;
- queue/issue/branch/PR collision reconciliation;
- explicit self-review in `ONB-005-2026-08-04-self-review-addendum.md`;
- canonical task and implementation-handoff updates;
- normal repository CI for documentation consistency and unchanged runtime gates.
