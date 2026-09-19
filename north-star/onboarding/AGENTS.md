# Onboarding Program Agent Instructions

These instructions apply to `north-star/onboarding/` and program #147 in addition to the repository root `AGENTS.md`.

## 1. Read before work

Read:

- `README.md`;
- `FOUNDATION.md`;
- `MASTER_PLAN.md`;
- `ROADMAP.md`;
- `TASKS.md`;
- `DECISIONS.md`;
- `OPEN_QUESTIONS.md`;
- `GITHUB_ISSUES.md`;
- the claimed task file;
- current relevant source files;
- relevant active branches, issues, and PRs.

Repository paths in task files are inspection anchors, not proof that current architecture remains unchanged.

## 2. Task states

- `PROPOSED`
- `READY`
- `CLAIMED`
- `IN_PROGRESS`
- `BLOCKED`
- `REVIEW`
- `DONE`
- `SUPERSEDED`

Only `READY` tasks may be claimed unless the user explicitly authorizes a different action.

## 3. Claim protocol

Before substantive work:

1. verify dependencies and queue order;
2. inspect current repository implementation;
3. inspect related issue/branch/PR activity;
4. check file and decision collision with other ONB, Visual Transformation, and Repertoire Builder work;
5. create a task branch, never `main`;
6. update claim metadata in the task file;
7. comment on the mapped GitHub issue with claimant/session, scope, exclusions, and branch;
8. set task state to `CLAIMED` or `IN_PROGRESS`;
9. begin work.

Branch pattern:

```text
onb-<id>/issue-<number>-<slug>
```

Example:

```text
onb-002/issue-149-bounded-import-backfill
```

## 4. One task per branch

Prefer one ONB task per branch and PR.

A research task may update:

- its task file;
- one report;
- DECISIONS;
- OPEN_QUESTIONS;
- ROADMAP/TASKS/STATUS;
- closely related diagrams or prototypes.

It must not opportunistically implement another task.

## 5. Research standard

A research report must include:

- question and outcome;
- files actually inspected;
- current-state facts;
- alternatives;
- recommendation;
- rejected alternatives;
- schema/API/UX implications where relevant;
- migration/backward compatibility;
- security/privacy;
- failure/recovery;
- performance/operational impact;
- tests/validation plan;
- decisions changed;
- open questions remaining;
- proposed bounded implementation tasks;
- queue impact.

Do not mark research DONE because a plausible design was written. It must resolve its acceptance criteria and reconcile dependent documents.

## 6. Implementation architecture

Backend:

- use current feature-module patterns for new work;
- thin Fastify routes;
- typed contracts;
- application service orchestration;
- explicit Prisma repositories;
- no N+1 bulk design;
- database/server selection and processing;
- intentional migrations;
- preserve ownership and backward compatibility.

Jobs:

- reuse existing `JobRun`/`JobTask` for imported-game tasks;
- preserve active-game work fence;
- preserve cancellation/stale recovery;
- add origin/priority only through ONB-003 decisions;
- no external queue or generic workflow engine without a new approved task.

Import:

- never combine forward sync and backfill into one ambiguous cursor;
- no network I/O inside long database transactions;
- idempotent writes;
- bounded memory;
- resumable provider progress.

Frontend:

- standalone Angular;
- HTTP-only data-access services;
- state/store owns effects and polling integration;
- no chess processing or bulk lifecycle work in browser;
- use transformed shared primitives from the actual base branch;
- coordinate route/layout edits with #133;
- preserve existing URLs unless explicitly approved.

Admin:

- no hardcoded credential;
- server-side authorization;
- paginated/aggregated reads;
- audit and idempotency;
- no mutation before ONB-004 approval.

Destructive/cleanup:

- exact model matrix;
- preview;
- active-worker protocol;
- concurrency tests;
- no course MoveNode deletion in Position cleanup.

## 7. Parallel work and collisions

Before parallel work, record:

- files expected to change;
- decisions owned;
- dependencies consumed;
- branch base.

Stop and coordinate when two tasks would:

- change the same Prisma model/migration;
- define the same lifecycle state;
- change job sources/priorities;
- edit the same Angular route/layout;
- define destructive semantics;
- define admin action schema.

## 8. Validation

Run the narrowest relevant checks and report skipped checks.

Documentation-only work does not require broad code tests.

Implementation should include focused tests and the broad repository gates required by root instructions before review.

For race-sensitive work, unit tests alone are insufficient. Add integration/concurrency coverage.

## 9. Reports

Path:

```text
reports/ONB-###-YYYY-MM-DD-<slug>.md
```

Reports are append-only completion evidence. Correct factual mistakes with a follow-up note or reviewed update; do not silently erase historical decisions.

## 10. Completion

Before `REVIEW`:

- deliverable complete;
- acceptance criteria checked;
- validation recorded;
- task file updated;
- report exists;
- issue and PR linked;
- STATUS/ROADMAP/TASKS/DECISIONS/OPEN_QUESTIONS reassessed;
- follow-up task IDs/issues coordinated;
- residual risks explicit.

Before `DONE`:

- user/reviewer accepts work;
- required PR merged into the intended non-main/program base or main only with explicit instruction;
- final commit and report recorded;
- issue closed completed.

## 11. Release or transfer

When stopping without completion:

1. return task to READY or BLOCKED;
2. clear/update claim metadata;
3. comment on issue with completed work, branch, validation, and exact next step;
4. preserve useful partial report/commit;
5. do not leave a silent stale claim.
