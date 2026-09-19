# ONB-019 — Persist destructive lifecycle operations, fences, audit, and provenance

Status: DONE

Priority: P0

Order: 160

Delivery class: Implementation

Planning maturity: Delivered through PR #386 after two adversarial self-review rounds; final runtime head `c6db4e2b4a40629a5abe11c08b1bb657a3b99518` passed CI #3013 (`32115505177`) before squash merge

GitHub issue: [#259](https://github.com/vokerg/chess_repertoir_trainer/issues/259)

Claimed by: ChatGPT

Implementation branch: `onb-019/issue-259-destructive-lifecycle-foundation`

Claimed at: 2026-08-16

Claim scope: durable destructive lifecycle persistence/contracts, user/account/game fences and overlap serialization, import/job/preparation/auth/direct-writer admission guards, bounded preview/idempotency/checkpoint/audit/claim foundation, opening provenance, deleted-identity tombstones and receipt lookup, focused tests, and architecture documentation; no destructive row execution, public lifecycle routes, Angular UI, provider/preparation implementation, shared-position cleanup, or administrator policy

Promoted at: 2026-08-15 through ONB-014 completion self-review on PR #383

## Outcome

Add the durable database foundation required to preview, serialize, fence, resume, audit, and verify destructive account/game/user operations.

## Dependencies

- ONB-004 / #151 accepted lifecycle contract, including both self-review addenda — complete.
- ONB-011 / #199 and ONB-017 / #253 schema ownership/migration coordination — complete.
- ONB-005 / #152 actor/audit authorization decisions — complete; administrator mutation exposure remains separately gated by ONB-024.
- Consumed by ONB-020 / #260 and ONB-021 / #261.

## In scope

- Typed action, status, resource, error, stop-request, and terminal-result contracts.
- Durable `DataLifecycleOperation` preview/execution persistence with idempotency, scope snapshot, bounded counts, checkpoints, claims, verification results, and first-destructive-commit evidence.
- Persisted user/account/game write fences and exact-resource uniqueness.
- User-scoped transactional serialization and conflict queries preventing overlapping user-versus-account-versus-game destructive scopes.
- Import, job, preparation, authentication, and synchronous write admission checks against active fences.
- A short commit-side synchronous writer guard: expensive provider/engine/LLM work remains outside the guard, then persistence revalidates/locks the authoritative lifecycle scope in the same transaction before mutation.
- Durable fence retention across worker crash, stale claim recovery, partial execution, and `NEEDS_ATTENTION`.
- State constraints ensuring `CANCELLED` is possible only before the first destructive mutation; later stop/failure remains resumable and fenced.
- Append-only lifecycle audit events retained independently from target user/account cascades and stripped of unnecessary PII/raw payloads.
- Opening provenance distinguishing provider, local-book, and legacy/unknown values.
- Versioned HMAC deleted-identity tombstone written before or atomically with final AppUser deletion and checked before normal AppUser upsert.
- Post-deletion operation/receipt lookup foundation that resolves an authenticated external identity or opaque receipt without ordinary AppUser upsert.
- Retention and cleanup policy for expired previews and terminal operations.
- Focused contracts, migration, repository, ownership, concurrency, direct-writer, and auth-resolution tests.
- Canonical architecture documentation.

## Out of scope

- Actual destructive row execution.
- Public destructive command routes or Angular UI.
- Provider adapter or preparation implementation.
- Holding lifecycle guards during provider, Stockfish, or LLM calls.
- Shared Position cleanup.
- Administrator role/identity policy owned by ONB-005.

## Acceptance criteria

- Preview records are bounded, expiring, ownership-scoped, and bound to execution.
- Duplicate execute requests return the same operation through a unique idempotency contract without permitting idempotency-key rebinding.
- Conflicting user/account/game fences cannot coexist, including cross-resource overlap.
- New import, job, preparation, auth-resolution update, tag, AI, tactical, scenario, or sync work cannot enter a fenced scope.
- A synchronous writer started before fence creation cannot commit after the fence unless it already held the conflicting short database guard before fence creation committed.
- No long network/engine/LLM operation holds the lifecycle guard.
- `CANCELLED` cannot be persisted after the first destructive commit.
- A failure or stop after destructive execution begins retains the resource fence and checkpoint until verified completion or an explicit safe repair/close procedure.
- Worker-claim staleness cannot clear the durable resource fence.
- Audit rows survive target deletion without raw PGN, token, email, username, FEN/scenario/AI content, provider URL, or raw auth-subject payloads.
- Opening resets can clear only locally assigned values while retaining provider and legacy/unknown values.
- A deleted auth identity cannot be silently recreated by `CurrentAppUserService`.
- A fenced/deleted identity can retrieve typed lifecycle status or receipt without ordinary AppUser provisioning.
- Action/resource scope and executable JSON scope cannot diverge from the durable operation columns.

## Required validation

- Prisma migration and generated-client validation.
- User/account/game fence conflict matrix under concurrent creators.
- Synchronous writer before/inside guarded mutation transaction versus fence creation.
- Concurrent preview/execute/idempotency tests.
- Job/import/preparation/direct-writer/auth-resolver admission tests.
- Failure before versus after first destructive mutation.
- Worker crash/stale-claim recovery with durable fence retention.
- Rejection of `CANCELLED` after partial execution.
- Opening-provenance migration and reset-policy tests.
- Auth identity tombstone tests for web, dev, and future mobile callers.
- Post-deletion receipt/status lookup without AppUser recreation.
- Audit retention and PII-shape tests.

## Completion

Implementation report: `north-star/onboarding/reports/ONB-019-2026-08-16-destructive-lifecycle-foundation.md`

Self-review addenda:
- `north-star/onboarding/reports/ONB-019-2026-08-16-self-review-addendum.md`
- `north-star/onboarding/reports/ONB-019-2026-08-16-second-self-review-addendum.md`

Completion reconciliation: `north-star/onboarding/reports/ONB-019-2026-08-26-completion-reconciliation.md`

Runtime pull request: [#386](https://github.com/vokerg/chess_repertoir_trainer/pull/386)

Final runtime head: `c6db4e2b4a40629a5abe11c08b1bb657a3b99518`

Runtime validation: CI #3013 / run `32115505177` passed on the exact final runtime head.

Runtime squash commit: `d9175c5d60448399b7297393afc55db747717ce2`

Issue #259 closed completed automatically with the accepted runtime merge on 2026-08-18.

Residual ownership: ONB-020/021 own destructive row execution; ONB-024 owns administrator exposure; ONB-026 owns shared-position cleanup implementation.

Completed at: 2026-08-26
