# Onboarding and Data Lifecycle Status

Last updated: 2026-08-03

## Program state

`RESEARCH_IN_PROGRESS`

Program tracker: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

Foundation: ONB-000 squash-merged through [PR #156](https://github.com/vokerg/chess_repertoir_trainer/pull/156)

Lifecycle contract: ONB-001 squash-merged through [PR #197](https://github.com/vokerg/chess_repertoir_trainer/pull/197)

Bounded import/backfill contract: ONB-002 squash-merged through [PR #204](https://github.com/vokerg/chess_repertoir_trainer/pull/204)

Preparation orchestration: ONB-003 squash-merged through [PR #256](https://github.com/vokerg/chess_repertoir_trainer/pull/256) as `d41f75c080cd19ad106b2143acecd3b0606adacb`

Destructive lifecycle: ONB-004 squash-merged through [PR #263](https://github.com/vokerg/chess_repertoir_trainer/pull/263) as `32db655a100ef1a55264b4d3739e2b7c38e72ee4`.

Throughput/progress: ONB-007 research and reproducible CI benchmark complete on [PR #266](https://github.com/vokerg/chess_repertoir_trainer/pull/266); review/merge pending.

Lightweight experience blueprint: ONB-016 squash-merged through [PR #225](https://github.com/vokerg/chess_repertoir_trainer/pull/225)

Next claimable ordered task: ONB-005 / [#152](https://github.com/vokerg/chess_repertoir_trainer/issues/152)

Latest report: `reports/ONB-007-2026-08-03-throughput-progress-benchmarks.md`

## Completed contracts

### ONB-001

- persisted user disposition and repeatable preparation runs;
- fixed one-account three-calendar-month standard blitz/rapid initial recipe;
- import/index core-completion gate;
- analysis continues progressively;
- feature-specific readiness;
- `/home` plus resumable `/onboarding`;
- skip distinct from cancellation;
- legacy-user adoption;
- exact progress without ETA.

### ONB-002

- extended durable `ImportRun` plus exact account/scope coverage;
- half-open UTC ranges and distinct initial/forward/backfill modes;
- one non-terminal import per account;
- replayable provider windows and conservative coverage advancement;
- bounded duplicate-safe persistence;
- database-based preparation handoff;
- explicit backfill rather than raw cursor reset.

### ONB-003

- durable preparation run/target/batch boundary;
- separate bounded index and analysis child jobs;
- server-side candidate selection and atomic child creation;
- per-run and global admission bounds;
- committed-import pipelining;
- first-analysis lane and stage-specific multi-account fairness;
- direct-user preemption;
- acknowledged controls and evidence-based readiness.

### ONB-004

- five distinct actions: un-analyse, un-index, purge account data, delete external account, and delete app user;
- un-index always includes un-analysis;
- every action is a durable previewed, idempotent, audited operation;
- persisted user/account/game write fences block new work;
- cross-resource fence creation is serialized per user;
- destructive execution waits for preparation/import cancellation acknowledgement and zero target `JobTask.workKey` claims;
- synchronous AI/tag/tactical/scenario/provider writers use a short commit-side lifecycle guard so a request started before fence creation cannot persist afterward;
- terminal cancellation is permitted only before the first destructive commit; later stop/failure retains the resource fence and resumable checkpoint;
- large actions use forward-only bounded checkpoints, not one account/user transaction;
- shared `Position`, `PositionAnalysis`, and caches survive; ONB-006 owns cleanup;
- un-analysis removes per-game runs/snapshots, AI review, ply classifications, all tactical versions/processed markers, and recomputes tags;
- tactical feedback and scenario snapshots survive un-analysis/un-index;
- account purge removes copied scenario data before game/detection cascades can null source links and verifies no target-game personal snapshot remains;
- opening provenance distinguishes provider, local-book, and legacy/unknown values;
- account purge retains the account, terminal import-run history, and independent OAuth connection while clearing authoritative coverage/current pointers/frontiers;
- account delete removes the account and account-owned import history after lifecycle audit snapshot;
- whole-user deletion blocks ordinary auth-resolution writes, removes OAuth state/tokens, creates the HMAC tombstone before or with final AppUser deletion, and exposes post-delete receipt/status without ordinary AppUser upsert;
- mobile local purge is explicit, and stale devices receive typed deleted state before upload/provisioning;
- operation/audit history survives target deletion without raw personal payloads;
- implementation allocation: ONB-019/#259, ONB-020/#260, ONB-021/#261.

### ONB-007 review contract

- safe reusable benchmark harness restricted to a fresh local disposable PostgreSQL database;
- representative 10/50/200-game provider/admission and 16/40/80-ply index/analysis fixtures;
- depth-12 WASM analysis and actual child-worker wave evidence;
- measured 50-game medium index worker wave p90 below 1.8 seconds in CI;
- measured three-game short depth-12 analysis wave first result p90 below 1.8 seconds and total p90 below 3.5 seconds in CI;
- index, first-analysis, and analysis-tail defaults of 50, 3, and 10 games;
- global preparation caps of four non-terminal batches, 200 queued tasks, and 40 queued analysis tasks;
- existing scheduling slice retained at 25 as a fairness/preemption boundary, not a visible wave;
- one-second active/five-second idle preparation reconciliation with persisted immediate wake hints;
- serial provider execution, initial 14-day Lichess windows, Chess.com calendar-month units, and 100-row database writes;
- one active import executor with 1-second poll, 15-second heartbeat, 2-minute stale, and 30-second recovery defaults;
- exact counts and fixed-denominator percentages only; no weighted overall percentage or public ETA in the initial release;
- future stage ETA requires production telemetry, a fixed denominator, stable fingerprint, at least 30 recent samples across five runs/three accounts, bounded variance, and low failure rate;
- internal first-value, stall, direct-user protection, scaling, and lifecycle/cleanup transaction budgets;
- implementation handoffs applied to ONB-008, ONB-010 through ONB-014, ONB-017/018, and diagnostic/lifecycle owners.

Review acceptance is pending on PR #266.

### ONB-016

- focused route-based progressive disclosure;
- one-account first value then optional expansion;
- persisted milestones and evidence-labelled bounded reveals;
- optional tactical and Builder continuations;
- functional Angular ownership with VT coordination.

## Ready work

### Research

1. ONB-005 / #152 — administrator authorization, diagnostics, and action model; consumes ONB-004 and ONB-007.
2. ONB-006 / #153 — orphan shared-position cleanup; consumes ONB-004 retention and ONB-007 transaction-budget boundaries.

### Implementation

- ONB-017 / #253 — preparation execution persistence — `READY` with ONB-007 numeric defaults.
- Before claiming ONB-017, inspect ONB-011 and ONB-019 activity and coordinate all Prisma/schema/migration edits.

## Allocated implementation backlog

- ONB-018 / #254 — preparation reconciliation/control — `PROPOSED`; consumes ONB-007 reconcile/first-analysis/stall defaults.
- ONB-008 / #193 — disposition/readiness projection — `PROPOSED`; consumes ONB-007 exact progress/no-ETA contract.
- ONB-009 / #194 — onboarding lifecycle commands — `PROPOSED`; destructive commands remain ONB-019/020/021-owned.
- ONB-010 / #195 — Angular onboarding/Home re-entry — `PROPOSED`; consumes ONB-007 presentation constraints.
- ONB-011 / #199 — import persistence/coverage — `PROPOSED`; coordinates with ONB-017/019 and consumes ONB-007 telemetry/write-budget requirements.
- ONB-012 / #200 — durable import worker/API — `PROPOSED`; initial 1s/15s/2m/30s loop defaults and one executor.
- ONB-013 / #201 — Lichess adapter — `PROPOSED`; initial 14-day windows, serial access, and 100-row writes.
- ONB-014 / #202 — Chess.com adapter — `PROPOSED`; serial monthly archives, cache validators, and 100-row writes.
- ONB-015 / #203 — sync cutover/preparation handoff — `PROPOSED`; current immediate account deletion cannot be final before this cutover.
- ONB-019 / #259 — destructive lifecycle operation/fence/guard/failure-state/audit/provenance/receipt foundation — `PROPOSED`.
- ONB-020 / #260 — account/game destructive coordinator — `PROPOSED`; starts with at most 100 games per transaction and operation-specific validation.
- ONB-021 / #261 — whole-user deletion and mobile purge handshake — `PROPOSED`; consumes the same transaction/lock budgets.

These tasks must not be claimed until their task-file dependencies are resolved and accepted.

## Critical findings

- current first provider sync remains synchronous and unbounded;
- current cursor is not exact coverage;
- provider persistence can currently advance past record failures;
- current provider adapters use per-game existence lookup plus insert; durable adapters must use duplicate-safe bounded bulk writes;
- current account workflow still moves candidate ID arrays through Angular;
- the imported-game worker already supplies priority, fencing, cancellation, stale recovery, and idempotent executors;
- the worker executes one imported-game task at a time; slice 25 is a scheduling yield boundary, not concurrency;
- every current analysis/process task creates and disposes a fresh engine;
- measured fresh WASM first-position startup is roughly 283–294 ms and is material, but reuse remains deferred pending production evidence and isolation tests;
- current account deletion is one immediate unfenced cascade;
- terminal job status is not drain proof because a cancelled running task deliberately retains `workKey` until executor acknowledgement;
- current synchronous provider sync has no persisted claim that deletion can drain;
- direct synchronous writers need commit-side fence serialization, not only route admission checks;
- current `clearPlyRowsForGame` is not a complete un-index operation;
- analysis evidence spans game runs, snapshots, ply fields, AI review, tags, tactical rows, and shared PositionAnalysis;
- tags are a mixed projection and must be recomputed after reset;
- scenario sessions copy personal game context and survive imported-game cascade through `SetNull`, so purge must delete them before those source links are nulled;
- opening provenance is absent;
- `OAuthLoginState` has no AppUser foreign key;
- ordinary external-user upsert can recreate a deleted AppUser unless active deletion and tombstones are checked before provisioning;
- mobile sign-out locks offline data rather than deleting it;
- account purge can retain terminal import history while clearing current coverage/frontiers;
- partial destructive failure must retain its durable resource fence;
- post-delete status retrieval cannot depend on recreating the user;
- shared Position cleanup must remain separate from account/user purge;
- CI-local provider/database/engine timings are evidence for initial configuration and budgets, not a public production ETA.

## Blockers to production implementation

- ONB-005 has not finalized administrator identity/recent-auth/audit-retention policy;
- ONB-007 awaits review acceptance/merge, although its initial defaults are documented on PR #266;
- ONB-011/012/013/014/015 have not delivered durable provider import and cutover;
- ONB-017/018 have not delivered preparation execution/control;
- ONB-019/020/021 have not delivered lifecycle persistence/execution/user deletion;
- onboarding projection/UI tasks remain blocked by durable foundations;
- production-like Neon/provider/local-binary telemetry does not exist yet, so public ETA and capacity expansion remain disabled;
- shared-position cleanup remains owned by ONB-006;
- Visual Transformation coordination remains required for final UI.

## Validation

### ONB-007 research and benchmark

- verified queue, issue, branch, PR, and collision state;
- reinspected current provider, job, index, tag, analysis, worker, deployment, test, and progress paths;
- added `apps/api/benchmarks/onboarding-throughput-safe.mjs`, which refuses remote, non-disposable, or non-empty databases and makes no provider calls;
- measured synthetic provider persistence, job admission, direct index/tag, depth-1/depth-12 analysis, combined process, and actual worker waves;
- committed environment, p50/p90, source-run, artifact-ID, digest, and limitation evidence;
- CI run `30786132287` / #1840 passed lint, build, all opening audits, architecture guardrails, migrations, the hardened benchmark, and the full test suite on benchmark head `e4dd65eddb93340327a6b21adb0fe9d15ab8035d`;
- separated provider-network, Neon, Render local-binary, multi-worker, end-to-end preparation, and lifecycle/cleanup performance from measured claims;
- no production runtime behavior, schema, migration, dependency, provider load, worker count, deployment, or user-facing ETA changed;
- local clone remained unavailable because this runtime could not resolve `github.com`.

### ONB-004 documentation-only research

- queue, issue, branch, PR, review-thread, and collision state verified;
- current Prisma relations and relevant migrations inspected;
- account delete, sync cursor reset, OAuth connection, and user resolver inspected;
- job claim/cancel/work-key/stale recovery behavior inspected;
- index, analysis, tag, tactical, AI review, and scenario writes traced;
- course/training ownership cascades inspected;
- mobile local-user/offline/outbox cascade and sign-out behavior inspected;
- running durable and synchronous writers, partial reset/failure, account purge/delete, whole-user deletion, auth recreation, post-delete polling, mobile offline devices, restart, and large-data scenarios modelled;
- first self-review corrected commit-side synchronous writer fencing and terminal import-history retention during account purge;
- second self-review corrected scenario source-preservation order, post-mutation cancellation/failure fence retention, active-fence auth behavior, tombstone ordering, and post-delete receipt lookup;
- ONB-019/#259, ONB-020/#260, and ONB-021/#261 allocated and hardened;
- final GitHub Actions CI run `30748024881` / #1804 passed lint, build, audits, architecture guardrails, migrations, and the full test suite on head `16947156e40f292e4aa5e6597c814ad4c9f36bb8`;
- PR #263 squash-merged as `32db655a100ef1a55264b4d3739e2b7c38e72ee4`;
- no production code, schema, migration, route, worker, provider, Angular, mobile, dependency, workflow, or deployment behavior changed;
- local clone/build/tests were unavailable because this runtime could not resolve `github.com`.

## Next deterministic action

Review ONB-007 / #154 on PR #266. The next claimable research task is ONB-005 / #152; ONB-006 and ONB-017 remain additional READY work after required collision review.
