# Onboarding and Data Lifecycle Status

Last updated: 2026-07-28

## Program state

`RESEARCH_READY`

Program tracker: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

Foundation delivery: [PR #156](https://github.com/vokerg/chess_repertoir_trainer/pull/156), accepted for squash merge to `main`

Foundation report: `reports/ONB-000-2026-07-28-program-foundation.md`

## Completed in the foundation slice

- inspected current account import, provider services, job worker, processing, Prisma lifecycle, authentication, Angular account/job surfaces, course routes, deployment, Player Chess Profile documentation, Repertoire Builder coordination, and Visual Transformation master plan;
- created program issue #147 and research issues #148–#154;
- established the complete `north-star/onboarding/` planning workspace;
- wrote the foundation, master plan, roadmap, decisions, open questions, task queue, issue mapping, agent rules, task files, and completion report;
- documented functional ownership relative to Visual Transformation #133 and Repertoire Builder #105;
- identified recent-first durable import and progressive preparation as the critical path;
- separated lifecycle/admin/cleanup into an operator control-plane path;
- rejected source/client authority material, client-side processing, full-history-first, a replacement queue, and raw destructive table operations.

## Integrated foundation

ONB-000:

- accepted by the user;
- delivered through PR #156 for squash merge to `main`;
- task status `DONE`;
- no production implementation;
- no build/test gate required for documentation-only work;
- program tracker #147 remains open;
- research issues #148–#154 remain open.

## Ready queue

1. ONB-001 / #148 — lifecycle and default recipe.
2. ONB-002 / #149 — bounded import/backfill.
3. ONB-003 / #150 — progressive orchestration.
4. ONB-004 / #151 — destructive lifecycle invariants.
5. ONB-007 / #154 — throughput/progress.
6. ONB-005 / #152 — administrator architecture.
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
- no administrator authorization boundary exists;
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
- branch contents and task/issue mapping reconciled;
- PR #156 contains only onboarding planning documentation;
- no code, schema, migration, build, test, browser, provider, Stockfish, or deployment changes;
- no broad test suite run locally.

## Next deterministic action

Claim ONB-001 / #148 following `AGENTS.md`.

The plan is intentionally revisable through task reports, `DECISIONS.md`, `OPEN_QUESTIONS.md`, and roadmap reconciliation.
