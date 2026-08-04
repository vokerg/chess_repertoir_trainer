# Onboarding and Data Lifecycle Task Queue

Last updated: 2026-08-04

This is the canonical ordered queue. IDs are immutable. GitHub Issues carry execution visibility; task files carry detailed scope, acceptance, and claim metadata.

| Order | ID | GitHub issue | Priority | Status | Task | Delivery class | Primary dependencies |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 0 | ONB-000 | [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147) | P0 | DONE | Establish program foundation and master plan | Research/planning | Squash-merged through PR #156 |
| 10 | ONB-001 | [#148](https://github.com/vokerg/chess_repertoir_trainer/issues/148) | P0 | DONE | Define onboarding lifecycle and default preparation recipe | Research | Squash-merged through PR #197 |
| 20 | ONB-002 | [#149](https://github.com/vokerg/chess_repertoir_trainer/issues/149) | P0 | DONE | Design bounded recent-first import and historical backfill | Research | Squash-merged through PR #204 |
| 30 | ONB-003 | [#150](https://github.com/vokerg/chess_repertoir_trainer/issues/150) | P0 | DONE | Design progressive indexing and analysis orchestration | Research | Squash-merged through PR #256 as `d41f75c` |
| 40 | ONB-004 | [#151](https://github.com/vokerg/chess_repertoir_trainer/issues/151) | P0 | DONE | Define safe purge, un-index, un-analyse, and user deletion invariants | Research | Squash-merged through PR #263 as `32db655` |
| 50 | ONB-007 | [#154](https://github.com/vokerg/chess_repertoir_trainer/issues/154) | P0 | DONE | Benchmark preparation throughput and define truthful progress semantics | Research | Squash-merged through PR #266 as `d631382` after corrected benchmark evidence and three self-review rounds |
| 60 | ONB-005 | [#152](https://github.com/vokerg/chess_repertoir_trainer/issues/152) | P1 | DONE | Design administrator authentication, diagnostics, and action model | Research | Squash-merged through PR #275 after three self-review rounds |
| 70 | ONB-006 | [#153](https://github.com/vokerg/chess_repertoir_trainer/issues/153) | P1 | DONE | Design database-only orphan shared-position cleanup | Research | Squash-merged through PR #281 after two adversarial self-review rounds; allocated ONB-026/#280 |
| 75 | ONB-016 | [#224](https://github.com/vokerg/chess_repertoir_trainer/issues/224) | P1 | DONE | Define lightweight onboarding product and experience blueprint | Research/product design | Squash-merged through PR #225 as `b485b9b`; informs ONB-008/009/010 and VT-302 |
| 77 | ONB-017 | [#253](https://github.com/vokerg/chess_repertoir_trainer/issues/253) | P0 | IN_PROGRESS | Persist preparation execution boundary and bounded child-job batches | Implementation | Core implementation squash-merged through PR #282; issue #253 and completion records remain open |
| 78 | ONB-018 | [#254](https://github.com/vokerg/chess_repertoir_trainer/issues/254) | P0 | PROPOSED | Implement progressive preparation reconciliation and control | Implementation | ONB-003/007/017; ONB-011/012/015 |
| 80 | ONB-008 | [#193](https://github.com/vokerg/chess_repertoir_trainer/issues/193) | P0 | PROPOSED | Persist onboarding disposition and readiness projection | Implementation | ONB-001/007; ONB-017/018 execution state; consumes ONB-016 presentation requirements |
| 90 | ONB-009 | [#194](https://github.com/vokerg/chess_repertoir_trainer/issues/194) | P0 | PROPOSED | Implement onboarding lifecycle commands | Implementation | ONB-001/002/007/008/017/018; destructive commands remain ONB-019/020/021-owned |
| 100 | ONB-010 | [#195](https://github.com/vokerg/chess_repertoir_trainer/issues/195) | P1 | PROPOSED | Build functional onboarding and Home re-entry | Implementation | ONB-007/008/009; durable import/preparation; ONB-016; Visual Transformation coordination |
| 110 | ONB-011 | [#199](https://github.com/vokerg/chess_repertoir_trainer/issues/199) | P0 | PROPOSED | Persist durable account-import runs and scope coverage | Implementation | ONB-002/007; coordinates ONB-004/017/019 schema and lifecycle boundaries |
| 120 | ONB-012 | [#200](https://github.com/vokerg/chess_repertoir_trainer/issues/200) | P0 | PROPOSED | Build durable account-import worker and API lifecycle | Implementation | ONB-007/011; consumes ONB-004 fence/drain contract |
| 130 | ONB-013 | [#201](https://github.com/vokerg/chess_repertoir_trainer/issues/201) | P0 | PROPOSED | Implement bounded Lichess import adapter | Implementation | ONB-007/011/012 |
| 140 | ONB-014 | [#202](https://github.com/vokerg/chess_repertoir_trainer/issues/202) | P0 | PROPOSED | Implement bounded Chess.com import adapter | Implementation | ONB-007/011/012 |
| 150 | ONB-015 | [#203](https://github.com/vokerg/chess_repertoir_trainer/issues/203) | P1 | PROPOSED | Cut over account sync and preparation handoff | Implementation | ONB-013/014; ONB-003/004/007/017/018; coordinates ONB-009/010/020 |
| 160 | ONB-019 | [#259](https://github.com/vokerg/chess_repertoir_trainer/issues/259) | P0 | PROPOSED | Persist destructive lifecycle operations, fences, audit, and provenance | Implementation | ONB-004 complete; coordinates schema with ONB-011/017 and audit/actor policy with ONB-005/022 |
| 170 | ONB-020 | [#260](https://github.com/vokerg/chess_repertoir_trainer/issues/260) | P0 | PROPOSED | Implement account and imported-game destructive lifecycle coordinator | Implementation | ONB-004/007/019; ONB-011/012/015/017/018; admin exposure remains ONB-024-owned |
| 180 | ONB-021 | [#261](https://github.com/vokerg/chess_repertoir_trainer/issues/261) | P0 | PROPOSED | Implement whole-user deletion and mobile purge handshake | Implementation | ONB-004/007/019/020; mobile offline sync contracts; admin execution deferred by ONB-005 |
| 185 | ONB-026 | [#280](https://github.com/vokerg/chess_repertoir_trainer/issues/280) | P1 | PROPOSED | Implement bounded orphan shared-position cleanup | Implementation | ONB-006/007; trigger/schema coordination with ONB-011/017/019; canonical service may later be exposed by ONB-024 |
| 190 | ONB-022 | [#272](https://github.com/vokerg/chess_repertoir_trainer/issues/272) | P1 | READY | Build administrator authorization and read-only diagnostics foundation | Implementation | ONB-005 complete; consumes ONB-007 warnings; coordinates actor-key boundary with ONB-019 |
| 200 | ONB-023 | [#273](https://github.com/vokerg/chess_repertoir_trainer/issues/273) | P2 | PROPOSED | Build administrator diagnostics Angular feature | Implementation | ONB-022; Visual Transformation coordination |
| 210 | ONB-024 | [#274](https://github.com/vokerg/chess_repertoir_trainer/issues/274) | P1 | PROPOSED | Add administrator lifecycle previews and controls | Implementation | ONB-022/023; ONB-019 plus applicable ONB-020/021; ONB-026 for cleanup exposure |

ONB-025 / #276 remains reserved by open PR #279. ONB-026 is the next free immutable identifier and does not supersede that active allocation.

## Completed planning

ONB-000 established the program through squash-merged PR #156.

ONB-001 established the lifecycle/default recipe through squash-merged PR #197 and allocated ONB-008 through ONB-010.

ONB-002 established bounded import/backfill contracts through squash-merged PR #204 and allocated ONB-011 through ONB-015.

ONB-003 established progressive preparation orchestration through squash-merged PR #256 and allocated ONB-017/018.

ONB-016 established the canonical lightweight experience blueprint through squash-merged PR #225 as `b485b9b2992e1152c1810c91d40cc5150d39284d`.

ONB-004 established destructive lifecycle invariants through squash-merged PR #263 as `32db655a100ef1a55264b4d3739e2b7c38e72ee4` and allocated ONB-019/020/021.

ONB-007 established throughput evidence, conservative preparation/import defaults, truthful progress semantics, and implementation validation gates through squash-merged PR #266 as `d6313823bd7da36991972a804f59d47d77578bdf`.

## ONB-005 completed delivery

ONB-005 defines:

- normal Clerk authentication as the sole production login boundary;
- a disabled-by-default server-only administrator authorization policy;
- exact Clerk-subject allowlist bootstrap behind a replaceable capability interface;
- no shared secret, email allowlist, `AppUser.isAdmin`, client role, separate login, impersonation, or Clerk Organizations solely for global operators;
- a minimal verified session context that retains signed session/factor/reverification evidence without exposing raw claims to features;
- migration-free cursor-paginated aggregate diagnostics with strict sensitive-field exclusions;
- exact row-count footprint rather than untrustworthy per-user byte estimates;
- a lazy direct-link Angular route with no required normal-navigation item;
- signed `fva` plus one-use request-bound `reverification_id` for destructive administrator execution, with execution disabled until the pinned Clerk flow is proven;
- configurable 30-day read-access log and 365-day mutation-audit operational defaults plus domain-separated HMAC key-version retention;
- administrator whole-user deletion deferred pending a separate support/recovery policy decision;
- topology-aware request-budget enforcement that does not overclaim an in-process limiter as distributed protection;
- implementation tasks ONB-022/#272, ONB-023/#273, and ONB-024/#274 appended after the existing planned backlog so administration support work does not pre-empt the product critical path;
- report `reports/ONB-005-2026-08-04-admin-auth-diagnostics-actions.md` and three self-review addenda.

Completed through squash-merged PR #275 after final canonical reconciliation and three adversarial self-review rounds. ONB-022 is promoted to `READY`; ONB-023/024 remain `PROPOSED` behind their dependencies.

## ONB-006 completed delivery

ONB-006 defines:

- zero `ImportedGamePly` references as the exact database orphan predicate;
- explicit exclusion of course `MoveNode` trees;
- `PositionAnalysis` and `MastersExplorerCache` as dependent cascades;
- a durable first-observed candidate ledger and 30-day initial grace;
- PostgreSQL statement triggers that reset grace on every ply-reference insert/update;
- input-page-bounded reconcile, observe, dry-run, and delete phases ordered by id;
- short plies-first fixed-order database locking plus final predicate recheck and FK restriction;
- observational bounded dry-run semantics rather than a point-in-time snapshot claim;
- exact phase/upper-bound/checkpoint/inspected/matched/deleted progress with no ETA or bytes;
- a manual server-side command over the canonical service, disabled by default, with no schedule;
- reports `reports/ONB-006-2026-08-04-orphan-shared-position-cleanup.md`, `reports/ONB-006-2026-08-04-self-review-addendum.md`, and `reports/ONB-006-2026-08-04-second-self-review-addendum.md`;
- implementation task ONB-026 / #280.

Completed through squash-merged PR #281 after two adversarial self-review rounds.

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

## ONB-003 completed delivery

ONB-003 defines:

- `DataPreparationRun` plus ordered account targets and retained child-job batches;
- separate bounded index and analysis child runs;
- PostgreSQL server-side candidate selection and atomic batch/job creation;
- per-run and globally serialized admission bounds;
- committed-import pipelining with exact terminal core-readiness gates;
- deterministic first-analysis and stage-specific multi-account fairness;
- acknowledged pause/cancel and evidence-based readiness;
- reports `reports/ONB-003-2026-08-01-progressive-preparation-orchestration.md` and `reports/ONB-003-2026-08-01-self-review-addendum.md`;
- implementation tasks ONB-017/018.

## ONB-004 completed delivery

ONB-004 defines:

- separate un-analyse, un-index, account purge, account delete, and whole-user delete actions;
- un-index always includes un-analysis;
- persisted destructive operations, preview/idempotency/audit, and user/account/game write fences;
- acknowledged preparation/import/job drain, including zero active task work keys before destructive writes;
- commit-side guards for synchronous writers and auth resolution;
- pre-mutation-only terminal cancellation and durable fence retention after partial execution;
- bounded forward-only phases rather than one large transaction;
- shared Position/PositionAnalysis/cache retention and separate ONB-006 cleanup;
- tag recomputation, AI-review removal, all-version tactical reset, feedback/scenario retention rules;
- source-preserving deletion of copied scenario data before SetNull cascades;
- provider/local/legacy opening provenance;
- account purge/delete and OAuth-connection boundaries;
- whole-user OAuth-state/token cleanup, tombstone ordering, post-delete receipt lookup, and mobile local-purge handshake;
- reports `reports/ONB-004-2026-08-02-destructive-lifecycle-invariants.md`, `reports/ONB-004-2026-08-02-self-review-addendum.md`, and `reports/ONB-004-2026-08-02-second-self-review-addendum.md`;
- implementation tasks ONB-019/#259, ONB-020/#260, and ONB-021/#261.

## ONB-007 completed delivery

ONB-007 defines and validates:

- a safe disposable-database benchmark harness over current production services and the real child worker;
- synthetic 10/50/200-game scale profiles and deterministic legal 16/40/80-ply length profiles;
- depth-12 WASM first-position, per-game, combined-process, and actual worker-wave measurements;
- index/first-analysis/tail defaults of 50/3/10 games;
- global preparation limits of four non-terminal batches, 200 queued tasks, and 40 queued analysis tasks;
- one-second active/five-second idle preparation reconciliation with persisted immediate wake hints;
- serial provider access, initial 14-day Lichess windows, Chess.com calendar-month units, and 100-row database writes;
- one active import executor with 1-second poll, 15-second heartbeat, 2-minute stale, and 30-second recovery defaults;
- exact-count/fixed-denominator progress and no public ETA in the initial release;
- future ETA telemetry eligibility gates, internal first-value budgets, stall thresholds, scaling triggers, and operation transaction budgets;
- report `reports/ONB-007-2026-08-03-throughput-progress-benchmarks.md`;
- original evidence `reports/artifacts/ONB-007-2026-08-03-ci-benchmark-summary.json`;
- corrected provider-timing evidence `reports/artifacts/ONB-007-2026-08-04-ci-benchmark-summary.json`;
- self-review addenda `reports/ONB-007-2026-08-03-self-review-addendum.md` and `reports/ONB-007-2026-08-04-third-self-review-addendum.md`;
- reusable harness `apps/api/benchmarks/onboarding-throughput-safe.mjs`.

Completed through squash-merged PR #266 as `d6313823bd7da36991972a804f59d47d77578bdf`.

## ONB-016 completed delivery

ONB-016 defines the route-based lightweight first-value experience, progressive evidence reveals, optional personal tactics/Builder continuations, and the synthetic prototype-to-Angular handoff. It remains accepted through PR #225.

## Deterministic next task

ONB-022 / #272 is the next unclaimed `READY` task by canonical order, subject to current authentication, deployment-topology, and ONB-019 actor-key collision review.

Active work:

- ONB-017 / #253 remains `IN_PROGRESS`; PR #282 merged the execution-boundary slice, while issue #253 and task completion records remain open.

ONB-026 / #280 remains `PROPOSED` until its task-file promotion gates are met. ONB-025 / #276 remains reserved by open PR #279. ONB-023/024, ONB-018, ONB-008 through ONB-015, and ONB-019 through ONB-021 remain governed by their listed dependencies.

## Implementation backlog rule

Only `READY` implementation tasks may be claimed. All Prisma/schema/migration tasks must check current activity for ONB-011, ONB-017, and ONB-019 before branching. Do not fold destructive implementation into research branches or duplicate lifecycle logic in administration routes.

Each remaining research completion must:

1. produce a report;
2. update decisions and open questions;
3. refine or allocate bounded implementation tasks;
4. coordinate immutable IDs and GitHub issues in one planning change;
5. reassess ordering and parallelism.

## Program tracker

[#147 — Onboarding and Data Lifecycle Program](https://github.com/vokerg/chess_repertoir_trainer/issues/147)
