# ONB-006 — Design database-only orphan shared-position cleanup

Status: DONE

Priority: P1

Order: 70

Delivery class: Research

Planning maturity: Complete and accepted after two adversarial self-review rounds

GitHub issue: [#153](https://github.com/vokerg/chess_repertoir_trainer/issues/153)

Claimed by: ChatGPT

Claim branch: `onb-006/issue-153-orphan-position-cleanup`

Claimed at: 2026-08-04

Claim scope: exact orphan/dependent inventory; grace, batching, locking, race, dry-run, progress, audit, invocation and scheduling contract; bounded implementation allocation

## Outcome

Define a bounded, auditable database maintenance operation that removes shared Position rows only when no imported-game ply references them and a full first-observed grace has passed.

## Why this task exists

Account/game deletion intentionally leaves reusable shared positions and analysis. Without a separate cleanup path, unique positions can accumulate indefinitely. Cleanup must not confuse shared Position data with course MoveNode trees or weaken concurrency safety for active writers.

## Current repository anchors inspected

- `apps/api/prisma/schema.prisma`
- migrations creating compact positions, lean position analysis, and opening-explorer cache relations
- imported-game ply indexing repository
- position-analysis persistence repository
- opening-explorer cache persistence repository
- current API maintenance-script and package-script patterns
- worker claim/heartbeat/stale/shutdown patterns
- ONB-004 retention/lifecycle handoff
- ONB-007 operation-budget handoff
- ONB-005 administrator action/audit draft in PR #275
- PostgreSQL explicit-locking, transaction-isolation, trigger-transition-relation, foreign-key, and lock-timeout contracts

## Dependencies

- ONB-000.
- Coordinate retained-data semantics with ONB-004.
- Coordinate action/audit shape with ONB-005/ONB-019/ONB-022.

## In scope

- Exact orphan predicate and dependent-row inventory.
- Grace-period and database-enforced reset policy.
- Database query, bounded input paging, ordering, locking, and retry alternatives.
- Concurrency behavior with indexing, analysis, cache, and destructive cascades.
- Dry-run, progress, cancellation, result, audit, and manual invocation contract.
- Manual-first versus scheduled-maintenance decision boundary.
- Performance validation plan.
- Bounded implementation task proposal.
- Canonical program-record reconciliation.

## Out of scope

- Production deletion.
- Course `MoveNode` cleanup.
- Client-provided bulk ID deletion.
- Automatic recurring scheduling before manual behavior is validated.
- VACUUM/storage-compaction automation.

## Resolved decisions

- The exact orphan predicate is zero `ImportedGamePly` references, evaluated with database `NOT EXISTS`.
- `PositionAnalysis` and `MastersExplorerCache` are dependent rows and delete through their existing cascades.
- Course `MoveNode` rows are unrelated and always excluded.
- A dedicated candidate ledger records first-observed orphan state.
- The initial grace period is 30 days.
- PostgreSQL statement triggers on ply-reference insert/update reset the candidate in the same transaction for every SQL writer.
- Candidate reconciliation remains a bounded legacy/rollout repair and audit path, not the primary reset mechanism.
- Every phase limits input Position/candidate rows before filtering; the initial maximum is 500 input rows inspected per transaction.
- Checkpoints advance to the last input row inspected, not the last matching orphan.
- Delete batches lock in the exact order `ImportedGamePly` → `ImportedGamePosition` → `PositionAnalysis` → `MastersExplorerCache`, then perform a final predicate recheck.
- The existing `ImportedGamePly.positionId` `ON DELETE RESTRICT` foreign key remains the final integrity backstop.
- Dry-run is an exact bounded traversal observation with start/completion timestamps, not one point-in-time database snapshot or execution promise.
- Progress uses exact phase/upper-bound/checkpoint/inspected/matched/deleted counters; no ETA or reclaimed-byte promise.
- Cancellation is acknowledged between atomic transactions.
- The first release is manual, disabled by default, and unscheduled.
- A server-side command under `apps/api/src/scripts/` defaults to dry-run and requires explicit apply/confirmation for execute while reusing the canonical service/state machine.
- Implementation is allocated to ONB-026 / #280.

## Acceptance criteria

- Only Position rows with zero imported-game-ply references are eligible.
- Every new/updated ply reference resets candidate grace in the same database transaction.
- A transient reference followed by dereference cannot retain the old grace clock.
- Concurrent indexing cannot cause referenced data to be deleted.
- Work is input-page bounded, resumable, and database-driven.
- Dry-run and execution share one eligibility/policy implementation without snapshot overclaim.
- Cascaded dependent data and retained data are explicit.
- Course trees are explicitly excluded.
- Manual invocation is concrete and reuses the canonical service.
- Follow-up implementation scope is narrow.
- `DECISIONS.md`, `OPEN_QUESTIONS.md`, `ROADMAP.md`, `STATUS.md`, `TASKS.md`, issue #153, and issue #280 are synchronized before review readiness.

## Validation performed

- Reinspected every current Position relation and migration-level delete rule.
- Reinspected all current production Position creation/reference paths found in indexing, analysis, and opening-explorer persistence.
- Verified `ImportedGamePly.createMany` has one current production application path, while designing the reset for all SQL writers rather than only that path.
- Compared predicate-only, application/advisory-lock, row-lock, and bounded explicit table-lock approaches.
- Verified PostgreSQL table-lock conflicts, command snapshots, `SET LOCAL`, trigger transition relations, and trigger transaction behavior against official current documentation.
- Performed a first adversarial lock-order review and corrected parent-before-ply ordering.
- Performed a second adversarial review and corrected application-only grace reset, match-limited scans, point-snapshot dry-run wording, missing manual invocation, and incomplete program-record reconciliation.
- Defined deterministic concurrency, trigger, sparse-scan, grace, recovery, command, and representative-fixture validation for implementation.
- Reconciled task numbering against active PR #275 (ONB-022–024) and PR #279 (ONB-025); allocated ONB-026.

## Completion updates

- Primary report: `reports/ONB-006-2026-08-04-orphan-shared-position-cleanup.md`
- First self-review: `reports/ONB-006-2026-08-04-self-review-addendum.md`
- Second self-review: `reports/ONB-006-2026-08-04-second-self-review-addendum.md`
- Implementation task: `tasks/ONB-026-orphan-position-cleanup-implementation.md`
- Implementation issue: [#280](https://github.com/vokerg/chess_repertoir_trainer/issues/280)
- Pull request: [#281](https://github.com/vokerg/chess_repertoir_trainer/pull/281)

## Completion

Reports:

- `reports/ONB-006-2026-08-04-orphan-shared-position-cleanup.md`
- `reports/ONB-006-2026-08-04-self-review-addendum.md`
- `reports/ONB-006-2026-08-04-second-self-review-addendum.md`

Completed at: 2026-08-04
