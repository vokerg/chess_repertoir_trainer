# Onboarding and Data Lifecycle Roadmap

Last updated: 2026-07-28

Program: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

## Critical path

```text
ONB-001 lifecycle/default recipe
        +
ONB-002 durable bounded import/backfill
        +
ONB-003 progressive preparation orchestration
        +
ONB-007 throughput/progress evidence
        ↓
Preparation contracts and implementation tasks
        ↓
Functional onboarding and Home integration
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

Exit:

- branch and documents exist;
- #148–#154 are mapped and remain open;
- no production implementation was mixed into planning;
- foundation is integrated into `main`.

## Phase 1 — Research and contracts

### P0 critical path

- ONB-001 / #148 — lifecycle and default recipe.
- ONB-002 / #149 — recent-first import and backfill.
- ONB-003 / #150 — progressive indexing/analysis orchestration.
- ONB-004 / #151 — purge/reset/delete invariants.
- ONB-007 / #154 — throughput and progress semantics.

### P1 supporting

- ONB-005 / #152 — admin authentication and read/action model.
- ONB-006 / #153 — orphan shared-position cleanup.

Exit:

- lifecycle state machine approved;
- import modes and cursor invariants approved;
- preparation parent/wave model approved;
- performance budgets and wave policy measured;
- model-by-model destructive matrix approved;
- admin authorization and audit direction approved;
- cleanup query/concurrency direction approved;
- implementation tasks opened with immutable ONB IDs.

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

- a three-month import returns immediately after acceptance;
- work survives API/worker restart;
- progress is queryable;
- forward sync and backfill cannot corrupt one another;
- duplicate suppression and partial retry are verified.

## Phase 3 — Progressive preparation core

Blocked on ONB-001, ONB-003, and ONB-007.

Expected deliveries:

1. preparation-run contract and schema;
2. server-side eligible game selection;
3. onboarding/system job source and priorities;
4. bounded index waves;
5. dependent analysis waves;
6. parent reconciliation;
7. readiness/milestone projection;
8. pause/resume/cancel/retry;
9. global job-store integration;
10. restart/concurrency tests.

Exit:

- recent games become indexed progressively;
- analysis begins only for indexed games;
- exact progress and partial states are visible;
- direct user jobs remain responsive;
- no client is required to advance the workflow.

## Phase 4 — Functional onboarding experience

Blocked on Phase 3 and coordination with Visual Transformation.

Expected deliveries:

1. onboarding Angular feature and typed API client;
2. welcome/account/recipe start;
3. progress/readiness/recovery;
4. Home continue/status card;
5. navigation and cross-session re-entry;
6. skip/pause/cancel;
7. scope expansion;
8. browser, responsive, keyboard, screen-reader, and reduced-motion validation with #133.

Exit:

- new-user flow works end to end;
- first value appears before full completion;
- user can leave and return;
- failure states are actionable;
- final presentation uses the transformed shared system.

## Phase 5 — Read-only administration

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

- operator support no longer requires direct database inspection for normal diagnosis;
- normal users cannot access admin data;
- reads are bounded and database-aggregated.

## Phase 6 — Destructive lifecycle actions

Blocked on ONB-004 and Phase 5.

Order:

1. generic preview/idempotency/action status;
2. purge imported data while retaining account;
3. account deletion;
4. un-analyse;
5. un-index or combined index reset;
6. whole-user deletion;
7. large-data and active-worker race validation.

Exit:

- every operation has exact semantics;
- active workers cannot write after success;
- every mutation is audited;
- retries are idempotent;
- operator sees retained and deleted data.

## Phase 7 — Shared-position maintenance

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

## Phase 8 — Release hardening and feedback

- privacy/data-control wording;
- onboarding milestone metrics;
- provider outage drills;
- worker restart and disabled-analysis drills;
- large-account capacity validation;
- multi-account expansion;
- purge and re-onboarding;
- admin runbook;
- visual/accessibility acceptance with #133;
- downstream handoff to Repertoire Builder #105;
- decide follow-up mobile-native onboarding.

## Parallelism rules

Safe parallel research:

- ONB-001, ONB-002, ONB-003, ONB-004, and ONB-007 may run in parallel after claim collision review.
- ONB-005 can progress on auth/read-model questions but must not finalize mutation contracts before ONB-004.
- ONB-006 can progress on cleanup SQL/race research but must align its action shape with ONB-005.

Unsafe parallel implementation:

- two tasks editing the same Prisma lifecycle models without an approved split;
- onboarding route work while Visual Transformation changes the same route/layout files without a base/stack plan;
- destructive endpoints before the lifecycle matrix;
- import and cursor migrations from competing designs;
- job priority changes from separate tasks without one owner.
