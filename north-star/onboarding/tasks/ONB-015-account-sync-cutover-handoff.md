# ONB-015 — Cut over account sync and preparation handoff

Status: PROPOSED

Priority: P1

Order: 150

Delivery class: Implementation

Planning maturity: Researched

GitHub issue: [#203](https://github.com/vokerg/chess_repertoir_trainer/issues/203)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Move existing account sync/UI to durable import runs and connect import progress to server-side preparation candidate selection without ID arrays or raw cursor reset.

## Dependencies

- ONB-013.
- ONB-014.
- ONB-003 handoff contract.
- ONB-004 reset/delete contract.
- Coordinate ONB-009 and ONB-010.

## In scope

- Legacy sync command compatibility wrapper/cutover.
- Account Angular accepted/background status and recovery.
- Deprecate raw cursor reset.
- One coalesced rating-stat refresh policy.
- Database-based eligible unindexed selection for preparation.
- Preserve account URLs and ownership semantics.
- API/store/browser compatibility tests.

## Out of scope

- Provider adapter internals.
- Index/analysis wave implementation.
- Destructive reset/purge.
- Final visual/accessibility polish.

## Acceptance criteria

- Account sync returns after durable acceptance.
- Active import restores after navigation/reload.
- No response returns all imported/eligible IDs.
- Preparation selects candidates server-side and bounded.
- Forward sync/backfill/reset are distinct.
- Rating stats are not recomputed twice.
- Legacy migration/rollback is explicit.

## Required validation

- Route compatibility and OpenAPI tests.
- Angular store/component tests.
- Browser reload/failure/retry review.
- No-ID-array contract tests.
- Rating-stat invocation tests.
- Architecture and full web/API gates.

## Completion

Report: none

Completed at: none
