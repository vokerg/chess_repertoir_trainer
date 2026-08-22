# ONB-008 — Persist onboarding disposition and readiness projection

Status: REVIEW

Priority: P0

Order: 80

Delivery class: Implementation

Planning maturity: Decisioned by ONB-001/003/007/016; ONB-017/018 execution state and durable import/provider delivery are complete; implementation is now under review in PR #398

GitHub issue: [#193](https://github.com/vokerg/chess_repertoir_trainer/issues/193)

Claimed by: ChatGPT

Claim branch: `onb-008/issue-193-onboarding-readiness`

Claimed at: 2026-08-20

Claim scope: minimal user disposition persistence, server-owned onboarding/readiness projection, shared HTTP contract, authenticated read route, bounded ownership-scoped aggregates, migration and focused tests; excludes ONB-009 lifecycle commands and Angular UI

Promoted at: 2026-08-17 through ONB-018 completion reconciliation

## Outcome

Persist the minimal user onboarding disposition and expose the bounded readiness projection approved by ONB-001/003/007/016 so API and clients consume one deterministic server-owned lifecycle contract.

## Why this task exists

Authentication, accounts, imports, imported-game jobs, Home, and feature pages currently infer partial setup facts independently. A durable disposition and bounded read model are required before lifecycle commands or Angular onboarding can be correct across sessions and devices.

ONB-017/018 own the physical `DataPreparationRun`, target, batch, and reconciler implementation. This task consumes that execution state rather than duplicating it.

## Dependencies

- ONB-001 / #148 lifecycle and product contract.
- ONB-002 / #149 import persistence/status decisions and durable import implementation.
- ONB-003 / #150 preparation orchestration contract.
- ONB-007 / #154 exact-progress, denominator, ETA, milestone, and stall policy.
- ONB-017 / #253 preparation execution persistence.
- ONB-018 / #254 progressive reconciliation and control state.
- ONB-016 / #224 presentation/readiness/reveal requirements.
- Coordinate destructive reset semantics with ONB-004 / #151.

## In scope

- Shared onboarding/readiness HTTP contracts.
- Minimal user-level disposition persistence.
- Legacy-user adoption migration.
- Authenticated onboarding status/read endpoint.
- Server-derived presentation state from disposition plus `DataPreparationRun` lifecycle/milestones.
- Exact provider-window, committed-game, selected, indexed, analysed, queued, running, failed, skipped, and remaining counts from bounded database aggregates.
- Fixed-denominator percentages only for immutable child batches, fixed provider-window plans, or terminal import scopes.
- No weighted overall preparation percentage while import can still discover games.
- No public ETA in the initial release.
- Account-specific target progress and bounded aggregate progress.
- First-imported, first-indexed, first-analysed, core-ready, and analysis-complete milestones.
- Attention/warning codes for rate limiting, reconcile lag, stalled child work, pause/cancel, no data, and all-index-failed outcomes.
- Deterministic server-allowed actions/destinations.
- Feature-specific locked, partial, ready, and checked-empty readiness.
- Latest real milestone and bounded canonical reveal summaries/references.
- Ownership, migration, repository/service, route, and focused integration tests.

## Out of scope

- `DataPreparationRun`, target, or batch schema owned by ONB-017.
- Provider import worker implementation.
- Indexing/analysis wave execution and reconciliation owned by ONB-018.
- Start, pause, resume, cancel, retry, restart, or expansion command routes owned by ONB-009.
- Angular onboarding UI.
- Public ETA, countdown, or elapsed-time-smoothed progress.
- Final visual/accessibility polish.
- Automated repertoire or course generation.

## Acceptance criteria

- Every returned lifecycle/readiness state has one deterministic server-derived meaning.
- Existing users are not forced through first-run onboarding after rollout.
- State survives session, browser, device, API restart, and child-job history cleanup.
- Queries are ownership-scoped and use bounded database aggregates.
- Product readiness is derived from current import/game evidence, not historical child task totals.
- Percentages appear only with fixed denominators; no weighted overall percentage or ETA is emitted.
- Before import is terminal, the projection exposes milestones and exact counts rather than an overall percent.
- Parent `coreReadyAt` may complete user disposition while analysis continues.
- No-data, checked-empty, all-index-failed, partial, paused, cancelled, rate-limited, stalled, and needs-attention states expose deterministic actions.
- Technical child-job counts remain distinguishable from product readiness and core completion.
- Migration and API behavior have focused tests.

## Required validation

- Prisma migration and generated-client validation for user disposition/adoption only.
- Focused API contract/service/repository tests.
- Legacy/new-user migration scenarios.
- Readiness threshold and ownership-isolation tests.
- Unknown-to-fixed denominator transition tests.
- Immutable batch percentage and terminal-scope percentage tests.
- No-overall-percent/no-ETA contract tests.
- Child dismissal/retention cleanup projection tests.
- Multi-account target aggregation tests.
- Rate-limit/stall/checked-empty action mapping tests.
- Bounded reveal payload tests.

## Completion

Report: none

Pull request: [#398](https://github.com/vokerg/chess_repertoir_trainer/pull/398)

Initial implementation head: `df009f1a1e242a3a11b4b61eb08f41a1dc91cb85`

Latest self-review code head: `dd8408d4e18b741f9c32c97382e5ca4b476206af`

Validation: GitHub Actions is the merge-readiness gate for this connector-only implementation; the exact branch head must pass lint, build, architecture/repository guardrails, the full migration chain, imported-game audits, and the complete test suite.

Completed at: none — task remains `REVIEW` until accepted merge/completion reconciliation.
