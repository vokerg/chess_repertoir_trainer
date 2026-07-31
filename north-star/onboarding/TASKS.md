# Onboarding and Data Lifecycle Task Queue

Last updated: 2026-07-30

This is the canonical ordered queue. IDs are immutable. GitHub Issues carry execution visibility; task files carry detailed scope, acceptance, and claim metadata.

| Order | ID | GitHub issue | Priority | Status | Task | Delivery class | Primary dependencies |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 0 | ONB-000 | [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147) | P0 | DONE | Establish program foundation and master plan | Research/planning | Squash-merged through PR #156 |
| 10 | ONB-001 | [#148](https://github.com/vokerg/chess_repertoir_trainer/issues/148) | P0 | DONE | Define onboarding lifecycle and default preparation recipe | Research | Squash-merged through PR #197 |
| 20 | ONB-002 | [#149](https://github.com/vokerg/chess_repertoir_trainer/issues/149) | P0 | DONE | Design bounded recent-first import and historical backfill | Research | Squash-merged through PR #204 |
| 30 | ONB-003 | [#150](https://github.com/vokerg/chess_repertoir_trainer/issues/150) | P0 | READY | Design progressive indexing and analysis orchestration | Research | ONB-000/001; consumes ONB-002 handoff; coordinates ONB-007 |
| 40 | ONB-004 | [#151](https://github.com/vokerg/chess_repertoir_trainer/issues/151) | P0 | READY | Define safe purge, un-index, un-analyse, and user deletion invariants | Research | ONB-000/001; consumes ONB-002 active-import boundary |
| 50 | ONB-007 | [#154](https://github.com/vokerg/chess_repertoir_trainer/issues/154) | P0 | READY | Benchmark preparation throughput and define truthful progress semantics | Research | ONB-000/001; consumes ONB-002 sizing handoff |
| 60 | ONB-005 | [#152](https://github.com/vokerg/chess_repertoir_trainer/issues/152) | P1 | READY | Design administrator authentication, diagnostics, and action model | Research | ONB-000; mutation contract waits for ONB-004 |
| 70 | ONB-006 | [#153](https://github.com/vokerg/chess_repertoir_trainer/issues/153) | P1 | READY | Design database-only orphan shared-position cleanup | Research | ONB-000; coordinates ONB-004/005 |
| 75 | ONB-016 | [#224](https://github.com/vokerg/chess_repertoir_trainer/issues/224) | P1 | REVIEW | Define lightweight onboarding product and experience blueprint | Research/product design | ONB-001/002; explicitly authorized parallel work; informs ONB-008/009/010 and VT-302 |
| 80 | ONB-008 | [#193](https://github.com/vokerg/chess_repertoir_trainer/issues/193) | P0 | PROPOSED | Persist onboarding disposition and readiness projection | Implementation | ONB-001; blocked on ONB-003 physical preparation decisions; consumes ONB-016 presentation requirements |
| 90 | ONB-009 | [#194](https://github.com/vokerg/chess_repertoir_trainer/issues/194) | P0 | PROPOSED | Implement onboarding lifecycle commands | Implementation | ONB-001/002/003/007; ONB-008; consumes ONB-016 expansion/action requirements |
| 100 | ONB-010 | [#195](https://github.com/vokerg/chess_repertoir_trainer/issues/195) | P1 | PROPOSED | Build functional onboarding and Home re-entry | Implementation | ONB-008/009; durable import/preparation; ONB-016; Visual Transformation coordination |
| 110 | ONB-011 | [#199](https://github.com/vokerg/chess_repertoir_trainer/issues/199) | P0 | PROPOSED | Persist durable account-import runs and scope coverage | Implementation | ONB-002; coordinates ONB-004 |
| 120 | ONB-012 | [#200](https://github.com/vokerg/chess_repertoir_trainer/issues/200) | P0 | PROPOSED | Build durable account-import worker and API lifecycle | Implementation | ONB-011; consumes ONB-007 defaults |
| 130 | ONB-013 | [#201](https://github.com/vokerg/chess_repertoir_trainer/issues/201) | P0 | PROPOSED | Implement bounded Lichess import adapter | Implementation | ONB-011/012; ONB-007 sizing |
| 140 | ONB-014 | [#202](https://github.com/vokerg/chess_repertoir_trainer/issues/202) | P0 | PROPOSED | Implement bounded Chess.com import adapter | Implementation | ONB-011/012; ONB-007 sizing |
| 150 | ONB-015 | [#203](https://github.com/vokerg/chess_repertoir_trainer/issues/203) | P1 | PROPOSED | Cut over account sync and preparation handoff | Implementation | ONB-013/014; ONB-003/004; coordinates ONB-009/010 |

## Completed planning

ONB-000 established the program through squash-merged PR #156.

ONB-001 established the lifecycle/default recipe through squash-merged PR #197 and allocated ONB-008 through ONB-010.

ONB-002 established bounded import/backfill contracts through squash-merged PR #204 and allocated ONB-011 through ONB-015.

ONB-016 has completed its research deliverables on draft PR #225 and is awaiting review/acceptance. It adds the canonical `EXPERIENCE_BLUEPRINT.md`, refines ONB-010, and maps implementation implications to existing owners rather than creating premature runtime tasks.

## ONB-002 completed delivery

ONB-002 defines:

- extended `ImportRun` plus exact `AccountImportCoverage`;
- immutable half-open UTC ranges and canonical scope hashes;
- distinct initial, forward, and historical-backfill modes;
- one non-terminal import per account;
- a separate account-import claim loop in the existing worker deployment;
- replayable provider windows and no coverage advancement across failures;
- exact empty-window coverage;
- bounded duplicate-safe persistence;
- database-based preparation handoff with no ID arrays;
- conservative legacy-cursor migration and explicit backfill;
- report `reports/ONB-002-2026-07-29-bounded-import-backfill.md`;
- implementation tasks ONB-011 through ONB-015.

## ONB-016 review delivery

ONB-016 defines:

- one dominant action per focused onboarding surface;
- a route-based resumable flow instead of a blocking modal train;
- no first-run tables or account-settings action clusters;
- one-account first value followed by optional multi-account expansion;
- persisted milestones instead of fabricated progress;
- import-only, indexed, and analysed reveal stages;
- bounded evidence-labelled insight cards using canonical calculations;
- optional personal tactical and Repertoire Builder continuations;
- a synthetic-data ChatGPT Sites/Codex/Figma prototype-to-Angular workflow;
- report `reports/ONB-016-2026-07-30-lightweight-onboarding-experience-blueprint.md`;
- draft PR #225.

## Deterministic next task

ONB-003 / #150 remains the lowest-order READY task after ONB-002 completion.

It owns the preparation parent, bounded index/analysis waves, import-progress reconciliation, first-analysis lane, and the choice of batch-versus-window pipelining.

Parallel research remains allowed after explicit collision review:

- ONB-004;
- ONB-007;
- ONB-005;
- ONB-006.

ONB-016 is already in review and does not replace the deterministic next task.

## Implementation backlog rule

ONB-008 through ONB-015 are allocated but remain `PROPOSED` until their listed dependencies are sufficiently resolved and accepted. Do not claim them early or fold them into research branches.

Each remaining research completion must:

1. produce a report;
2. update decisions and open questions;
3. refine or allocate bounded implementation tasks;
4. coordinate immutable IDs and GitHub issues in one planning change;
5. reassess ordering and parallelism.

## Program tracker

[#147 — Onboarding and Data Lifecycle Program](https://github.com/vokerg/chess_repertoir_trainer/issues/147)
