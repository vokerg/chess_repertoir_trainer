# Onboarding and Data Lifecycle Status

Last updated: 2026-08-26

## Program state

`IMPLEMENTATION_IN_PROGRESS`

Program tracker: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

The durable account-import, provider, preparation, onboarding-readiness, account-sync cutover, and destructive-lifecycle persistence foundations are delivered. Remaining implementation is concentrated in onboarding lifecycle/UI, destructive execution, opportunistic stale refresh, whole-user deletion, administrator mutation adapters, and shared-position cleanup.

## Delivered foundations

- ONB-000 through ONB-007 — program, product lifecycle, import/backfill, preparation orchestration, destructive-lifecycle, administration, cleanup, and throughput contracts.
- ONB-016 / #224 — lightweight onboarding experience blueprint.
- ONB-017 / #253 — preparation execution persistence/admission.
- ONB-018 / #254 — preparation reconciliation/control.
- ONB-011 / #199 through ONB-014 / #202 — durable account-import persistence/API/worker plus bounded Lichess and Chess.com adapters.
- **ONB-008 / #193 — DONE.** Server-owned onboarding disposition/readiness projection delivered through PR #398, squash `512c248689f41a1164be3da63dc22cc97041614b`.
- **ONB-015 / #203 — DONE.** Normal account sync cut over to durable imports through PR #400, squash `c89442fbe8945854f0d6d7545e947beb7bebccfe`.
- **ONB-019 / #259 — DONE.** Destructive lifecycle persistence/fence/audit/provenance foundation delivered through PR #386, squash `d9175c5d60448399b7297393afc55db747717ce2`.
- ONB-022 / #272 and ONB-023 / #273 — administrator authorization/read-only diagnostics and Angular diagnostics.

Detailed historical validation remains in task files and append-only reports. The 2026-08-26 completion records reconcile the previously stale ONB-008/015/019 repository state with their already-merged runtime PRs and closed-completed issues.

## Ready implementation

- **ONB-009 / #194 — READY.** Authenticated onboarding start/pause/resume/cancel/retry/restart/expansion commands over delivered import/preparation/readiness state. Lowest-order unclaimed ready task.
- **ONB-025 / #276 — READY.** Opportunistic stale-account refresh on authenticated application bootstrap over the delivered durable refresh path; recheck ONB-010/020 integration surfaces before claim.
- **ONB-020 / #260 — READY.** Account/game destructive coordinator over delivered ONB-019 fences/operations and the completed account-import/preparation stack.
- **ONB-026 / #280 — READY.** Bounded shared-position cleanup; claim-time schema/migration ownership and deployed PostgreSQL transition-relation compatibility checks remain mandatory.

## Allocated but not ready

- ONB-010 / #195 — `PROPOSED`; depends on ONB-009 for the functional onboarding/Home command surface.
- ONB-021 / #261 — `PROPOSED`; depends on ONB-020 for account/game destructive execution before whole-user/mobile purge.
- ONB-024 / #274 — `PROPOSED`; depends on applicable canonical lifecycle/cleanup services and proven signed reverification.

## Current critical boundaries

- Normal account refresh no longer performs provider traversal inside the account HTTP request. Durable `ACCOUNT_REFRESH` import runs and persisted projections are authoritative.
- Historical expansion uses bounded durable backfill. Deprecated raw cursor reset remains only a compatibility field-reset route until ONB-020 performs the final destructive/compatibility cutover.
- Normal product account deletion remains disabled until ONB-020 replaces the legacy immediate backend DELETE with the canonical fenced coordinator.
- ONB-019 provides lifecycle fences and guarded-commit primitives; it does not itself execute destructive row phases.
- Terminal job status alone is not drain proof. Destructive work must also prove provider/import claims and relevant `JobTask.workKey` values are clear.
- Shared `Position` cleanup remains separate from account/user lifecycle work and belongs to ONB-026.
- Public ETA remains disabled until the accepted ONB-007 production-telemetry eligibility gates are satisfied.
- Final visual/accessibility polish remains coordinated with the Visual Transformation track rather than duplicated inside functional onboarding tasks.

## Canonical ownership

- ONB-008: delivered disposition/readiness projection.
- ONB-009: onboarding lifecycle commands.
- ONB-010: functional Angular onboarding/Home re-entry.
- ONB-015: delivered normal account-sync cutover and preparation handoff.
- ONB-019: delivered destructive lifecycle persistence/fences/audit/provenance.
- ONB-020/021: destructive account/game and whole-user execution.
- ONB-025: authenticated stale-account refresh trigger.
- ONB-026: bounded orphan shared-position cleanup.
- ONB-024: administrator lifecycle adapters over canonical services.

## Latest reconciled validation

- ONB-008: final runtime head `d303c692883f9d7354167c7618853a76f80022c9`, CI #3149 / run `32653248564`, squash `512c248689f41a1164be3da63dc22cc97041614b`.
- ONB-019: final runtime head `c6db4e2b4a40629a5abe11c08b1bb657a3b99518`, CI #3013 / run `32115505177`, squash `d9175c5d60448399b7297393afc55db747717ce2`.
- ONB-015: runtime head `5a2b6348ee516c477c9353020fd90f365f2cc25a` passed CI #3155 / run `32692461730`; final PR head `fc2aa0d08afebbc952cf5a55693ee99f77b7d29c` passed CI #3156 / run `32692956344`; squash `c89442fbe8945854f0d6d7545e947beb7bebccfe`.

## Next deterministic action

**ONB-009 / #194** is the lowest-order unclaimed `READY` task. Before claiming any ready task, recheck live branches/PRs plus the task-specific schema, route, lifecycle, and UI collision surfaces required by its task file.
