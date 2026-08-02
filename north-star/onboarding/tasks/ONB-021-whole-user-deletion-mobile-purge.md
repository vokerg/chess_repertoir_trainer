# ONB-021 — Implement whole-user deletion and mobile purge handshake

Status: PROPOSED

Priority: P0

Order: 180

Delivery class: Implementation

Planning maturity: Allocated by ONB-004; blocked on lifecycle/account coordinator and administration policy

GitHub issue: [#261](https://github.com/vokerg/chess_repertoir_trainer/issues/261)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Implement whole-application-user deletion as a durable operation that drains server work, removes all user-owned data, prevents silent auth recreation, and instructs clients to erase offline local data.

## Dependencies

- ONB-004 / #151 accepted, including `reports/ONB-004-2026-08-02-self-review-addendum.md`.
- ONB-019 / #259 operation/fence/guard/audit/tombstone foundation.
- ONB-020 / #260 reusable account/game purge coordinator.
- ONB-005 / #152 administrator actor/authorization policy.
- Current mobile offline-content and outbox contracts.

## In scope

- Bounded preview and execute services for `DELETE_APP_USER`.
- Whole-user fence, cancellation, admission rejection, and drain verification across preparation/import/jobs.
- Verification that every synchronous user-owned writer uses the ONB-019 guarded commit boundary; no direct write may commit after the whole-user fence.
- Best-effort bounded upstream Lichess token revocation and mandatory local token/connection deletion.
- Explicit `OAuthLoginState` cleanup because it currently has no AppUser foreign key.
- Bounded account/imported-game, course/training, tactical/scenario, puzzle-user-state, job, and residual AppUser-owned deletion phases.
- Reuse of ONB-020 account purge, including terminal history/audit behavior, before account removal.
- Final AppUser removal after all checkpointed child phases.
- Retention of shared Position, PositionAnalysis, MastersExplorerCache, global tag definitions, Lichess puzzle corpus, lifecycle audit, and deleted-identity tombstone.
- Normal auth resolver rejection for tombstoned external identities.
- Terminal deletion receipt/handshake for web and mobile.
- Mobile deletion of `local_user`, cascading downloaded courses, local training data, and pending outbox entries before sign-out completion.
- Next-contact purge behavior for other offline devices so stale attempts cannot upload.
- Clerk/session integration, thin routes, canonical documentation, and end-to-end tests.

## Out of scope

- Shared Position cleanup.
- General mobile account-management redesign.
- Automatic rollback after destructive execution begins.
- Administrator UI.

## Acceptance criteria

- Server success is impossible while any user import/job/preparation claim remains active.
- A synchronous writer started before fence creation cannot commit after the whole-user fence unless it already held the conflicting short guard before fence creation committed.
- Every AppUser-owned row is deleted or explicitly included in the documented retained shared/audit set.
- OAuth login state and encrypted provider tokens do not survive local deletion.
- A still-valid auth token cannot recreate the user through ordinary upsert.
- The initiating mobile device deletes its local user and cascading offline/outbox data before returning to signed-out state.
- Other offline devices purge at next authenticated contact and cannot upload stale outbox attempts.
- Retry resumes from durable checkpoints and duplicate requests resolve to one operation/receipt.
- Large fixtures use bounded transactions rather than one global cascade transaction.

## Required validation

- Complete AppUser relation/cascade integration test.
- OAuth state/token deletion and upstream revoke-failure tests.
- Auth tombstone recreation/concurrent-request tests.
- User-wide active import/job/preparation drain tests.
- Direct synchronous writer guarded-commit race tests under a user fence.
- Crash/restart test after each deletion phase.
- Mobile local-user cascade and pending-outbox purge tests.
- Multi-device stale outbox rejection/purge test.
- Shared Position, analysis, cache, tag-definition, and puzzle-corpus retention test.
- Large-user database-pressure test.

## Completion

Report: none

Pull request: none

Completed at: none
