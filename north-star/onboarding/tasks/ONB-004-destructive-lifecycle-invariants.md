# ONB-004 — Define safe purge, un-index, un-analyse, and user deletion invariants

Status: IN_PROGRESS

Priority: P0

Order: 40

Delivery class: Research

Planning maturity: Active repository and lifecycle research

GitHub issue: [#151](https://github.com/vokerg/chess_repertoir_trainer/issues/151)

Claimed by: ChatGPT/Codex research session for `vokerg`

Claim branch: `onb-004/issue-151-destructive-lifecycle-invariants`

Claimed at: 2026-08-02

Claim scope: re-inspect current Prisma relations, destructive account/user paths, imported-game derived writes, durable jobs/import/preparation control, mobile synchronization, and ownership/cascade tests; produce the exact lifecycle matrix and active-worker protocol; reconcile decisions/open questions/queue and allocate bounded implementation tasks; no production destructive endpoint, UI, or data deletion

## Outcome

Produce an exact model-by-model lifecycle contract and active-worker protocol for account purge, account deletion/recreation, un-index, un-analyse, and whole-user deletion.

## Why this task exists

Full account cascade is partly available, but partial reset spans raw games, plies, analysis snapshots, tags, tactical data, AI reviews, training references, opening provenance, job history, and shared Position data.

## Current repository anchors to inspect

- `apps/api/prisma/schema.prisma`
- all migrations affecting imported games, analysis, tactical/scenario, courses, jobs, AI review, and mobile sync
- `apps/api/src/services/externalAccountService.ts`
- `apps/api/src/modules/jobs/`
- imported-game indexing, analysis, tagging, tactical detection, and AI review services
- ownership/cascade tests

## Dependencies

- ONB-000.
- Coordinate action shape with ONB-005 and cleanup boundary with ONB-006.
- Consume ONB-002 active-import and ONB-003 acknowledged preparation-cancellation boundaries.

## In scope

- Delete/retain/clear/recompute/block matrix for every affected model/field.
- Definitions for purge, delete account, un-index, un-analyse, delete user.
- Active job/import/preparation fencing and cancellation acknowledgement.
- Opening provenance requirement.
- Preview, typed confirmation, idempotency, audit, batching, retry, and failure policy.
- User-facing versus admin-only boundaries.
- Implementation task proposal.

## Out of scope

- Production destructive endpoint or UI.
- Actual data deletion.
- Orphan Position cleanup implementation.
- Hardcoded admin credentials.

## Questions owned

See `OPEN_QUESTIONS.md` under ONB-004.

## Acceptance criteria

- Each action has an unambiguous model/field outcome.
- Active executors cannot mutate target data after success.
- Shared Position retention is explicit.
- User deletion is visibly broader than account purge.
- Partial failure and retry are defined.
- Large-data transaction strategy is reviewed.
- Required cascade/race/idempotency tests are enumerated.

## Required validation

- Full Prisma relation audit.
- Trace derived analysis/tag/tactical/AI/training writes.
- Adversarial running-worker scenarios.
- Integration-test design for cascades and races.

## Completion updates

- Report, lifecycle matrix, decisions, open questions, queue, issue #151, and implementation tasks.

## Completion

Report: none

Pull request: none

Completed at: none
