# RB-009 — Define builder session, branch queue, and draft lifecycle

Status: DONE

Priority: P1

Order: 100

Delivery class: North-star

Planning maturity: Implemented

Claimed by: OpenAI ChatGPT

Claim branch: `rb-009/issue-97-builder-session-claim`

Implementation branch: `rb-009/issue-97-builder-session-lifecycle`

Claimed at: 2026-07-29

Claim PR: `#173`

Implementation PR: `#177`

Squash commit: `00c8f1abff4403d4fe5996cbb41759a1608a9cf9`

Implementation-head CI: run `30425427760` / CI #1328 — success

Final implementation-head CI: run `30426357127` / CI #1360 — success

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

## Current repo anchors inspected

- completed RB-006 target contract and integrated RB-007 candidate-decision contract/policy;
- RB-008 approved visual flow;
- `chess-domain` normalized-position and repertoire-graph helpers;
- analysis reintegration preview and conflict shapes;
- Angular request-version/store patterns;
- current Prisma schema and ownership models;
- package build, Vitest and root architecture conventions.

## Dependencies

Completed RB-006 target contract, accepted RB-008 routed visual direction, and integrated RB-007 candidate identifiers, reason semantics, policy version, evidence limits, and opponent-coverage contract are available.

RB-010 is unblocked by the accepted and integrated RB-009 delivery.

## Delivered scope

### Session snapshot

- model version `2026-07-v1`;
- session identity, owner identity, optimistic revision and lifecycle;
- one retained target snapshot with contract version, target ID and capture time;
- repertoire side, starting FEN and normalized starting-position identity;
- retained candidate contract, ranking-policy, generation and source-version references on decisions;
- JSON-serializable arrays and records without `Map`, `Set`, service, HTTP or UI state.

### Branch and decision model

- path-stable branch IDs such as `root/e2e4/c7c5`;
- normalized FEN plus role as the transposition comparison identity;
- separate `USER_MOVE` and `OPPONENT_RESPONSE` roles;
- explicit `PENDING`, `ACCEPTED`, `DEFERRED`, `IGNORED`, `COMPLETED` and `STALE` states;
- immutable decision-history records with `ACTIVE`, `SUPERSEDED` and `STALE` status;
- user decisions require one move; opponent coverage may select a bounded set of moves;
- accepted move records retain UCI, SAN, resulting position, candidate rank, coverage contribution, reasons and warnings.

### Deterministic transitions

- create and resume an owned snapshot;
- accept or replace a decision;
- defer and reopen work;
- restart stale work;
- explicitly ignore or complete a branch;
- reorder queued work;
- mark one evidence/course subtree stale;
- replace the target snapshot and lazily restart from the root;
- complete or abandon the session;
- reject owner and revision mismatches.

Replacing an ancestor decision marks the previous descendants stale, removes them from the active queue, retains their historical evidence, and creates only the immediate new child branches.

### Queue and transpositions

The queue is generated lazily. Accepting one decision creates or reactivates only its immediate resulting branches. It does not traverse or calculate the complete repertoire tree.

Queue ordering is deterministic insertion order with one explicit reorder transition. Deferred, ignored and completed branches leave the queue; reopened and affected stale roots return to it.

When a new move path reaches the same normalized position and decision role as an accepted or completed canonical branch, the new branch is recorded as `COMPLETED` with reason `TRANSPOSED`, references the canonical branch ID, and is not queued for duplicate work.

### Preview

The pure preview projection returns:

- one bounded branch tree;
- the current active decision per included branch;
- queue entries and roles;
- status counts;
- transposition, completion and stale metadata;
- explicit truncation and omitted-branch counts.

### Hard bounds

- branches per session: 256;
- queued branches: 128;
- selected moves per decision: 8;
- preview nodes: 256.

## Persistence decision

Persistence is staged rather than added in RB-009.

The model is serializable, owner-scoped and revision-aware so a later route or repository can store it without changing lifecycle semantics. The current repository has no reviewed builder workbench or demonstrated cross-device/long-lived resume requirement that justifies a Prisma model, migration, repository and API before RB-010.

RB-010 should first compose the routed workbench against this pure model. Durable storage requires a reviewed UX requirement and should reuse the same ownership and optimistic-revision semantics rather than creating a second state model.

## Out of scope

- full builder UI;
- candidate calculation itself;
- course writes;
- database persistence or migration;
- API routes or storage adapters;
- background generation of an entire tree;
- automatic traversal of every opponent response;
- LLM conversation state;
- notification jobs.

## Acceptance criteria

- State transitions are deterministic and tested. — Met.
- Accepted, pending, deferred, ignored and stale are distinct. — Met.
- A branch can be deferred and later reopened. — Met.
- Changing an ancestor invalidates affected descendants safely. — Met.
- Transposition behavior is explicit. — Met.
- Target and policy versions needed for reproducibility are retained. — Met.
- Ownership is enforced for persisted drafts. — Not applicable because persistence was deliberately not added; owner checks are enforced by every mutation and resume operation.
- No unbounded tree is loaded or generated. — Met through lazy expansion and hard bounds.
- Persistence is added only with documented UX justification. — Met by staging persistence.
- The state model supports the RB-008 interaction without UI-specific leakage. — Met.

## Required validation

Completed through implementation-head CI #1328 and final implementation-head CI #1360:

- root lint;
- root build;
- focused `chess-domain` lifecycle tests;
- opening-classification audit and artifact upload;
- architecture guardrails;
- database migrations;
- imported-game opening-classification audit and artifact upload;
- complete repository tests.

No API, Prisma ownership, Angular, course-write or durable-resume validation was required because those behaviors are outside this task boundary.

## Completion updates

The implementation report records the persistence decision, lifecycle, queue algorithm, transposition semantics, hard bounds, residual risks and RB-010 impact. The closure report records user acceptance, squash integration and queue synchronization.

## Completion

Implementation report: `../reports/RB-009-2026-07-29-builder-session-lifecycle.md`

Closure report: `../reports/RB-009-2026-07-29-closure.md`

Completed at: 2026-07-29