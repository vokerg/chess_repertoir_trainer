# Onboarding and Data Lifecycle Status

Last updated: 2026-07-29

## Program state

`RESEARCH_IN_PROGRESS`

Program tracker: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

Foundation: ONB-000 squash-merged through [PR #156](https://github.com/vokerg/chess_repertoir_trainer/pull/156)

Lifecycle contract: ONB-001 squash-merged through [PR #197](https://github.com/vokerg/chess_repertoir_trainer/pull/197) as `e0a56d7399c20f375ff9c3a7095002120d7d1cd5`

Current review: ONB-002 / [#149](https://github.com/vokerg/chess_repertoir_trainer/issues/149)

Current branch: `onb-002/issue-149-bounded-import-backfill`

Current report: `reports/ONB-002-2026-07-29-bounded-import-backfill.md`

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

### ONB-002 review delivery

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

## Allocated implementation backlog

- ONB-008 / #193 — disposition/readiness projection — `PROPOSED`.
- ONB-009 / #194 — lifecycle commands — `PROPOSED`.
- ONB-010 / #195 — Angular onboarding/Home re-entry — `PROPOSED`.
- ONB-011 / #199 — import persistence/coverage — `PROPOSED`.
- ONB-012 / #200 — import worker/API lifecycle — `PROPOSED`.
- ONB-013 / #201 — bounded Lichess adapter — `PROPOSED`.
- ONB-014 / #202 — bounded Chess.com adapter — `PROPOSED`.
- ONB-015 / #203 — account-sync cutover/preparation handoff — `PROPOSED`.

These tasks must not be claimed until their task-file dependencies are resolved and accepted.

## Ready research queue

1. ONB-003 / #150 — progressive preparation orchestration.
2. ONB-004 / #151 — destructive lifecycle invariants.
3. ONB-007 / #154 — throughput/progress.
4. ONB-005 / #152 — administrator architecture.
5. ONB-006 / #153 — orphan cleanup.

## Critical findings

- current provider sync is synchronous and unbounded on first run;
- current `syncCursorTime` is latest-observed-game time, not exact provider coverage;
- both provider services can continue past per-game failures and advance the cursor, creating silent gaps;
- current provider persistence is per-game N+1 and returns unbounded ID arrays;
- account rating stats are currently recomputed twice per sync path;
- imported-game `JobTask` cannot represent account-level provider fetches;
- Lichess supports bounded streamed ranges and speed filtering;
- Chess.com supports serial monthly archives and explicit no-game months;
- exact coverage and replayable windows remove the need for full-history cursor resets.

## Blockers to production implementation

- ONB-003 has not approved preparation-run physical orchestration or import pipelining cadence;
- ONB-004 has not approved active-work acknowledgement for account/user deletion or destructive coverage reset;
- ONB-007 has not measured import window/batch/worker timing or scaling thresholds;
- ONB-008/009/010 remain blocked by durable import/preparation implementation;
- Visual Transformation coordination for final Angular onboarding remains unresolved.

## Validation

ONB-002 documentation-only research:

- current repository provider, route, schema, worker, tests, account UI, and planning files inspected directly through GitHub;
- official Lichess, Chess.com, and Prisma contracts verified;
- initial/forward/backfill, no-data, partial write, individual failure, provider outage, restart, duplicate replay, pause, cancel, inactive-account, deletion, migration, and expansion scenarios walked through;
- report, decisions, open questions, queue, roadmap, task records, and issue mapping reconciled;
- implementation issues #199–#203 created;
- no production code, schema, migration, provider call, worker, Angular, or deployment behavior changed;
- build/test/lint/browser/provider/load checks skipped because this slice changes documentation only.

## Next deterministic action

Review and accept ONB-002, then claim ONB-003 / #150 as the next ordered research task.
