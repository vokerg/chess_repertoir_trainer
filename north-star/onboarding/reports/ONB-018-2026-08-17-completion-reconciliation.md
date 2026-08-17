# ONB-018 completion reconciliation — 2026-08-17

## Outcome

ONB-018 is complete. Runtime PR #385 was accepted after three self-review rounds and squash-merged into `main` as `9b0293271a2c1a9f24a77939e828c3ee1aca8ffd`.

The final merge-readiness review found one additional failure-atomicity defect in pre-engine analysis setup-failure persistence. The branch was corrected before merge so setup failure is now recorded in one owned-game-locked PostgreSQL transaction that both creates terminal `FAILED` analysis evidence and updates the imported-game latest-analysis snapshot. Non-forced work rechecks current completed evidence while holding that lock and does not downgrade a concurrent/current successful analysis.

## Final validation

Exact final reviewed runtime head:

`4e3a3a4ea6f3f0f798d52e08830d051ad13c7b95`

CI #2998 / run `32041962372` passed end-to-end on that exact head:

- dependency installation and audit;
- lint;
- full domain/contracts/API/web/mobile build;
- opening classification and knowledge audits;
- architecture guardrails;
- repository hygiene guardrails;
- migrations from an empty PostgreSQL database;
- imported-game opening audits;
- complete repository test suite, including the final PostgreSQL setup-failure atomicity regression.

GitHub reported PR #385 mergeable immediately before merge and there were no unresolved review threads. The current-main commits added after the original ONB-018 branch point were re-inspected and were unrelated course/external-account contract and repository-hygiene changes.

## Delivered runtime boundary

ONB-018 now provides:

- a bounded PostgreSQL parent reconciliation loop in the existing worker deployment;
- one-second active and five-second idle cadence with durable immediate wake hints;
- atomic due-parent claiming and restart-safe wake/lease fencing;
- committed-import-to-index pipelining;
- deterministic first-index, first-analysis, index-continuation, analysis-tail, and explicit-retry lanes;
- the normal three-indexed first-analysis trigger plus a truly one-game quiescent fallback;
- stage-specific multi-account fairness below direct-user job priority;
- exact milestones and core-readiness reconciliation from current evidence;
- acknowledged pause/cancel/resume behavior and atomic retry generation;
- retained child settlement evidence and retention-safe wake behavior;
- recoverable import-attention reconciliation;
- bounded stall telemetry without public ETA;
- durable failed evidence for pre-engine analysis setup failures so normal reconciliation cannot retry them forever.

Public onboarding lifecycle routes remain ONB-009-owned, readiness/disposition projection remains ONB-008-owned, account sync/preparation cutover remains ONB-015-owned, and destructive lifecycle fences/operations remain ONB-019/020/021-owned.

## Canonical reassessment

- `STATUS.md`: ONB-018 is no longer active/ready; downstream readiness is updated by this reconciliation.
- `TASKS.md`: ONB-018 moves to `DONE`. ONB-008 and ONB-015 have their explicit ONB-018 execution/control gate satisfied and are promoted to unclaimed `READY`. ONB-019 remains independently `READY`.
- `ROADMAP.md`: Phase 5 preparation core is complete; ONB-015 remains the sync-cutover/handoff slice while ONB-008 is now executable on the lifecycle-projection path.
- `DECISIONS.md`: no new program-level architecture decision is required; the final atomicity correction implements existing D-060/D-061 evidence/retry semantics rather than changing them.
- `OPEN_QUESTIONS.md`: no new research question is introduced. ONB-008/015 retain their task-local implementation questions.
- `GITHUB_ISSUES.md`: #254 is completed through runtime PR #385 and this completion reconciliation; downstream issue readiness should reflect ONB-008/#193 and ONB-015/#203 promotion.

## Queue impact

After this reconciliation, the deterministic lowest-order unclaimed `READY` task is ONB-008 / #193 at order 80. ONB-015 / #203 is also `READY` at order 150, and ONB-019 / #259 remains `READY` at order 160 on the parallel destructive-lifecycle path. ONB-009 and ONB-010 remain `PROPOSED` behind ONB-008 and their other explicit dependencies.

## Residual risks

No ONB-018-owned blocker remains. Production-like provider/Neon/engine telemetry continues to be operational evidence rather than a public ETA promise. ONB-015 still owns removal of synchronous legacy account traversal and end-to-end account-sync/preparation handoff; ONB-008 still owns the product projection/action contract.

## Files inspected for final reconciliation

- `north-star/onboarding/AGENTS.md`
- `north-star/onboarding/STATUS.md`
- `north-star/onboarding/ROADMAP.md`
- `north-star/onboarding/TASKS.md`
- `north-star/onboarding/DECISIONS.md`
- `north-star/onboarding/OPEN_QUESTIONS.md`
- `north-star/onboarding/GITHUB_ISSUES.md`
- `north-star/onboarding/tasks/ONB-018-preparation-reconciliation-control.md`
- `north-star/onboarding/tasks/ONB-008-onboarding-disposition-readiness.md`
- `north-star/onboarding/tasks/ONB-015-account-sync-cutover-handoff.md`
- live PR #385, issue #254, final CI #2998, and current `main`
