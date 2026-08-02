# ONB-004 — Define safe purge, un-index, un-analyse, and user deletion invariants

Status: REVIEW

Priority: P0

Order: 40

Delivery class: Research

Planning maturity: Research complete; self-reviewed; review and merge pending

GitHub issue: [#151](https://github.com/vokerg/chess_repertoir_trainer/issues/151)

Claimed by: ChatGPT/Codex research session for `vokerg`

Claim branch: `onb-004/issue-151-destructive-lifecycle-invariants`

Claimed at: 2026-08-02

Claim scope: re-inspect current Prisma relations, destructive account/user paths, imported-game derived writes, durable jobs/import/preparation control, mobile synchronization, and ownership/cascade tests; produce the exact lifecycle matrix and active-worker protocol; reconcile decisions/open questions/queue and allocate bounded implementation tasks; no production destructive endpoint, UI, or data deletion

## Outcome

Produce an exact model-by-model lifecycle contract and active-worker protocol for account purge, account deletion/recreation, un-index, un-analyse, and whole-user deletion.

## Why this task exists

Full account cascade is partly available, but partial reset spans raw games, plies, analysis snapshots, tags, tactical data, AI reviews, training references, opening provenance, job history, and shared Position data.

## Current repository anchors inspected

- `apps/api/prisma/schema.prisma`
- relevant migrations for imported games, courses/training, tactical/scenario, jobs, AI review, and mobile sync
- `apps/api/src/routes/externalAccounts.ts`
- `apps/api/src/services/externalAccountService.ts`
- `apps/api/src/services/lichessConnectionService.ts`
- `apps/api/src/auth/current-app-user.service.ts`
- `apps/api/src/modules/jobs/`
- imported-game indexing, analysis, tagging, tactical detection, AI review, and scenario-training services
- mobile local-user/offline/outbox persistence
- ownership/cascade tests

## Dependencies

- ONB-000.
- Coordinated action/audit shape with ONB-005 and cleanup boundary with ONB-006.
- Consumed ONB-002 active-import and ONB-003 acknowledged preparation-cancellation boundaries.

## In scope

- Delete/retain/clear/recompute/block matrix for every affected model/field.
- Definitions for purge, delete account, un-index, un-analyse, delete user.
- Active job/import/preparation fencing and cancellation acknowledgement.
- Commit-side fence behavior for synchronous writers.
- Opening provenance requirement.
- Preview, typed confirmation, idempotency, audit, batching, retry, and failure policy.
- User-facing versus admin-only boundaries.
- Implementation task allocation.

## Out of scope

- Production destructive endpoint or UI.
- Actual data deletion.
- Orphan Position cleanup implementation.
- Hardcoded admin credentials.

## Questions owned

Resolved in:

- `reports/ONB-004-2026-08-02-destructive-lifecycle-invariants.md`;
- `reports/ONB-004-2026-08-02-self-review-addendum.md`.

Implementation-local naming and tuning are delegated to ONB-019/020/021. Administrator authorization/retention policy remains with ONB-005; shared Position cleanup remains with ONB-006.

## Acceptance criteria result

- Each action has an unambiguous model/field outcome: satisfied by the five-action contract and lifecycle matrix.
- Active executors cannot mutate target data after success: satisfied by persisted fences, acknowledged durable claims, zero target work keys, and guarded synchronous commits.
- Shared Position retention is explicit: satisfied; Position/PositionAnalysis/cache are retained and ONB-006 owns cleanup.
- User deletion is visibly broader than account purge: satisfied, including courses/training, puzzle state, OAuth state/token cleanup, identity tombstone, and mobile purge.
- Partial failure and retry are defined: satisfied by forward-only checkpointed operations.
- Large-data transaction strategy is reviewed: satisfied by deterministic bounded phases and final parent cleanup.
- Required cascade/race/idempotency tests are enumerated: satisfied in the reports and ONB-019/020/021 task files.

## Required validation result

- Full current Prisma relation audit performed.
- Derived analysis/tag/tactical/AI/scenario writes traced.
- Running job, durable import/preparation, synchronous writer, auth recreation, and mobile offline scenarios modelled.
- Relevant migration and ownership/cascade contracts inspected.
- Self-review corrected synchronous commit fencing and account-purge terminal import-history semantics.
- Local build/tests were unavailable because this runtime could not resolve `github.com`; pull-request CI remains the repository-level validation.

## Completion updates

- Main report and self-review addendum added.
- ONB-019 / #259, ONB-020 / #260, and ONB-021 / #261 allocated and corrected.
- Queue, status, roadmap, decisions, open questions, issue mapping, and dependent task boundaries reconciled.
- Production code, schema, migration, route, worker, provider, Angular, and mobile behavior unchanged.

## Completion

Report: `reports/ONB-004-2026-08-02-destructive-lifecycle-invariants.md`

Self-review addendum: `reports/ONB-004-2026-08-02-self-review-addendum.md`

Implementation tasks: ONB-019 / #259, ONB-020 / #260, and ONB-021 / #261

Pull request: [#263](https://github.com/vokerg/chess_repertoir_trainer/pull/263)

Completed at: review pending
