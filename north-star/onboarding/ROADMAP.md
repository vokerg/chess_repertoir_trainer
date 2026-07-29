# Onboarding and Data Lifecycle Roadmap

Last updated: 2026-07-29

Program: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

## Critical path

```text
ONB-001 lifecycle/default recipe — DONE
        +
ONB-002 durable bounded import/backfill — REVIEW
        +
ONB-003 progressive preparation orchestration
        +
ONB-007 throughput/progress evidence
        ↓
ONB-011 import persistence/coverage
        ↓
ONB-012 import worker/API lifecycle
        ↓
ONB-013 Lichess adapter + ONB-014 Chess.com adapter
        ↓
ONB-015 sync cutover/preparation handoff
        +
Preparation implementation outputs
        ↓
ONB-008 disposition/readiness persistence
        ↓
ONB-009 lifecycle commands
        ↓
ONB-010 functional onboarding and Home re-entry
        ↓
Visual/accessibility integration with #133
        ↓
Production onboarding release
```

Supporting lifecycle path:

```text
ONB-004 destructive invariants
        +
ONB-005 admin authorization/read model
        +
ONB-006 shared-position cleanup
        ↓
Read-only admin
        ↓
Audited purge/reset/delete actions
        ↓
Bounded cleanup
```

## Phase 0 — Program foundation

Status: `DONE` through squash-merged PR #156.

Delivered:

- canonical planning workspace;
- current-state inspection;
- master plan;
- initial decisions/open questions;
- agent execution rules;
- program and research issue mapping.

## Phase 1 — Research and contracts

### P0 critical path

- ONB-001 / #148 — lifecycle/default recipe — `DONE` through PR #197.
- ONB-002 / #149 — bounded import/backfill — `REVIEW`.
- ONB-003 / #150 — preparation orchestration — `READY`.
- ONB-004 / #151 — destructive lifecycle — `READY`.
- ONB-007 / #154 — throughput/progress — `READY`.

### P1 supporting

- ONB-005 / #152 — admin architecture — `READY`.
- ONB-006 / #153 — orphan cleanup — `READY`.

### Contracts available to consumers

ONB-001:

- user disposition plus repeatable preparation runs;
- one selected-account first run;
- fixed three-calendar-month standard blitz/rapid recipe including rated/unrated;
- import/index core-completion gate;
- analysis continues progressively;
- feature-specific readiness;
- Home plus resumable `/onboarding`;
- skip distinct from pause/cancel;
- legacy users adopted complete;
- exact progress without ETA.

ONB-002:

- extended `ImportRun` plus exact account/scope coverage;
- half-open UTC ranges;
- separate initial/forward/backfill modes;
- one non-terminal import per account;
- separate import worker loop in the existing worker deployment;
- replayable provider windows and conservative coverage advancement;
- Lichess bounded streaming and Chess.com serial monthly adapters;
- bounded duplicate-safe writes;
- database-based preparation handoff;
- conservative legacy-cursor migration and explicit backfill.

Phase exit:

- lifecycle state machine approved;
- import modes/coverage/cursor invariants approved;
- preparation parent/wave model approved;
- performance budgets and operational sizing measured;
- destructive model matrix approved;
- admin authorization/audit direction approved;
- cleanup query/concurrency direction approved;
- implementation tasks moved from `PROPOSED` only when dependencies are satisfied.

## Phase 2 — Durable account-import foundation

Implementation tasks:

