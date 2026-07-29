# Onboarding and Data Lifecycle Status

Last updated: 2026-07-29

## Program state

`RESEARCH_IN_PROGRESS`

Program tracker: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

Foundation: ONB-000 squash-merged through [PR #156](https://github.com/vokerg/chess_repertoir_trainer/pull/156)

Current review: ONB-001 / [#148](https://github.com/vokerg/chess_repertoir_trainer/issues/148) through [PR #197](https://github.com/vokerg/chess_repertoir_trainer/pull/197)

Current report: `reports/ONB-001-2026-07-29-lifecycle-default-recipe.md`

## Completed foundation

- inspected current account import, provider services, job worker, processing, Prisma lifecycle, authentication, Angular account/job surfaces, course routes, deployment, Player Chess Profile documentation, Repertoire Builder coordination, and Visual Transformation planning;
- established the complete `north-star/onboarding/` planning workspace;
- created program issue #147 and research issues #148–#154;
- identified recent-first durable import and progressive preparation as the critical path;
- separated lifecycle/admin/cleanup into an operator control-plane path;
- rejected client-side processing, full-history-first, a replacement queue, and raw destructive table operations.

## ONB-001 review delivery

ONB-001 has produced a reviewable lifecycle and default-recipe contract:

- user disposition is persisted as `PENDING`, `COMPLETED`, or `SKIPPED`;
- accepted work is represented by repeatable user-owned `DataPreparationRun` records, with at most one non-terminal run per user;
- a run begins only after explicit recipe acceptance;
- default preparation uses one selected account, a fixed inclusive UTC date-only three-calendar-month range, standard blitz and rapid, rated and unrated, newest first;
- bounded import and terminal indexing with at least one indexing success form the core completion gate;
- analysis is requested progressively but does not block user onboarding completion;
- readiness is feature-specific and evidence-based;
- `/home` remains signed-in entry, `/onboarding` is resumable, direct protected navigation and login `returnUrl` are preserved;
- Home consumes one server-owned preparation projection;
- the global imported-game job panel remains the technical child-job surface;
- skip does not cancel accepted work;
- existing users are adopted as completed; new users begin pending;
- exact stages/counts are allowed, while ETA remains disabled before ONB-007.

## Allocated implementation backlog

- ONB-008 / [#193](https://github.com/vokerg/chess_repertoir_trainer/issues/193) — disposition and readiness projection — `PROPOSED`.
- ONB-009 / [#194](https://github.com/vokerg/chess_repertoir_trainer/issues/194) — lifecycle commands — `PROPOSED`.
- ONB-010 / [#195](https://github.com/vokerg/chess_repertoir_trainer/issues/195) — functional Angular onboarding and Home re-entry — `PROPOSED`.

These tasks must not be claimed until their listed research and implementation dependencies are resolved.

## Ready queue

1. ONB-002 / #149 — bounded import/backfill.
2. ONB-003 / #150 — progressive orchestration.
3. ONB-004 / #151 — destructive lifecycle invariants.
4. ONB-007 / #154 — throughput/progress.
5. ONB-005 / #152 — administrator architecture.
6. ONB-006 / #153 — orphan cleanup.

ONB-001 remains `REVIEW` until accepted and merged.

## Critical findings

- current first provider sync is synchronous and unbounded when the account has no cursor;
- current imported-game jobs are durable and should be reused;
- worker slice size is not the same thing as a visible onboarding wave;
- indexing is the required core-readiness stage and includes missing-opening assignment;
- analysis-backed value can arrive after onboarding completion;
- no-data, partial failure, and all-index-failed states require explicit server meanings;
- Home currently infers setup/recommendations and needs one authoritative lifecycle projection;
- full account deletion has useful cascade behavior, but reset/active-worker reconciliation remains unresolved;
- shared Position/PositionAnalysis retention is distinct from course MoveNode data;
- no administrator authorization boundary exists;
- throughput is not measured well enough for an ETA.

## Blockers to production implementation

- ONB-002 has not approved the account-level import request/checkpoint model;
- ONB-003 has not approved the physical preparation schema, child-run reconciliation, or pause/cancel mechanics;
- ONB-007 has not measured wave size, throughput, or ETA policy;
- ONB-004 has not approved destructive reset/purge reconciliation;
- Visual Transformation branch integration for ONB-010 remains unresolved.

## Validation

ONB-001 documentation-only research:

- repository files and related issues inspected directly through GitHub;
- stale claim branch reconciled onto current `main` before delivery;
- lifecycle, no-data, failure, recovery, skip, cancellation, restart, legacy-user, and expansion scenarios checked on paper;
- report, decisions, open questions, queue, task files, and implementation issue mapping reconciled;
- branch comparison confirmed documentation-only changes and no divergence from current `main`;
- no code, schema, migration, build, test, browser, provider, Stockfish, or deployment changes;
- no broad test suite run.

## Next deterministic action

Review PR #197 for ONB-001, while ONB-002 / #149 is the next claimable research task under the deterministic queue.

Future tasks must consume ONB-001’s locked lifecycle decisions rather than redefine them independently.