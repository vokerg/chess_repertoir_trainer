# Administrator diagnostics and account lifecycle controls

The administrator capability provides bounded diagnostics plus account/game lifecycle controls. It uses the existing Clerk session as the only production authentication boundary and does not add an administrator login, client role, impersonation, or product-data role column.

## Configuration

Administrator authorization is disabled unless explicitly enabled:

```text
ADMIN_AUTH_MODE=disabled
```

The initial production policy is an exact Clerk-subject allow-list:

```text
AUTH_MODE=clerk
ADMIN_AUTH_MODE=clerk-subject-allowlist
ADMIN_CLERK_SUBJECT_ALLOWLIST=user_abc123,user_def456
ADMIN_ACTOR_KEY_SECRET=<at-least-32-random-UTF-8-bytes>
ADMIN_ACTOR_KEY_VERSION=1
```

Subjects are opaque Clerk user identifiers, not email addresses. Blank, duplicate, malformed, or unexpectedly large allow-lists fail startup. Enabled administrator authorization also fails startup unless normal authentication uses Clerk. The app-factory-only `test` policy is rejected in production.

Administrator session evidence is derived only after the normal Clerk JWT signature, issuer, and authorized-party checks succeed. It requires the signed `sid`, `v`, and `iat` claims and preserves `jti` when Clerk supplies it, but does not require `jti`; Clerk development instances can issue otherwise-valid version 2 session tokens without that optional identifier. Administrator authority still comes exclusively from the exact server-side Clerk subject allow-list.

The actor-key secret derives versioned HMAC identifiers for structured security logs. Actor and target keys use separate domains, and both remain separate from future deleted-identity tombstones owned by ONB-019.

## API

The module exposes:

```text
GET /api/admin/me
GET /api/admin/users
GET /api/admin/users/:userId
GET /api/admin/users/:userId/work
POST /api/admin/users/:userId/data-lifecycle/preview
POST /api/admin/users/:userId/data-lifecycle/:operationId/execute
GET /api/admin/users/:userId/data-lifecycle/:operationId
POST /api/admin/users/:userId/data-lifecycle/:operationId/stop
```

Every route first requires normal authentication and its server-issued administrator capability. Target lookup happens only after authorization, so a normal authenticated user receives `403` without learning whether a target user exists.

Lifecycle routes additionally require the server-issued `ADMIN_LIFECYCLE_PREVIEW` or `ADMIN_LIFECYCLE_EXECUTE` capability. Preview and status reads use the preview capability; execution and stop/cancel mutations require the execute capability. They adapt the canonical account/game lifecycle coordinator and support `UNANALYSE_GAMES`, `UNINDEX_GAMES`, `PURGE_ACCOUNT_DATA`, and `DELETE_EXTERNAL_ACCOUNT`. Whole-user deletion and orphan shared-position cleanup are not exposed until their owning canonical services are delivered.

Execution requires the preview token, exact typed confirmation, a stable idempotency key, a signed Clerk `fva` no older than ten minutes, and a signed `reverification_id`. Configure `{{session.reverification_id}}` as a Clerk session-token custom claim. The Angular control uses Clerk's supported session reverification API to start a first-factor challenge, prepare/attempt supported password or code factors, and force-refresh the session token only after successful verification. The API hashes each reverification identifier into a one-use record bound to the administrator actor, target, action, preview digest, operation, and idempotency key. A partial-operation resume is a new destructive transition and therefore requires a new, previously unused reverification identifier.

User listing uses opaque versioned keyset cursors over `AppUser.id DESC`, defaults to 25 rows, and accepts at most 100. Work lists default to 20 and accept at most 50.

## Returned data

The API returns bounded diagnostics:

- available application-user display names and email addresses;
- up to 100 connected external-account identities per user, including provider, username, optional display name, and active state;
- account counts grouped by provider and active state;
- imported-game counts grouped by speed, index state, and analysis state;
- course, chapter, and line counts without move trees;
- training counts and latest timestamps;
- bounded import, job, preparation, lifecycle-operation, and lifecycle-audit summaries;
- exact approved row counts;
- ONB-007 warning codes with measured evidence and policy version.

Lifecycle work and its pseudonymous audit summaries use the same bounded work limit as the other recent-work sections. Optional section query failures are represented as unavailable sections rather than invented zeroes.

The response contracts exclude raw auth subjects, provider user IDs and URLs, PGN, tokens, FEN/position content, tactical/scenario payloads, AI reviews, raw job errors, full course lines, and per-user byte estimates. Email addresses and external-account usernames are returned only through the administrator-authorized diagnostics routes.

## Request-budget boundary

The repository documents a Render API Web Service but does not guarantee one replica, and it has no existing shared rate-limit mechanism. The initial `AdminRequestBudget` is therefore injectable but intentionally unenforced.

The API still applies strict pagination and query bounds and emits pseudonymous structured access logs. It does not return `429` or claim distributed rate limiting unless a real enforcing budget implementation is injected. Adding shared persistence or new infrastructure for rate limiting requires a separate reviewed task; ONB-022 adds neither Redis nor a database migration.

## Security logging

Read access logs contain only:

- pseudonymous actor key and version;
- operation id and request correlation id;
- pseudonymous target key where applicable;
- result class and duration.

They do not include response bodies, raw subjects, emails, usernames, chess payloads, tokens, raw query text, or arbitrary exception payloads. Persisted mutation audit remains owned by ONB-019.

## Explicit exclusions

The administrator feature provides no direct SQL/table mutation, whole-user deletion, shared-position cleanup, Clerk Organizations rollout, shared administrator secret, email allow-list, impersonation, raw-content browser, bulk export, new queue, broker, or deployment service.
