# Onboarding and Data Lifecycle Roadmap

Last updated: 2026-07-30

Program: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

## Critical path

```text
ONB-001 lifecycle/default recipe — DONE
        +
ONB-002 durable bounded import/backfill — DONE
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
- ONB-002 / #149 — bounded import/backfill — `DONE` through PR #204.
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
