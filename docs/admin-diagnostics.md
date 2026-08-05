# Administrator diagnostics foundation

The initial administrator capability is a server-only, read-only diagnostics API. It uses the existing Clerk session as the only production authentication boundary and does not add an administrator login, client role, impersonation, or product-data role column.

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

The actor-key secret derives versioned HMAC identifiers for structured security logs. Actor and target keys use separate domains, and both remain separate from future deleted-identity tombstones owned by ONB-019.

## API

The module exposes:

```text
GET /api/admin/me
GET /api/admin/users
GET /api/admin/users/:userId
GET /api/admin/users/:userId/work
```

Every route first requires normal authentication and the `ADMIN_DIAGNOSTICS_READ` capability. Target lookup happens only after authorization, so a normal authenticated user receives `403` without learning whether a target user exists.

User listing uses opaque versioned keyset cursors over `AppUser.id DESC`, defaults to 25 rows, and accepts at most 100. Work lists default to 20 and accept at most 50.

## Returned data

The API returns bounded aggregates only:

- account counts grouped by provider and active state;
- imported-game counts grouped by speed, index state, and analysis state;
- course, chapter, and line counts without move trees;
- training counts and latest timestamps;
- bounded import, job, and preparation summaries;
- exact approved row counts;
- ONB-007 warning codes with measured evidence and policy version.

Lifecycle diagnostics are explicitly unavailable until their models exist. Optional section query failures are represented as unavailable sections rather than invented zeroes.

The response contracts exclude email, raw auth subject, provider usernames and URLs, PGN, tokens, FEN/position content, tactical/scenario payloads, AI reviews, raw job errors, full course lines, and per-user byte estimates.

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

This foundation provides no mutation route, lifecycle preview or execution, destructive behavior, persisted audit model, Prisma schema change, Angular UI, Clerk Organizations rollout, shared administrator secret, email allow-list, impersonation, raw-content browser, bulk export, new queue, broker, or deployment service.