1. ONB-011 / [#199](https://github.com/vokerg/chess_repertoir_trainer/issues/199) — persistence/contracts/coverage.
2. ONB-012 / [#200](https://github.com/vokerg/chess_repertoir_trainer/issues/200) — API and worker lifecycle.

Blocked on:

- ONB-002 acceptance;
- ONB-004 for final destructive cutover;
- ONB-007 for production operational defaults.

Expected deliveries:

- immutable import mode/source/scope/range;
- exact account/scope coverage;
- one-active-import constraint;
- claim/heartbeat/fencing/stale recovery;
- pause/cancel/retry/shutdown;
- `202 Accepted` command/status API;
- conservative legacy migration;
- migration, ownership, restart, and concurrency tests.

Exit:

- provider work can be durably accepted without an HTTP-held import;
- exact coverage can include no-game periods;
- stale workers cannot advance or settle runs;
- forward and historical frontiers cannot corrupt each other.

## Phase 3 — Provider adapters

Implementation tasks:

- ONB-013 / [#201](https://github.com/vokerg/chess_repertoir_trainer/issues/201) — Lichess.
- ONB-014 / [#202](https://github.com/vokerg/chess_repertoir_trainer/issues/202) — Chess.com.

These tasks may run in parallel after ONB-011/012 establish shared boundaries.

Expected deliveries:

- deterministic provider-window planning;
- bounded streamed/batched persistence;
- exact empty-window coverage;
- duplicate-safe replay;
- provider retry/cancel behavior;
- no per-game existence N+1;
- fixture coverage for failures, restart, duplicates, and boundaries.

Exit:

- fixed three-month imports never scan older history;
- provider interruption cannot create silent coverage gaps;
- imported rows become progressively visible;
- provider differences remain adapter-local.

## Phase 4 — Sync cutover and preparation handoff

Primary task: ONB-015 / [#203](https://github.com/vokerg/chess_repertoir_trainer/issues/203).

Blocked on:

- ONB-013/014;
- ONB-003 preparation handoff contract;
- ONB-004 reset/delete contract;
- coordination with ONB-009/010.

Expected deliveries:

- legacy sync URL backed by durable forward import;
- account UI background progress/recovery;
- raw cursor-reset deprecation;
- one rating-stat refresh owner;
- database-selected preparation candidates;
- no imported/eligible ID arrays;
- compatibility and browser tests.

Exit:

- account sync survives navigation/restart;
- forward sync, historical backfill, and destructive reset are distinct;
- preparation consumes import progress without browser coordination.

## Phase 5 — Progressive preparation core

Research owner: ONB-003 / #150.

Expected implementation deliveries:

1. `DataPreparationRun` schema/contract;
2. server-side eligible game selection;
3. imported-game source/priority policy;
4. bounded index waves;
5. dependent analysis waves;
6. parent reconciliation;
7. import batch/window pipelining policy;
8. pause/resume/cancel/retry propagation;
9. restart/concurrency tests.

Exit:

- recent games become indexed progressively;
- analysis begins only for indexed games;
- exact partial/failure states are persisted;
- direct user jobs remain responsive;
- no browser advances the workflow;
- one-active-preparation invariant is verified.

## Phase 6 — Disposition and readiness projection

Primary task: ONB-008 / [#193](https://github.com/vokerg/chess_repertoir_trainer/issues/193), `PROPOSED`.

Blocked on the physical preparation model and stable import projection.

Expected deliveries:

- shared onboarding/readiness contracts;
- user disposition/preparation persistence;
- legacy-user adoption;
- authenticated read projection;
- stage/milestone/count/warning/readiness facts;
- bounded ownership/migration/threshold tests.

## Phase 7 — Lifecycle commands

Primary task: ONB-009 / [#194](https://github.com/vokerg/chess_repertoir_trainer/issues/194), `PROPOSED`.

Blocked on ONB-008 and durable import/preparation implementations.

Expected deliveries:

- start default recipe;
- skip guidance;
- pause/resume;
- acknowledged cancel;
- retry;
- explicit expansion;
- core-ready transition;
- idempotency/ownership/restart/concurrency tests.

## Phase 8 — Functional onboarding experience

Primary task: ONB-010 / [#195](https://github.com/vokerg/chess_repertoir_trainer/issues/195), `PROPOSED`.

Blocked on lifecycle commands and Visual Transformation coordination.

Expected deliveries:

- Angular onboarding feature and typed client;
- welcome/account/recipe start;
- progress/readiness/recovery;
- Home start/resume and compact preparation card;
- navigation/cross-session re-entry;
- server-allowed controls;
- job-panel coexistence;
- focused browser/responsive/keyboard/screen-reader validation.

## Phase 9 — Read-only administration

Blocked on ONB-005 and stable preparation/import contracts.

Expected deliveries:

- administrator guard/capability;
- audit foundation;
- paginated users;
- account/import/job/preparation detail;
- game-state aggregates;
- read-only course inventory;
- stalled-work diagnostics.

## Phase 10 — Destructive lifecycle actions

Blocked on ONB-004 and read-only administration.

Order:

1. preview/idempotency/action status;
2. purge imported data while retaining account;
3. acknowledged account deletion;
4. un-analyse;
5. un-index/index reset;
6. whole-user deletion;
7. onboarding disposition/import coverage reconciliation;
8. large-data and active-worker race validation.

## Phase 11 — Shared-position maintenance

Blocked on ONB-006 and admin action foundation.

Expected deliveries:

- orphan dry-run;
- bounded manual cleanup;
- progress/cancel/audit;
- concurrency/performance validation;
- scheduling decision.

## Phase 12 — Release hardening and feedback

- privacy/data-control wording;
- onboarding milestone metrics;
- provider outage drills;
- import/game worker restart drills;
- disabled-analysis drills;
- large-account capacity validation;
- multi-account and older-history expansion;
- purge and explicit re-onboarding;
- admin runbook;
- final visual/accessibility acceptance with #133;
- downstream handoff to Repertoire Builder #105;
- native mobile follow-up decision.

## Parallelism rules

Safe research:

- ONB-003, ONB-004, and ONB-007 may run in parallel after collision review.
- ONB-005 may progress on auth/read models but not destructive actions before ONB-004.
- ONB-006 may progress on cleanup SQL/races but must align with ONB-005 action shape.

Safe implementation after dependencies:

- ONB-013 and ONB-014 can run in parallel after ONB-011/012.

Unsafe implementation:

- claim ONB-011 before ONB-002 acceptance;
- claim ONB-008 before ONB-003 settles the preparation persistence boundary;
- claim ONB-009 before durable import/preparation and ONB-008 exist;
- edit account-delete/reset behavior before ONB-004;
- onboarding route work during conflicting Visual Transformation route/layout changes;
- competing Prisma migrations for lifecycle/import models;
- separate changes to worker/import priorities without one owner;
- introduce a broker, second deployment, or generic workflow abstraction without new evidence.
