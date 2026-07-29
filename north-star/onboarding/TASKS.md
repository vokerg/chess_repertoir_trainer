# Onboarding and Data Lifecycle Task Queue

Last updated: 2026-07-29

This is the canonical ordered queue. IDs are immutable. GitHub Issues carry execution visibility; task files carry detailed scope, acceptance, and claim metadata.

| Order | ID | GitHub issue | Priority | Status | Task | Delivery class | Primary dependencies |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 0 | ONB-000 | [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147) | P0 | DONE | Establish program foundation and master plan | Research/planning | Squash-merged through PR #156 |
| 10 | ONB-001 | [#148](https://github.com/vokerg/chess_repertoir_trainer/issues/148) | P0 | DONE | Define onboarding lifecycle and default preparation recipe | Research | Squash-merged through PR #197 |
| 20 | ONB-002 | [#149](https://github.com/vokerg/chess_repertoir_trainer/issues/149) | P0 | IN_PROGRESS | Design bounded recent-first import and historical backfill | Research | ONB-000; consumes ONB-001 recipe |
| 30 | ONB-003 | [#150](https://github.com/vokerg/chess_repertoir_trainer/issues/150) | P0 | READY | Design progressive indexing and analysis orchestration | Research | ONB-000; consumes ONB-001; coordinates ONB-002/007 |
| 40 | ONB-004 | [#151](https://github.com/vokerg/chess_repertoir_trainer/issues/151) | P0 | READY | Define safe purge, un-index, un-analyse, and user deletion invariants | Research | ONB-000; consumes ONB-001 reset/disposition boundary |
| 50 | ONB-007 | [#154](https://github.com/vokerg/chess_repertoir_trainer/issues/154) | P0 | READY | Benchmark preparation throughput and define truthful progress semantics | Research | ONB-000; consumes ONB-001 no-ETA boundary |
| 60 | ONB-005 | [#152](https://github.com/vokerg/chess_repertoir_trainer/issues/152) | P1 | READY | Design administrator authentication, diagnostics, and action model | Research | ONB-000; mutation contract waits for ONB-004 |
| 70 | ONB-006 | [#153](https://github.com/vokerg/chess_repertoir_trainer/issues/153) | P1 | READY | Design database-only orphan shared-position cleanup | Research | ONB-000; coordinates ONB-004/005 |
| 80 | ONB-008 | [#193](https://github.com/vokerg/chess_repertoir_trainer/issues/193) | P0 | PROPOSED | Persist onboarding disposition and readiness projection | Implementation | ONB-001; blocked on ONB-002/003 persistence decisions |
| 90 | ONB-009 | [#194](https://github.com/vokerg/chess_repertoir_trainer/issues/194) | P0 | PROPOSED | Implement onboarding lifecycle commands | Implementation | ONB-001/002/003/007; ONB-008 |
| 100 | ONB-010 | [#195](https://github.com/vokerg/chess_repertoir_trainer/issues/195) | P1 | PROPOSED | Build functional onboarding and Home re-entry | Implementation | ONB-008/009; import/preparation implementations; Visual Transformation coordination |

## Completed foundation

ONB-000 was accepted and squash-merged through [PR #156](https://github.com/vokerg/chess_repertoir_trainer/pull/156).

Delivered:

- the program foundation and master plan;
- roadmap, decisions, open questions, status, and coordination rules;
- task records ONB-000 through ONB-007;
- report `reports/ONB-000-2026-07-28-program-foundation.md`;
- GitHub issues #147–#154.

## ONB-001 completion

ONB-001 was accepted and squash-merged through [PR #197](https://github.com/vokerg/chess_repertoir_trainer/pull/197) as `e0a56d7399c20f375ff9c3a7095002120d7d1cd5`.

It defines:

- user disposition and repeatable preparation-run boundaries;
- fixed three-calendar-month standard blitz/rapid default including rated and unrated games;
- import/index core-completion gate with analysis continuing progressively;
- feature-specific readiness;
- Home, `/onboarding`, Settings, job-panel, skip/cancel, legacy adoption, and no-ETA behavior;
- report `reports/ONB-001-2026-07-29-lifecycle-default-recipe.md`;
- bounded implementation tasks ONB-008 through ONB-010.

## Current task

ONB-002 / #149 is claimed on `onb-002/issue-149-bounded-import-backfill`.

It owns durable bounded provider import and backfill and must consume ONB-001’s fixed recipe/date/rated/no-data decisions.

Parallel research remains allowed after explicit collision review:

- ONB-003;
- ONB-004;
- ONB-007;
- ONB-005;
- ONB-006.

## Implementation backlog

ONB-008 through ONB-010 are allocated but remain `PROPOSED` until their dependencies are sufficiently resolved and integrated. Do not claim them early or fold them into research branches.

Each remaining research completion must:

1. produce a report;
2. update decisions and open questions;
3. refine or allocate bounded implementation tasks;
4. coordinate immutable IDs and GitHub issues in one planning change;
5. reassess ordering and parallelism.

## Program tracker

[#147 — Onboarding and Data Lifecycle Program](https://github.com/vokerg/chess_repertoir_trainer/issues/147)
