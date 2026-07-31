# Onboarding and Data Lifecycle Status

Last updated: 2026-07-30

## Program state

`RESEARCH_IN_PROGRESS`

Program tracker: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

Foundation: ONB-000 squash-merged through [PR #156](https://github.com/vokerg/chess_repertoir_trainer/pull/156)

Lifecycle contract: ONB-001 squash-merged through [PR #197](https://github.com/vokerg/chess_repertoir_trainer/pull/197) as `e0a56d7399c20f375ff9c3a7095002120d7d1cd5`

Bounded import/backfill contract: ONB-002 completed through [PR #204](https://github.com/vokerg/chess_repertoir_trainer/pull/204)

Lightweight experience blueprint: ONB-016 in `REVIEW` through draft [PR #225](https://github.com/vokerg/chess_repertoir_trainer/pull/225)

Next ordered task: ONB-003 / [#150](https://github.com/vokerg/chess_repertoir_trainer/issues/150)

Latest report: `reports/ONB-016-2026-07-30-lightweight-onboarding-experience-blueprint.md`

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

## Review contract

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
- refined ONB-010 functional Angular scope and validation matrix;
- no runtime implementation, schema, worker, provider, or deployment changes;
- draft PR #225 awaiting user review and explicit merge instruction.

## Allocated implementation backlog

- ONB-008 / #193 — disposition/readiness projection — `PROPOSED`; consumes ONB-016 presentation/readiness/reveal requirements.
- ONB-009 / #194 — lifecycle commands — `PROPOSED`; consumes ONB-016 action and expansion requirements.
- ONB-010 / #195 — Angular onboarding/Home re-entry — `PROPOSED`; consumes ONB-016 experience blueprint.
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

ONB-016 is in review and does not change this deterministic order.

## Critical findings

- current provider sync is synchronous and unbounded on first run;
- current `syncCursorTime` is latest-observed-game time, not exact provider coverage;
- both provider services can continue past per-game failures and advance the cursor, creating silent gaps;
- current provider persistence is per-game N+1 and returns unbounded ID arrays;
- account rating stats are currently recomputed twice per sync path;
- imported-game `JobTask` cannot represent account-level provider fetches;
- Lichess supports bounded streamed ranges and speed filtering;
- Chess.com supports serial monthly archives and explicit no-game months;
- exact coverage and replayable windows remove the need for full-history cursor resets;
- the current account page is a dense advanced management surface, not a suitable first-run flow;
- Home already demonstrates useful action prioritization but must stop independently inferring onboarding lifecycle;
- Player Chess Profile already supplies evidence-labelled conclusions and coverage concepts suitable for reuse;
- missed-shot tactical detections can already create personal scenario-training sessions;
- first value should target a meaningful indexed reveal rather than full Stockfish completion.

## Blockers to production implementation

- ONB-003 has not approved preparation-run physical orchestration, first-analysis lane, or import pipelining cadence;
- ONB-004 has not approved active-work acknowledgement for account/user deletion or destructive coverage reset;
- ONB-007 has not measured import window/batch/worker timing, first-value budgets, provider speed comparison, or scaling thresholds;
- ONB-008/009/010 remain blocked by durable import/preparation implementation;
- Player Chess Profile insight-summary/evidence threshold integration remains to be accepted;
- multi-provider duplicate and account-identity semantics remain unresolved before combined insights;
- exact Repertoire Builder evidence-anchor destination remains unresolved;
- Visual Transformation coordination for final Angular onboarding remains unresolved;
- ChatGPT Sites availability remains region/workspace dependent, so Figma/Codex or local fixture-prototype fallback is required.

## Validation

ONB-016 documentation-only research:

- current repository governance, lifecycle/import contracts, provider services, account UI, job system, Home, Player Chess Profile, tactical detections/scenario training, Builder, and Visual Transformation boundaries inspected;
- current GitHub tasks, issues, branches, and pull requests inspected for collision;
- current official OpenAI Sites and Codex/Figma material reviewed;
- direct and adjacent opening-repertoire competitor material reviewed;
- all requested ideas classified and reconciled with locked decisions;
- first-run, partial, failure, return, expansion, insight, puzzle, Builder, privacy, accessibility, and performance scenarios modelled;
- blueprint, report, decisions, open questions, task queue, issue mapping, ONB-010, and draft PR reconciled;
- no production code, schema, migration, provider call, worker, Angular, package, or deployment behavior changed;
- build/test/lint/architecture/browser/provider/load checks intentionally skipped because this slice changes documentation only.

## Next deterministic action

Claim ONB-003 / #150 as the next ordered research task.

Review ONB-016 / draft PR #225 separately; squash merge only after explicit user instruction.
