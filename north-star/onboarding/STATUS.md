# Onboarding and Data Lifecycle Status

Last updated: 2026-08-17

## Program state

`IMPLEMENTATION_IN_PROGRESS`

Program tracker: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

The durable import and preparation execution foundations are now delivered. Product projection, lifecycle commands, account-sync cutover, destructive lifecycle work, and functional onboarding remain in the implementation backlog.

## Delivered foundations

- ONB-000 through ONB-007 — program, lifecycle, import, preparation, destructive-lifecycle, administration, cleanup, and throughput contracts are complete.
- ONB-016 / #224 — lightweight onboarding experience blueprint is complete through PR #225.
- ONB-017 / #253 — preparation persistence/admission runtime squash-merged through PR #282 as `885ef785bdac1b0c77cc500e3345745b0e723912`; completion records reconciled through PR #293.
- ONB-018 / #254 — preparation reconciliation/control runtime squash-merged through PR #385 as `9b0293271a2c1a9f24a77939e828c3ee1aca8ffd`; final reviewed head `4e3a3a4ea6f3f0f798d52e08830d051ad13c7b95` passed CI #2998 (`32041962372`); completion records are reconciled through PR #397.
- ONB-011 / #199 — durable account-import persistence/coverage delivered through PR #339 as `4c04d47dac40aa0ae254babbf65449b701b5c447`.
- ONB-012 / #200 — durable account-import API/worker lifecycle delivered through PR #352 as `640018e4cd3c5528a94b9d0217e971ab2a2215b7`; completion records through PR #354.
- ONB-013 / #201 — bounded Lichess adapter delivered through PR #357 as `e276e3820acbd8361feae99d8a0e15a9cf412e53`; completion records through PR #376.
- ONB-014 / #202 — bounded Chess.com adapter delivered through PR #356 as `b9c2038bfd20f7b0a493c2eda3dd6c2aed911ec5`; real low-volume canary passed workflow #2812; completion records through PR #383.
- ONB-022 / #272 — administrator authorization/read-only diagnostics delivered through PR #284; completion records through PR #298.
- ONB-023 / #273 — administrator Angular diagnostics delivered through PR #307; completion records through PR #312.

Detailed historical validation is preserved in task files and append-only reports; this status file intentionally summarizes only current program state.

## ONB-018 delivered boundary

ONB-018 now provides:

- a bounded PostgreSQL reconciler in the existing worker deployment with one-second active/five-second idle cadence;
- atomic due-parent claim and persisted wake/lease fencing;
- progressive committed-import-to-index admission plus separate bounded analysis waves;
- deterministic three-indexed first-analysis admission and one-game quiescent fallback;
- stage-specific multi-account fairness below direct-user job priority;
- exact first-imported, first-indexed, first-analysed, and core-ready milestones from current evidence;
- restart-safe pause, resume, cancel, and explicit failed-evidence retry semantics;
- retention-safe child snapshots and wake behavior;
- recoverable import-attention reconciliation and aggregate stall telemetry without public ETA;
- durable failed evidence for pre-engine analysis setup failures.

The final review made setup-failure persistence atomic: the owned game is locked, current evidence is rechecked, the terminal failed `GameAnalysisRun` is created, and the latest-analysis snapshot is updated in one PostgreSQL transaction. This prevents a split `RUNNING`/`FAILED` failure state.

## Ready implementation

- **ONB-008 / #193 — disposition/readiness projection — READY.** ONB-017/018 execution state and durable import/provider delivery are complete. This is the deterministic next task by canonical order.
- **ONB-015 / #203 — account sync cutover/preparation handoff — READY.** Provider adapters and preparation execution/control are complete. Destructive fences/execution remain owned by ONB-019/020.
- **ONB-019 / #259 — destructive lifecycle persistence/fences/audit/provenance — READY.** A fresh Prisma/migration collision check remains mandatory before claim.

## Allocated but not ready

- ONB-009 / #194 — lifecycle commands — `PROPOSED`; depends on ONB-008 and must not duplicate destructive commands.
- ONB-010 / #195 — functional onboarding/Home re-entry — `PROPOSED`; depends on ONB-008/009 and ONB-016.
- ONB-020 / #260 — account/game destructive coordinator — `PROPOSED`; depends on ONB-019 and other task-file gates.
- ONB-021 / #261 — whole-user deletion/mobile purge — `PROPOSED`; depends on ONB-019/020 and mobile contracts.
- ONB-024 / #274 — administrator lifecycle controls — `PROPOSED`; depends on canonical lifecycle services and proven reverification.
- ONB-025 / #276 — stale-account refresh trigger — `PROPOSED`; depends on ONB-015 cutover.
- ONB-026 / #280 — orphan shared-position cleanup implementation — `PROPOSED`; depends on ONB-019 coordination and its other gates.

Only `READY` tasks may be claimed unless the user explicitly authorizes otherwise.

## Current critical findings

- legacy account sync still performs synchronous provider traversal; ONB-015 owns removal/cutover;
- legacy cursor state is not exact coverage;
- current account workflow still carries candidate ID arrays through Angular; ONB-015 owns the bounded database handoff;
- terminal job status alone is not drain proof because a cancelled running task may retain `workKey` until executor acknowledgement;
- destructive lifecycle persistence/fences are not delivered until ONB-019;
- public ETA remains disabled because production-like telemetry eligibility is not established;
- shared-position cleanup remains separate from account/user purge;
- Visual Transformation coordination remains required for final product-wide UI polish.

## Canonical ownership after ONB-018

- ONB-008 owns user disposition, readiness/presentation projection, product warnings/actions, and bounded reveals.
- ONB-009 owns authenticated preparation lifecycle command routes.
- ONB-015 owns normal account-sync cutover and preparation handoff.
- ONB-019/020/021 own destructive lifecycle fences and execution.
- ONB-010 owns functional Angular onboarding/Home re-entry; Visual Transformation owns final visual/accessibility polish.

## Latest validation

ONB-018 final runtime head `4e3a3a4ea6f3f0f798d52e08830d051ad13c7b95` passed CI #2998 (`32041962372`) end-to-end: dependency audit, lint, full build, opening audits, architecture/hygiene guardrails, migrations, imported-game audits, and the complete repository test suite including the final PostgreSQL setup-failure atomicity regression.

Runtime PR #385 was rechecked against current `main`, had no unresolved review threads, and squash-merged as `9b0293271a2c1a9f24a77939e828c3ee1aca8ffd`.

Latest report: `reports/ONB-018-2026-08-17-completion-reconciliation.md`

## Next deterministic action

ONB-008 / #193 is the next unclaimed `READY` task by canonical order. ONB-015 / #203 and ONB-019 / #259 are also unclaimed `READY` on their integration/support paths. Before any claim, recheck live branches/PRs and relevant schema/file ownership.