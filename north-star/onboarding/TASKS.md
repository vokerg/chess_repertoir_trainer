# Onboarding and Data Lifecycle Task Queue

Last updated: 2026-07-28

This is the canonical ordered queue. IDs are immutable. GitHub Issues carry execution visibility; task files carry detailed scope, acceptance, and claim metadata.

| Order | ID | GitHub issue | Priority | Status | Task | Delivery class | Primary dependencies |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 0 | ONB-000 | [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147) | P0 | REVIEW | Establish program foundation and master plan | Research/planning | Current repo inspection |
| 10 | ONB-001 | [#148](https://github.com/vokerg/chess_repertoir_trainer/issues/148) | P0 | READY | Define onboarding lifecycle and default preparation recipe | Research | ONB-000 |
| 20 | ONB-002 | [#149](https://github.com/vokerg/chess_repertoir_trainer/issues/149) | P0 | READY | Design bounded recent-first import and historical backfill | Research | ONB-000 |
| 30 | ONB-003 | [#150](https://github.com/vokerg/chess_repertoir_trainer/issues/150) | P0 | READY | Design progressive indexing and analysis orchestration | Research | ONB-000; coordinates with ONB-001/002/007 |
| 40 | ONB-004 | [#151](https://github.com/vokerg/chess_repertoir_trainer/issues/151) | P0 | READY | Define safe purge, un-index, un-analyse, and user deletion invariants | Research | ONB-000 |
| 50 | ONB-007 | [#154](https://github.com/vokerg/chess_repertoir_trainer/issues/154) | P0 | READY | Benchmark preparation throughput and define truthful progress semantics | Research | ONB-000 |
| 60 | ONB-005 | [#152](https://github.com/vokerg/chess_repertoir_trainer/issues/152) | P1 | READY | Design administrator authentication, diagnostics, and action model | Research | ONB-000; mutation contract waits for ONB-004 |
| 70 | ONB-006 | [#153](https://github.com/vokerg/chess_repertoir_trainer/issues/153) | P1 | READY | Design database-only orphan shared-position cleanup | Research | ONB-000; coordinates with ONB-004/005 |

## Foundation review

ONB-000 is documented on `onb-000/issue-147-program-foundation` with:

- the program foundation and master plan;
- roadmap, decisions, open questions, status, and coordination rules;
- task records ONB-000 through ONB-007;
- report `reports/ONB-000-2026-07-28-program-foundation.md`;
- GitHub issues #147–#154.

No production implementation or pull request is included.

## Deterministic next task

ONB-001 / #148 is the first ordered READY task.

It owns the lifecycle and product contract that every onboarding API and UI decision must consume.

Parallel research is allowed after explicit collision review:

- ONB-002;
- ONB-003;
- ONB-004;
- ONB-007.

## Implementation backlog

Implementation IDs are not yet allocated. Do not create ad hoc issues from the illustrative list in `MASTER_PLAN.md`.

Each research completion must:

1. produce a report;
2. update decisions and open questions;
3. propose bounded implementation tasks;
4. coordinate immutable IDs and GitHub issues in one planning change;
5. reassess ordering and parallelism.

## Program tracker

[#147 — Onboarding and Data Lifecycle Program](https://github.com/vokerg/chess_repertoir_trainer/issues/147)
