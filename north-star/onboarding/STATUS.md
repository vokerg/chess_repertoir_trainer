# Onboarding and Data Lifecycle Status

Last updated: 2026-08-01

## Program state

`RESEARCH_IN_PROGRESS`

Program tracker: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

Foundation: ONB-000 squash-merged through [PR #156](https://github.com/vokerg/chess_repertoir_trainer/pull/156)

Lifecycle contract: ONB-001 squash-merged through [PR #197](https://github.com/vokerg/chess_repertoir_trainer/pull/197) as `e0a56d7399c20f375ff9c3a7095002120d7d1cd5`

Bounded import/backfill contract: ONB-002 completed through [PR #204](https://github.com/vokerg/chess_repertoir_trainer/pull/204)

Preparation orchestration: ONB-003 completed through accepted [PR #256](https://github.com/vokerg/chess_repertoir_trainer/pull/256); final squash merge authorized.

Lightweight experience blueprint: ONB-016 completed through squash-merged [PR #225](https://github.com/vokerg/chess_repertoir_trainer/pull/225) as `b485b9b2992e1152c1810c91d40cc5150d39284d`

Next claimable ordered task: ONB-004 / [#151](https://github.com/vokerg/chess_repertoir_trainer/issues/151)

Latest report: `reports/ONB-003-2026-08-01-self-review-addendum.md`

## Completed contracts

### ONB-001

- persisted user disposition and repeatable preparation runs;
- fixed one-account three-calendar-month standard blitz/rapid recipe including rated and unrated games;
- import/index core-completion gate;
- analysis continues progressively;
- feature-specific readiness;
- `/home` plus resumable `/onboarding`;
- skip distinct from cancellation;
- legacy users adopted as complete;
- exact progress without ETA.

### ONB-002

- extend existing `ImportRun` rather than create a generic request/workflow platform;
- add exact account-and-canonical-scope `AccountImportCoverage`;
- use half-open UTC ranges and distinct `BOUNDED_INITIAL`, `INCREMENTAL_FORWARD`, and `HISTORICAL_BACKFILL` modes;
- enforce one non-terminal import run per account;
- execute provider work through a separate PostgreSQL claim/heartbeat/fencing loop in the existing worker deployment;
- use deterministic replayable provider windows;
- advance coverage only after a complete or empty window;
- fail/replay any window containing parse, normalization, or persistence gaps;
- use Lichess bounded `since`/`until` streaming and Chess.com serial monthly archives;
- replace per-game existence N+1 with bounded duplicate-safe bulk persistence;
- hand preparation a database query boundary rather than ID arrays;
- conservatively migrate legacy cursors and replace raw cursor reset with explicit backfill;
- assign one owner for account rating-stat refresh.

### ONB-003

- `DataPreparationRun` plus ordered account targets and retained `DataPreparationBatch` child-job links;
- one non-terminal preparation run per user;
- separate immutable `INDEX_GAMES` and `ANALYSE_GAMES` child runs;
- PostgreSQL candidate selection under a locked parent with no browser/import ID arrays;
- at most one active index batch and one active analysis batch per run;
- globally serialized admission with configurable non-terminal-batch and queued-task caps;
- indexing after committed import rows while core readiness waits for terminal exact coverage;
- first-index, first-analysis, index-continuation, and analysis-tail lanes;
- direct-user priorities above all preparation work;
- deterministic newest-first selection and stage-specific account-round-robin expansion;
- quiescent pause, acknowledged cancellation, explicit failed-evidence retry, linked recovery restart, and immutable expansion;
- exact readiness from current import/game evidence rather than child task history;
- parent correctness after child dismissal or retention cleanup;
- technical Angular job-store separation from the onboarding/readiness projection;
- self-review corrections recorded in `reports/ONB-003-2026-08-01-self-review-addendum.md`.

Production defaults remain blocked on ONB-007 measurements.

### ONB-016

- canonical `EXPERIENCE_BLUEPRINT.md` for the lightweight onboarding journey;
- one dominant action per focused route surface;
- progressive disclosure rather than a first-run account-management dashboard;
- one selected account for first value, with additional accounts as expansion;
- real persisted milestones rather than fabricated or elapsed-time progress;
- import-only, indexed, and analysed evidence levels;
- at most three evidence-labelled cards in one reveal;
- Player Chess Profile and tactical-training reuse rather than duplicate frontend calculations;
- optional own-game tactical scenario and evidence-anchored Builder continuation;
- ChatGPT Sites/Codex/Figma used only as private synthetic-data prototype/design handoff;
- ChessAtlas accepted as the closest documented real-game-to-exact-repertoire-deviation-to-retraining competitor;
- refined ONB-010 functional Angular scope and validation matrix;
- no runtime implementation, schema, worker, provider, or deployment changes;
- final CI run `30576472581` / #1644 passed on head `7e9b00d41e91bc49031386681b1d34772469d230`.

## Allocated implementation backlog

- ONB-017 / #253 — preparation execution persistence, globally serialized admission, and bounded child-job creation — `PROPOSED`.
- ONB-018 / #254 — progressive preparation reconciliation, stage-specific account fairness, and control — `PROPOSED`.
- ONB-008 / #193 — disposition/readiness projection — `PROPOSED`; consumes ONB-017/018 and ONB-016 presentation/readiness/reveal requirements.
- ONB-009 / #194 — lifecycle commands — `PROPOSED`; exposes thin authenticated commands over ONB-017/018.
- ONB-010 / #195 — Angular onboarding/Home re-entry — `PROPOSED`; consumes ONB-016 experience blueprint.
- ONB-011 / #199 — import persistence/coverage — `PROPOSED`.
- ONB-012 / #200 — import worker/API lifecycle — `PROPOSED`.
- ONB-013 / #201 — bounded Lichess adapter — `PROPOSED`.
- ONB-014 / #202 — bounded Chess.com adapter — `PROPOSED`.
- ONB-015 / #203 — account-sync cutover/preparation handoff — `PROPOSED`.

These tasks must not be claimed until their task-file dependencies are resolved and accepted.

## Ready research queue

1. ONB-004 / #151 — destructive lifecycle invariants.
2. ONB-007 / #154 — throughput/progress.
3. ONB-005 / #152 — administrator architecture.
4. ONB-006 / #153 — orphan cleanup.

ONB-003 and ONB-016 are complete.

## Critical findings

- current provider sync is synchronous and unbounded on first run;
- current `syncCursorTime` is latest-observed-game time, not exact provider coverage;
- both provider services can continue past per-game failures and advance the cursor, creating silent gaps;
- current provider persistence is per-game N+1 and returns unbounded ID arrays;
- account rating stats are currently recomputed twice per sync path;
- imported-game `JobTask` cannot represent account-level provider fetches;
- current account workflow candidate selection loads ID arrays into Angular and cannot be the onboarding handoff;
- the existing worker already provides run priority, 25-task slices, higher-priority preemption, same-game fencing, stale recovery, cancellation acknowledgement, and idempotent executors;
- terminal child jobs may be dismissed and later deleted, so they cannot be the only preparation parent state;
- `JobRun.source = ONBOARDING` already exists;
- a separate bounded job per index/analysis wave fits the current worker better than one mutable/unbounded run;
- first analysis can safely begin from current indexed evidence before import/index tails finish;
- core readiness must still wait for terminal exact import coverage;
- global admission limits require cross-parent serialization, not only per-parent locks;
- multi-account fairness must be stage-specific so analysis history cannot distort index admission;
- the current account page is a dense advanced management surface, not a suitable first-run flow;
- Home already demonstrates useful action prioritization but must stop independently inferring onboarding lifecycle;
- Player Chess Profile already supplies evidence-labelled conclusions and coverage concepts suitable for reuse;
- missed-shot tactical detections can already create personal scenario-training sessions;
- an exact course/repertoire deviation can become a strong later action, but repertoire creation must not block initial value.

## Blockers to production implementation

- ONB-004 has not approved active-work acknowledgement for account/user deletion or destructive coverage reset;
- ONB-007 has not measured import window/batch/worker timing, preparation wave sizes, first-analysis thresholds, admission limits, first-value budgets, provider speed comparison, or scaling thresholds;
- ONB-011/012/013/014/015 have not delivered the durable provider import and preparation handoff;
- ONB-017/018 have not delivered the preparation execution boundary and reconciler;
- ONB-008/009/010 remain blocked by durable import/preparation implementation;
- Player Chess Profile insight-summary/evidence threshold integration remains to be accepted;
- multi-provider duplicate and account-identity semantics remain unresolved before combined insights;
- exact Repertoire Builder evidence-anchor destination remains unresolved;
- Visual Transformation coordination for final Angular onboarding remains unresolved;
- ChatGPT Sites availability remains region/workspace dependent, so Figma/Codex or local fixture-prototype fallback is required.

## Validation

### ONB-003 documentation-only research

- canonical queue, task, issue, branch, and PR state inspected for collision;
- current Prisma job/import/game models inspected;
- job contracts, routes, repositories, scheduling, claims, priority, active-game fencing, stale recovery, cancellation, retry, and retention inspected;
- index/opening and analysis execution/idempotency inspected;
- Angular technical job polling and account workflow candidate submission inspected;
- ONB-001/002/016 decisions and ONB-007/008/009 boundaries reconciled;
- large-account, multi-user admission, direct-user preemption, progressive import, first-analysis, multi-account expansion, failure, child cleanup, pause, cancel, retry, restart, and process-restart scenarios modelled;
- self-review identified and corrected the cross-parent global-admission race and cross-stage fairness ambiguity;
- ONB-017 / #253 and ONB-018 / #254 allocated and corrected;
- no production code, schema, migration, provider call, worker, Angular, package, workflow, or deployment behavior changed;
- PR CI run `30711672997` passed lint, build, architecture guardrails, migrations, audits, and tests on the pre-correction documentation head;
- the final correction head requires successful PR CI before squash merge.

### ONB-016 accepted research

- current repository governance, lifecycle/import contracts, provider services, account UI, job system, Home, Player Chess Profile, tactical detections/scenario training, Builder, and Visual Transformation boundaries inspected;
- current GitHub tasks, issues, branches, and pull requests inspected for collision;
- current official OpenAI Sites and Codex/Figma material reviewed;
- direct and adjacent opening-repertoire competitor material, including ChessAtlas, reviewed;
- all requested ideas classified and reconciled with locked decisions;
- first-run, partial, failure, return, expansion, insight, puzzle, Builder, privacy, accessibility, and performance scenarios modelled;
- blueprint, reports, decisions, open questions, task queue, issue mapping, ONB-010, and PR reconciled;
- no production code, schema, migration, provider call, worker, Angular, package, workflow, or deployment behavior changed;
- repository CI #1644 passed before squash merge.

## Next deterministic action

Claim ONB-004 / #151. ONB-007 remains available in parallel after collision review.
