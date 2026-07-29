# RB-009 — Define builder session, branch queue, and draft lifecycle

Status: CLAIMED

Priority: P1

Order: 100

Delivery class: North-star

Planning maturity: Outlined

Claimed by: OpenAI ChatGPT

Claim branch: `rb-009/issue-97-builder-session-claim`

Claimed at: 2026-07-29

Claim scope: Define and implement a pure, serializable and versioned builder-session domain in `packages/chess-domain` with retained RB-006 target snapshots, RB-007 policy/evidence references, path-stable branch identities plus normalized-position transposition keys, a lazily generated bounded queue, explicit `PENDING`, `ACCEPTED`, `DEFERRED`, `IGNORED`, `COMPLETED` and `STALE` states, deterministic accept/defer/reopen/ignore/reorder/complete/ancestor-replacement/refresh transitions, preview-tree projection and focused pure tests. Resolve MVP persistence as staged: no Prisma model, API endpoint, Angular UI or storage adapter in RB-009; storage is deferred until RB-010 demonstrates the routed workbench and concrete resume requirements. Excludes candidate calculation, course writes, background traversal, notifications, LLM state and unbounded tree generation.

## Outcome

Define and implement the minimum reliable state model for a repertoire-building draft:

- target snapshot;
- starting position and side;
- accepted user choices;
- opponent responses selected for coverage;
- pending branch queue;
- deferred and ignored branches;
- stale decisions and evidence versions;
- previewable output tree;
- lifecycle and resume behavior.

## Why this task exists

A recursive builder is not a simple linear form. It creates multiple pending branches, transpositions, and deliberate deferrals. State must remain understandable and bounded before a production MVP is built.

## Current repo anchors to inspect

- completed RB-006 target contract and integrated RB-007 candidate-decision contract/policy;
- RB-008 approved visual flow;
- course move-tree and analysis-tree domain helpers;
- analysis reintegration preview shapes;
- Angular store patterns for multi-request workflows;
- Prisma draft/session patterns if any exist elsewhere;
- job/task state models only as conceptual references, not automatic reuse.

## Dependencies

Completed RB-006 target contract, accepted RB-008 routed visual direction, and integrated RB-007 candidate identifiers, reason semantics, policy version, evidence limits, and opponent-coverage contract are available.

RB-010 depends on it.

## In scope

- define draft/session identity and ownership;
- define immutable or versioned target snapshot;
- define decision records and status values;
- define branch identity robust to transpositions;
- define pending-queue ordering and user-controlled reprioritization if needed;
- define deferred versus ignored semantics;
- define draft preview tree;
- define evidence/policy version references needed for reproducibility;
- define stale detection when course or target inputs change;
- decide whether MVP persistence is database-backed, route/local state, or staged;
- if persistence is approved, add minimal schema/repository/service/routes with ownership and migration tests;
- define bounded loading and update operations;
- provide pure state-transition tests.

## Out of scope

- full builder UI;
- candidate calculation itself;
- course writes;
- background generation of an entire tree;
- automatic traversal of every opponent response;
- LLM conversation state;
- notification jobs.

## Open questions to resolve

- Is persistence required for MVP review?
- Can one draft target multiple courses?
- How are branches keyed across transpositions and move orders?
- Is the queue generated lazily after each decision?
- Can a user revisit and change an earlier user move, and how are descendants invalidated?
- How are evidence refresh and target changes handled?
- What optimistic-concurrency or version checks are needed?
- How much state belongs in contracts versus internal domain types?

## Acceptance criteria

- State transitions are deterministic and tested.
- Accepted, pending, deferred, ignored, and stale are distinct.
- A branch can be deferred and later reopened.
- Changing an ancestor invalidates or recalculates affected descendants safely.
- Transposition behavior is explicit.
- Target and policy versions needed for reproducibility are retained.
- Ownership is enforced for persisted drafts.
- No unbounded tree is loaded or generated.
- Persistence is added only with documented UX justification.
- The state model can support the RB-008 approved interaction without UI-specific leakage into the domain.

## Required validation

- pure domain/state tests;
- contracts/API tests if endpoints exist;
- Prisma migration and ownership tests if persistence exists;
- architecture checks;
- concurrency/stale-update tests where relevant.

## Completion updates

The report must record the persistence decision, lifecycle, queue algorithm, transposition semantics, and any follow-up tasks required before RB-010.

## Completion

Report: none

Completed at: none
