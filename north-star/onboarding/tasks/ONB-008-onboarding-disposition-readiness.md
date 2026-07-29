# ONB-008 — Persist onboarding disposition and readiness projection

Status: PROPOSED

Priority: P0

Order: 80

Delivery class: Implementation

Planning maturity: Decisioned by ONB-001; blocked on ONB-002 and ONB-003 persistence boundaries

GitHub issue: [#193](https://github.com/vokerg/chess_repertoir_trainer/issues/193)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Persist the minimal user onboarding disposition and preparation/readiness projection approved by ONB-001 so API and clients consume one deterministic server-owned lifecycle contract.

## Why this task exists

Authentication, accounts, imports, imported-game jobs, Home, and feature pages currently infer partial setup facts independently. A durable disposition and bounded read model are required before lifecycle commands or Angular onboarding can be correct across sessions and devices.

## Dependencies

- ONB-001 / #148 lifecycle and product contract.
- ONB-002 / #149 import persistence/status decisions.
- ONB-003 / #150 preparation aggregate and reconciliation decisions.
- Coordinate destructive reset semantics with ONB-004 / #151.

## In scope

- Shared onboarding/readiness HTTP contracts.
- Minimal user-level disposition persistence.
- Repeatable preparation-run persistence boundary approved by ONB-003.
- At most one active preparation run per user.
- Legacy-user adoption migration.
- Authenticated onboarding status/read endpoint.
- Server-derived stage, milestone, exact-count, warning, and feature-readiness projection.
- Ownership, migration, repository/service, route, and focused integration tests.

## Out of scope

- Provider import worker implementation.
- Indexing/analysis wave execution.
- Start, pause, resume, cancel, retry, or expansion commands.
- Angular onboarding UI.
- Final visual/accessibility polish.
- Automated repertoire or course generation.

## Acceptance criteria

- Every returned lifecycle/readiness state has one deterministic server-derived meaning.
- Existing users are not forced through first-run onboarding after rollout.
- State survives session, browser, device, API restart, and child-job history cleanup.
- At most one non-terminal preparation run exists per user under concurrency.
- Queries are ownership-scoped and use bounded database aggregates.
- Percentages appear only with fixed denominators; no ETA is emitted.
- Migration and API behavior have focused tests.

## Required validation

- Prisma migration and generated-client validation.
- Focused API contract/service/repository tests.
- Legacy/new-user migration scenarios.
- Concurrent active-run invariant test.
- Readiness threshold and ownership-isolation tests.

## Completion

Report: none

Pull request: none

Completed at: none