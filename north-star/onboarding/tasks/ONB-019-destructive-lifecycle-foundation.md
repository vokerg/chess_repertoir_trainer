# ONB-019 — Persist destructive lifecycle operations, fences, audit, and provenance

Status: PROPOSED

Priority: P0

Order: 160

Delivery class: Implementation

Planning maturity: Allocated by ONB-004; blocked on ONB-004 acceptance and schema-collision coordination

GitHub issue: [#259](https://github.com/vokerg/chess_repertoir_trainer/issues/259)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Add the durable database foundation required to preview, serialize, fence, resume, audit, and verify destructive account/game/user operations.

## Dependencies

- ONB-004 / #151 accepted lifecycle contract.
- Coordinate every Prisma/schema/migration edit with ONB-011 / #199 and ONB-017 / #253.
- Consume ONB-005 / #152 actor/audit authorization decisions before administrator mutation exposure.
- Consumed by ONB-020 / #260 and ONB-021 / #261.

## In scope

- Typed action, status, resource, error, and terminal-result contracts.
- Durable `DataLifecycleOperation` preview/execution persistence with idempotency, scope snapshot, bounded counts, checkpoints, claims, and verification results.
- Persisted user/account/game write fences and database uniqueness preventing overlapping destructive scopes.
- Import, job, preparation, and relevant synchronous write admission checks against active fences.
- Append-only lifecycle audit events retained independently from target user/account cascades and stripped of unnecessary PII/raw payloads.
- Opening provenance distinguishing provider, local-book, and legacy/unknown values.
- Versioned HMAC deleted-identity tombstone checked before normal AppUser upsert.
- Retention and cleanup policy for expired previews and terminal operations.
- Focused contracts, migration, repository, ownership, concurrency, and auth-resolution tests.
- Canonical architecture documentation.

## Out of scope

- Actual destructive row execution.
- Public destructive command routes or Angular UI.
- Provider adapter or preparation implementation.
- Shared Position cleanup.
- Administrator role/identity policy owned by ONB-005.

## Acceptance criteria

- Preview records are bounded, expiring, ownership-scoped, and bound to execution.
- Duplicate execute requests return the same operation through a unique idempotency contract.
- Conflicting user/account/game fences cannot coexist.
- New import, job, preparation, tag, AI, tactical, or sync work cannot enter a fenced scope.
- Audit rows survive target deletion without raw PGN, token, email, username, or auth-subject payloads.
- Opening resets can clear only locally assigned values while retaining provider and legacy/unknown values.
- A deleted auth identity cannot be silently recreated by `CurrentAppUserService`.
- Migration and race tests cover cross-resource conflicts, fence admission, preview staleness, and tombstone lookup.

## Required validation

- Prisma migration and generated-client validation.
- User/account/game fence conflict matrix.
- Concurrent preview/execute/idempotency tests.
- Job/import/preparation admission tests.
- Opening-provenance migration and reset-policy tests.
- Auth identity tombstone tests for web, dev, and future mobile callers.
- Audit retention and PII-shape tests.

## Completion

Report: none

Pull request: none

Completed at: none
