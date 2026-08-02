# Onboarding and Data Lifecycle Status

Last updated: 2026-08-02

## Program state

`RESEARCH_IN_PROGRESS`

Program tracker: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

Foundation: ONB-000 squash-merged through [PR #156](https://github.com/vokerg/chess_repertoir_trainer/pull/156)

Lifecycle contract: ONB-001 squash-merged through [PR #197](https://github.com/vokerg/chess_repertoir_trainer/pull/197)

Bounded import/backfill contract: ONB-002 squash-merged through [PR #204](https://github.com/vokerg/chess_repertoir_trainer/pull/204)

Preparation orchestration: ONB-003 squash-merged through [PR #256](https://github.com/vokerg/chess_repertoir_trainer/pull/256) as `d41f75c080cd19ad106b2143acecd3b0606adacb`

Destructive lifecycle: ONB-004 research complete on `onb-004/issue-151-destructive-lifecycle-invariants`; review/merge pending.

Lightweight experience blueprint: ONB-016 squash-merged through [PR #225](https://github.com/vokerg/chess_repertoir_trainer/pull/225)

Next claimable ordered task: ONB-007 / [#154](https://github.com/vokerg/chess_repertoir_trainer/issues/154)

Latest report: `reports/ONB-004-2026-08-02-destructive-lifecycle-invariants.md`

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

### ONB-004 review contract

- five distinct actions: un-analyse, un-index, purge account data, delete external account, and delete app user;
- un-index always includes un-analysis;
- every action is a durable previewed, idempotent, audited operation;
- persisted user/account/game write fences block new work;
- destructive execution waits for preparation/import cancellation acknowledgement and zero target `JobTask.workKey` claims;
- large actions use forward-only bounded checkpoints, not one account/user transaction;
- shared `Position`, `PositionAnalysis`, and caches survive; ONB-006 owns cleanup;
- un-analysis removes per-game runs/snapshots, AI review, ply classifications, all tactical versions/processed markers, and recomputes tags;
- tactical feedback and scenario snapshots survive un-analysis/un-index, while account purge removes copied scenario data;
- opening provenance distinguishes provider, local-book, and legacy/unknown values;
- account purge retains the account and independent OAuth connection;
- account delete retains independent OAuth unless separately disconnected;
- whole-user deletion explicitly removes OAuth state/tokens, blocks silent auth recreation through an HMAC tombstone, and requires a mobile local-purge receipt/handshake;
- operation/audit history survives target deletion without raw personal payloads;
- implementation allocation: ONB-019/#259, ONB-020/#260, ONB-021/#261.

Review acceptance is pending.

### ONB-016

- focused route-based progressive disclosure;
- one-account first value then optional expansion;
- persisted milestones and evidence-labelled bounded reveals;
- optional tactical and Builder continuations;
- functional Angular ownership with VT coordination.

## Ready work

### Research

1. ONB-007 / #154 — throughput and truthful progress.
2. ONB-005 / #152 — administrator authorization, diagnostics, and action model; consumes ONB-004.
3. ONB-006 / #153 — orphan shared-position cleanup; consumes ONB-004 retention boundary.

### Implementation

- ONB-017 / #253 — preparation execution persistence — `READY`.
- Before claiming ONB-017, inspect ONB-011 and ONB-019 activity and coordinate all Prisma/schema/migration edits.

## Allocated implementation backlog

- ONB-018 / #254 — preparation reconciliation/control — `PROPOSED`.
- ONB-008 / #193 — disposition/readiness projection — `PROPOSED`.
- ONB-009 / #194 — onboarding lifecycle commands — `PROPOSED`; destructive commands remain ONB-019/020/021-owned.
- ONB-010 / #195 — Angular onboarding/Home re-entry — `PROPOSED`.
- ONB-011 / #199 — import persistence/coverage — `PROPOSED`; coordinates with ONB-017/019.
- ONB-012 / #200 — durable import worker/API — `PROPOSED`; must expose fence/drain semantics.
- ONB-013 / #201 — Lichess adapter — `PROPOSED`.
- ONB-014 / #202 — Chess.com adapter — `PROPOSED`.
- ONB-015 / #203 — sync cutover/preparation handoff — `PROPOSED`; current immediate account deletion cannot be final before this cutover.
- ONB-019 / #259 — destructive lifecycle operation/fence/audit/provenance foundation — `PROPOSED`.
- ONB-020 / #260 — account/game destructive coordinator — `PROPOSED`.
- ONB-021 / #261 — whole-user deletion and mobile purge handshake — `PROPOSED`.

These tasks must not be claimed until their task-file dependencies are resolved and accepted.

## Critical findings

- current first provider sync remains synchronous and unbounded;
- current cursor is not exact coverage;
- provider persistence can currently advance past record failures;
- current account workflow still moves candidate ID arrays through Angular;
- the imported-game worker already supplies priority, fencing, cancellation, stale recovery, and idempotent executors;
- current account deletion is one immediate unfenced cascade;
- terminal job status is not drain proof because a cancelled running task deliberately retains `workKey` until executor acknowledgement;
- current synchronous provider sync has no persisted claim that deletion can drain;
- current `clearPlyRowsForGame` is not a complete un-index operation;
- analysis evidence spans game runs, snapshots, ply fields, AI review, tags, tactical rows, and shared PositionAnalysis;
- tags are a mixed projection and must be recomputed after reset;
- scenario sessions copy personal game context and survive imported-game cascade through `SetNull`;
- opening provenance is absent;
- `OAuthLoginState` has no AppUser foreign key;
- ordinary external-user upsert can recreate a deleted AppUser unless identity deletion is fenced/tombstoned;
- mobile sign-out locks offline data rather than deleting it;
- shared Position cleanup must remain separate from account/user purge.

## Blockers to production implementation

- ONB-004 requires review acceptance and merge;
- ONB-005 has not finalized administrator identity/recent-auth/audit-retention policy;
- ONB-007 has not measured operational sizing and batch thresholds;
- ONB-011/012/013/014/015 have not delivered durable provider import and cutover;
- ONB-017/018 have not delivered preparation execution/control;
- ONB-019/020/021 have not delivered lifecycle persistence/execution/user deletion;
- onboarding projection/UI tasks remain blocked by durable foundations;
- shared-position cleanup remains owned by ONB-006;
- Visual Transformation coordination remains required for final UI.

## Validation

### ONB-004 documentation-only research

- queue, issue, branch, and PR collision state verified;
- current Prisma relations and relevant migrations inspected;
- account delete, sync cursor reset, OAuth connection, and user resolver inspected;
- job claim/cancel/work-key/stale recovery behavior inspected;
- index, analysis, tag, tactical, AI review, and scenario writes traced;
- course/training ownership cascades inspected;
- mobile local-user/offline/outbox cascade and sign-out behavior inspected;
- running writer, partial reset, account purge/delete, whole-user deletion, auth recreation, mobile offline device, restart, and large-data scenarios modelled;
- ONB-019/#259, ONB-020/#260, and ONB-021/#261 allocated;
- no production code, schema, migration, route, worker, provider, Angular, mobile, dependency, workflow, or deployment behavior changed;
- local clone/build/tests were unavailable because this runtime cannot resolve `github.com`; PR CI is the available repository-level validation.

## Next deterministic action

Review and merge ONB-004 / #151. The next claimable research task is ONB-007 / #154.
