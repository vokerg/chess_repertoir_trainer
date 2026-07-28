# Onboarding and Data Lifecycle Status

Last updated: 2026-07-28

## Program state

`FOUNDATION_IN_PROGRESS`

Program tracker: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

Foundation branch: `onb-000/issue-147-program-foundation`

## Completed in the current foundation slice

- inspected current account import, provider services, job worker, processing, Prisma lifecycle, authentication, Angular account/job surfaces, course routes, deployment, Player Chess Profile documentation, Repertoire Builder coordination, and Visual Transformation master plan;
- created program issue #147;
- created research issues #148–#154;
- established the `north-star/onboarding/` planning workspace;
- documented functional ownership relative to Visual Transformation #133 and Repertoire Builder #105;
- identified recent-first import and durable preparation as the critical path;
- identified lifecycle/admin/cleanup as supporting operator work rather than onboarding-page concerns;
- rejected hardcoded administrator credentials and client-side processing.

## Active work

ONB-000 / #147:

- claimed in this session;
- branch created;
- planning documents being committed;
- no production implementation;
- no pull request opened;
- no merge requested.

## Ready queue

1. ONB-001 / #148 — lifecycle and default recipe.
2. ONB-002 / #149 — bounded import/backfill.
3. ONB-003 / #150 — progressive orchestration.
4. ONB-004 / #151 — destructive lifecycle invariants.
5. ONB-007 / #154 — throughput/progress.
6. ONB-005 / #152 — admin architecture.
7. ONB-006 / #153 — orphan cleanup.

## Critical findings

- current first provider sync is synchronous and unbounded when the account has no cursor;
- current imported-game jobs are durable and should be reused;
- worker slice size is not the same thing as a visible onboarding batch;
- indexing is the cheapest first-value stage and includes missing-opening assignment;
- analysis-backed value can arrive progressively;
- full account deletion already has useful cascade behavior;
- partial reset and active-worker safety are unresolved;
- shared Position/PositionAnalysis retention is distinct from course MoveNode data;
- no admin authorization boundary exists;
- throughput is not yet measured well enough for an ETA.

## Blockers to production implementation

- no approved onboarding state machine;
- no approved import-mode/cursor contract;
- no approved parent/wave orchestration;
- no benchmarked wave/throughput policy;
- no destructive model matrix;
- no administrator authorization/audit contract;
- unresolved visual branch integration details.

## Validation

Documentation-only foundation:

- repository files inspected directly through GitHub;
- existing open issues searched for overlap;
- no code, schema, migration, build, test, or deployment changes;
- no broad test suite run.

## Next deterministic action

Claim ONB-001 / #148 following `AGENTS.md`.
