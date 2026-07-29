# Onboarding and Data Lifecycle Roadmap

Last updated: 2026-07-29

Program: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

## Critical path

```text
ONB-001 lifecycle/default recipe — REVIEW
        +
ONB-002 durable bounded import/backfill
        +
ONB-003 progressive preparation orchestration
        +
ONB-007 throughput/progress evidence
        ↓
ONB-008 disposition/readiness persistence
        ↓
Durable import and preparation implementations
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

Status: `DONE` through squash-merged PR #156

Deliverables:

- canonical planning workspace;
- current-state inspection;
- master plan;
- initial decisions/open questions;
- agent execution rules;
- program issue and research issue mapping.

Exit complete:

- branch and documents integrated into `main`;
- #148–#154 mapped;
- no production implementation mixed into planning.

## Phase 1 — Research and contracts

### P0 critical path

- ONB-001 / #148 — lifecycle and default recipe — `REVIEW`.
- ONB-002 / #149 — recent-first import and backfill — `READY`.
- ONB-003 / #150 — progressive indexing/analysis orchestration — `READY`.
- ONB-004 / #151 — purge/reset/delete invariants — `READY`.
- ONB-007 / #154 — throughput and progress semantics — `READY`.

### P1 supporting

- ONB-005 / #152 — admin authentication and read/action model — `READY`.
- ONB-006 / #153 — orphan shared-position cleanup — `READY`.

### ONB-001 decisions available to consumers

- durable user disposition plus repeatable preparation runs;
- one selected-account first run;
- fixed three-calendar-month standard blitz/rapid recipe including rated and unrated games;
- import/index core-completion gate;
- analysis continues progressively after onboarding completion;
- feature-specific readiness;
- Home plus resumable `/onboarding`, without a global protected-route trap;
- skip distinct from pause/cancel;
- legacy users adopted as complete;
- exact progress without ETA.

Phase exit:

- lifecycle state machine approved;
- import modes and cursor invariants approved;
- preparation parent/wave model approved;
- performance budgets and wave policy measured;
- model-by-model destructive matrix approved;
- admin authorization and audit direction approved;
- cleanup query/concurrency direction approved;
- implementation tasks refined and moved from `PROPOSED` when dependencies are satisfied.

## Phase 2 — Durable recent-first import

Blocked on ONB-002 and relevant ONB-004 findings.

Expected deliveries:

1. import command/status contracts;
2. persistence/migration;
3. durable account-level worker claim/retry/cancel;
4. Lichess bounded initial import;
5. Chess.com bounded archive import;
6. normal forward sync compatibility;
7. historical backfill frontier;
8. provider and migration tests;
9. deployment/runbook updates.

Exit:

- the fixed three-calendar-month import returns after durable acceptance;
- work survives API/worker restart;
- exact progress is queryable;
- forward sync and backfill cannot corrupt one another;
- duplicate suppression and partial retry are verified;
- no recent games has a deterministic terminal representation.

## Phase 3 — Progressive preparation core

Blocked on ONB-001 approval, ONB-003, and ONB-007.

Expected deliveries:

1. preparation-run contract and schema;
2. server-side eligible game selection;
3. onboarding/system job source and priorities;
4. bounded index waves;
5. dependent analysis waves;
6. parent reconciliation;
7. pause/resume/cancel/retry;
8. restart/concurrency tests.

Exit:

- recent games become indexed progressively;
- analysis begins only for indexed games;
- exact partial/failure states are persisted;
- direct user jobs remain responsive;
- no client is required to advance the workflow;
- one-active-run invariant is verified.

## Phase 4 — Disposition and readiness projection

Primary task: ONB-008 / [#193](https://github.com/vokerg/chess_repertoir_trainer/issues/193), currently `PROPOSED`.

Blocked on ONB-002/003 persistence decisions.

Expected deliveries:

1. shared onboarding/readiness contracts;
2. user disposition and preparation persistence migration;
3. legacy-user adoption;
4. authenticated onboarding read endpoint;
5. stage, milestone, exact-count, warning, and feature-readiness projection;
6. ownership, migration, threshold, and concurrency tests.

Exit:

- every client can read one deterministic lifecycle/readiness contract;
- existing users are not retroactively trapped;
- job-history cleanup cannot erase onboarding disposition;
- readiness queries remain bounded and database-driven.

## Phase 5 — Lifecycle commands

Primary task: ONB-009 / [#194](https://github.com/vokerg/chess_repertoir_trainer/issues/194), currently `PROPOSED`.

Blocked on ONB-008 plus durable import/preparation implementations.

Expected deliveries:

1. start default recipe;
2. skip guidance;
3. pause/resume;
4. cancel with child-work acknowledgment;
5. retry failed/cancelled work;
6. explicit expansion;
7. core-ready completion transition;
8. idempotency, ownership, restart, and concurrency tests.

Exit:

- preparation is accepted and controlled through durable server commands;
- skip and cancel remain distinct;
- core completion does not wait for full analysis;
- no browser session is required to continue work.

## Phase 6 — Functional onboarding experience

Primary task: ONB-010 / [#195](https://github.com/vokerg/chess_repertoir_trainer/issues/195), currently `PROPOSED`.

Blocked on Phase 5 and coordination with Visual Transformation.

Expected deliveries:

1. Angular onboarding feature and typed API client;
2. welcome/account/recipe start;
3. progress/readiness/recovery;
4. Home start/resume and compact preparation card;
5. navigation and cross-session re-entry;
6. skip/pause/cancel/retry/expansion controls from server actions;
7. job-panel coexistence;
8. focused browser, responsive, keyboard, and screen-reader validation.

Exit:

- first-run flow works end to end;
- first value appears before full preparation completion;
- users can leave, navigate normally, and return;
- failure states are actionable;
- final presentation is ready for #133 polish.

## Phase 7 — Read-only administration

Blocked on ONB-005 and preparation/import contracts.

Expected deliveries:

1. administrator guard/capability;
2. admin audit foundation;
3. paginated user list;
4. user/account/import/job/preparation detail;
5. game-state aggregates;
6. read-only course inventory;
7. stalled-work diagnostics.

Exit:

- normal diagnosis no longer requires direct database inspection;
- normal users cannot access admin data;
- reads are bounded and database-aggregated.

## Phase 8 — Destructive lifecycle actions

Blocked on ONB-004 and read-only administration.

Order:

1. generic preview/idempotency/action status;
2. purge imported data while retaining account;
3. account deletion;
4. un-analyse;
5. un-index or combined index reset;
6. whole-user deletion;
7. onboarding-disposition reconciliation;
8. large-data and active-worker race validation.

Exit:

- every operation has exact semantics;
- active workers cannot write after success;
- every mutation is audited;
- retries are idempotent;
- operator sees retained and deleted data.

## Phase 9 — Shared-position maintenance

Blocked on ONB-006 and admin action foundation.

Expected deliveries:

1. orphan dry-run;
2. bounded manual cleanup;
3. progress/cancel/audit;
4. concurrency/performance validation;
5. decision on recurring schedule.

Exit:

- unreferenced shared positions can be reclaimed safely;
- course move trees are unaffected;
- automatic scheduling remains optional and evidence-based.

## Phase 10 — Release hardening and feedback

- privacy/data-control wording;
- onboarding milestone metrics;
- provider outage drills;
- worker restart and disabled-analysis drills;
- large-account capacity validation;
- multi-account and older-history expansion;
- purge and explicit re-onboarding;
- admin runbook;
- final visual/accessibility acceptance with #133;
- downstream handoff to Repertoire Builder #105;
- decide follow-up native mobile onboarding.

## Parallelism rules

Safe parallel research:

- ONB-002, ONB-003, ONB-004, and ONB-007 may run after claim collision review.
- ONB-005 can progress on auth/read-model questions but must not finalize mutation contracts before ONB-004.
- ONB-006 can progress on cleanup SQL/race research but must align its action shape with ONB-005.

Unsafe parallel implementation:

- claim ONB-008 before ONB-002/003 settle its persistence dependencies;
- claim ONB-009 before durable import/preparation implementations and ONB-008 exist;
- onboarding route work while Visual Transformation changes the same route/layout files without a base/stack plan;
- two tasks editing the same Prisma lifecycle models without an approved split;
- destructive endpoints before the lifecycle matrix;
- import and cursor migrations from competing designs;
- job priority changes from separate tasks without one owner.