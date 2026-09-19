# ONB-017 — Self-review addendum

Date: 2026-08-04

Task: [ONB-017](../tasks/ONB-017-preparation-execution-boundary.md)

Issue: [#253](https://github.com/vokerg/chess_repertoir_trainer/issues/253)

Pull request: [#282](https://github.com/vokerg/chess_repertoir_trainer/pull/282)

## Purpose

This addendum records the adversarial implementation review performed after the initial green CI result. The review rechecked every PR file against ONB-001, ONB-003, ONB-004, ONB-007, the existing imported-game workflow semantics, and the persistent worker's active-game and priority contracts.

## Finding 1 — Scope comparisons did not match imported provider values

Severity: high.

The first implementation compared `scopeJson.speedCategories` and `scopeJson.variants` to `ImportedGame` strings case-sensitively. Recipe examples and tests used uppercase values such as `BLITZ` and `STANDARD`, while current import paths persist provider-shaped lowercase values such as `blitz`, `rapid`, `chess`, and `standard`.

The variant predicate also failed the accepted standard-chess compatibility rule from ONB-001: `null`, `chess`, and `standard` all represent the standard variant.

The original fixtures stored uppercase database values and therefore hid the production mismatch. A default onboarding run could have observed no eligible games even though matching imported games existed.

### Correction

- compare speed and variant scope strings case-insensitively after trimming;
- treat `null`, empty, `chess`, and `standard` imported variants as standard-chess aliases when the scope requests `STANDARD` or `CHESS`;
- normalize the rated-scope comparison case-insensitively;
- validate that scope snapshots are objects whose optional speed/variant fields are arrays of non-empty strings;
- change preparation fixtures to production-shaped lowercase imported values;
- add regression coverage for the standard variant aliases and nonmatching speed/variant exclusions.

## Finding 2 — Retry lanes admitted untouched backlog

Severity: high.

The initial index retry predicate accepted every unindexed game because the retry flag bypassed the normal `plyIndexError IS NULL` condition. The initial analysis retry predicate accepted both never-analysed games and failed games.

ONB-003 requires retry to be explicit failed-evidence selection. A retry command must not silently become another normal continuation wave.

### Correction

- normal index admission selects only clean unindexed games;
- index retry selects only unindexed games with a non-null prior index error;
- normal analysis admission selects only indexed games with no latest analysis status;
- analysis retry selects only indexed games whose latest analysis status is `FAILED`;
- explicit forced analysis remains a separate override.

Focused tests now prove normal and retry lanes select disjoint evidence sets.

## Finding 3 — Cancelled execution leases were not part of candidate exclusion

Severity: medium.

Current cancellation deliberately makes the task and job terminal while retaining `JobTask.workKey` until the executor acknowledges shutdown. The initial preparation predicate excluded queued/running task state only, so it could enqueue replacement work while a cancelled executor still held the active-game lease.

The worker would still prevent overlapping execution, but queueing the replacement before acknowledgement weakens the lifecycle boundary and creates avoidable duplicate work.

### Correction

Candidate selection now excludes any game with a non-null task `workKey`, regardless of the task or job lifecycle status, in addition to queued/running child work. A regression test constructs a cancelled task with a retained lease and proves preparation admission remains blocked until that lease is cleared.

## Finding 4 — Direct-user and database-invariant validation was incomplete

Severity: medium.

The first suite proved that an already queued direct task was excluded and that preparation priority was lower, but it did not exercise a true concurrent direct-user creation race. Same-parent creator coverage also proved the repository check without directly challenging the PostgreSQL partial unique index for active stage batches.

### Correction

- add a deterministic admission-guard gate so a direct job commits during the preparation transaction before candidate selection;
- prove the direct job wins and preparation returns no eligible games;
- prove the opposite ordering can leave one safe queued duplicate, and that the worker claims the higher-priority direct task first while the preparation task remains fenced;
- directly attempt a second active same-stage batch insert and assert the database unique-constraint violation.

This matches ONB-003: duplicate queueing should be reduced, direct work must preempt preparation, and idempotent executors plus the active-game fence make the remaining late duplicate harmless.

## Additional review checks

The review also rechecked:

- advisory-lock scope and cross-parent global capacity serialization;
- child batch/job/task atomicity;
- one-active-run and one-active-stage-batch partial indexes;
- direct-user priority ordering;
- retention and dismissal snapshots;
- cancellation acknowledgement and stale lease recovery;
- ONB-011 current-import relation ownership;
- ONB-019 admission-guard integration boundary;
- current `main`, whose only post-branch change is unrelated Tactical Detections frontend/documentation work;
- open PR review threads; none were present.

No further production architecture correction was found.

## Validation

CI run `30897812426` / run number `1992` passed lint, build, architecture guardrails, the complete PostgreSQL migration chain, audits, and all tests on the corrected code-and-test head. The addendum and final PR metadata are documentation-only follow-ups and receive a fresh PR CI run before the review is considered complete.
