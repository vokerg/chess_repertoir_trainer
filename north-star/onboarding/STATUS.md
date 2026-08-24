# Onboarding and Data Lifecycle Status

Last updated: 2026-08-24

## Program state

`IMPLEMENTATION_IN_PROGRESS`

Program tracker: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

The durable import and preparation execution foundations are delivered. ONB-015 has implemented the account-sync cutover on PR #400 and is in `REVIEW`; product projection, lifecycle commands, destructive lifecycle work, and functional onboarding remain active program work.

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

Detailed historical validation is preserved in task files and append-only reports; this status file intentionally summarizes current program state.

## ONB-018 delivered boundary

ONB-018 provides the bounded PostgreSQL preparation reconciler, progressive committed-import handoff, persisted wake/lease fencing, bounded index/analysis admission, exact readiness milestones, restart-safe controls/retry, retention-safe child evidence, and aggregate stall telemetry without public ETA.

## ONB-015 review boundary

PR #400 now provides:

- normal account refresh as durable `202 Accepted` account-import admission with no provider traversal inside account HTTP requests;
- explicit bounded historical `/backfill`, while deprecated `/reset-cursor` remains legacy-field-only and is absent from normal UX;
- persisted Angular account-import status/control/reload restoration and concurrent refresh-all command submission;
- server-side bounded preparation handoff with no browser game-ID arrays and standard Blitz/Rapid preparation scope;
- explicit `ACCOUNT_REFRESH` source intent for cutover-created durable imports;
- provider-neutral rating and played-game activity reconciliation through short lifecycle-guarded commits using the database clock;
- bounded restart-safe post-completion reconciliation and compatibility sync-frontier ownership from surviving exact coverage;
- recovery rules that require Retry while failed/cancelled initial-refresh coverage remains incomplete, without allowing retained terminal history to poison an account after future purge removes that coverage;
- rating projection read-through that cannot recreate purged durable state after coverage removal and does not manufacture empty projection rows for accounts with no rating-relevant games;
- normal product deletion disabled while the legacy backend DELETE remains a temporary compatibility route pending ONB-020.

ONB-015 does not claim destructive execution. ONB-020 retains final account/game destructive coordination and final DELETE/reset compatibility cutover.

## Ready/review implementation

- **ONB-008 / #193 — disposition/readiness projection — READY** in the canonical documents pending its separate reconciliation track.
- **ONB-015 / #203 — account sync cutover/preparation handoff — REVIEW.** Runtime is on PR #400; destructive execution remains ONB-020-owned and ONB-025 stays blocked until ONB-015 acceptance/merge.
- **ONB-019 / #259 — destructive lifecycle persistence/fences/audit/provenance — READY.** A fresh Prisma/migration collision check remains mandatory before claim.

## Allocated but not ready

- ONB-009 / #194 — lifecycle commands — `PROPOSED`; depends on ONB-008 and must not duplicate destructive commands.
- ONB-010 / #195 — functional onboarding/Home re-entry — `PROPOSED`; depends on ONB-008/009 and ONB-016.
- ONB-020 / #260 — account/game destructive coordinator — `PROPOSED`; depends on ONB-019 and other task-file gates.
- ONB-021 / #261 — whole-user deletion/mobile purge — `PROPOSED`; depends on ONB-019/020 and mobile contracts.
- ONB-024 / #274 — administrator lifecycle controls — `PROPOSED`; depends on canonical lifecycle services and proven reverification.
- ONB-025 / #276 — stale-account refresh trigger — `PROPOSED`; depends on ONB-015 acceptance/merge.
- ONB-026 / #280 — orphan shared-position cleanup implementation — `PROPOSED`; depends on ONB-019 coordination and its other gates.

Only `READY` tasks may be newly claimed unless the user explicitly authorizes otherwise. Already claimed work may remain in `REVIEW` while its PR is validated and accepted.

## Current critical findings

- ONB-015 removes synchronous provider traversal from normal account refresh on PR #400; acceptance/merge is still pending.
- legacy cursor state remains a compatibility field, not exact durable coverage; bounded `/backfill` owns historical expansion.
- final destructive account/game execution and final legacy DELETE/reset cutover remain ONB-020-owned; normal account deletion is disabled in the ONB-015 Angular flow.
- terminal job status alone is not drain proof because a cancelled running task may retain `workKey` until executor acknowledgement.
- public ETA remains disabled because production-like telemetry eligibility is not established.
- shared-position cleanup remains separate from account/user purge.
- Visual Transformation coordination remains required for final product-wide UI polish.

## Canonical ownership

- ONB-008 owns user disposition, readiness/presentation projection, warnings/actions, and bounded reveals.
- ONB-009 owns authenticated preparation lifecycle command routes.
- ONB-015 owns normal account-sync cutover and preparation handoff.
- ONB-019/020/021 own destructive lifecycle persistence and execution.
- ONB-010 owns functional Angular onboarding/Home re-entry; Visual Transformation owns final visual/accessibility polish.

## Latest ONB-015 validation

The current runtime validation target is PR #400. Exact runtime head and CI evidence are recorded in the ONB-015 task and the latest self-review addendum once the full run is green; the final documentation-only reconciliation head is then validated separately before the PR is marked ready for review.

## Next deterministic action

ONB-008 / #193 remains the lowest-order task recorded as unclaimed `READY` in the canonical queue. ONB-015 / #203 is already claimed and in `REVIEW` on PR #400. ONB-019 / #259 remains `READY` on its parallel support path. Before any new claim, recheck live branches/PRs and relevant schema/file ownership.