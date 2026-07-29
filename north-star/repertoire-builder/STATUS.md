# Repertoire Builder Program Status

Last updated: 2026-07-29

## Current state

**Program state:** RB-001, RB-002, RB-003, RB-006, RB-007, RB-008, RB-014 and RB-018 are complete. RB-004 is in review through PR #136. RB-005 is stacked on RB-004 and in hands-on review through PR #139. RB-009 is implemented for review through PR #177 after complete CI. RB-010 remains blocked until RB-009 is accepted and integrated. RB-017 is the approved bounded traps data/validator pilot and remains claimed through issue #114.

**Runtime on `main`:** the application has the Lichess-benchmark population and peer-resolution foundation from PR #84, deterministic opening classification and complete pinned-book rule matching from PRs #111 and #121, the versioned repertoire-target contract from PR #157, and the deterministic candidate-decision contract, ranking policy and authenticated evidence aggregation API from PR #166.

**Review work not on `main`:** PR #136 adds Player Chess Profile calculation, PR #139 adds the stacked Angular profile experience, and PR #177 adds the storage-neutral builder-session and branch-queue domain.

**GitHub program tracker:** [#105 — Repertoire Builder North Star program](https://github.com/vokerg/chess_repertoir_trainer/issues/105), open.

## Completed foundations

### Population and player level — RB-001 / RB-002

Available on `main`:

- fixed speed presets and Lichess rating targets;
- versioned Chess.com-to-Lichess mappings;
- provider/speed classification before aggregation;
- multi-account game-count-weighted normalized band distribution;
- recent-three-month, all-history and generic fallback;
- `dominant-contiguous-window-v1`;
- complete distribution, selected interval, evidence period and contribution provenance;
- compact Peer games UI and typed API contracts.

No second durable player-level formula is justified without a measured defect or concrete consumer.

### Opening classification — RB-003 / RB-018

Available on `main`:

- deterministic ordered regex rules with family inheritance and narrow overrides;
- independent White and Black profiles;
- explicit matched-rule provenance and unknown values;
- active rule version `2026-07-rules-v2`;
- rule-match coverage for all 3,733 pinned entries and 3,167 unique names;
- generated and imported-game weighted audits;
- CI failure on newly unmatched pinned names.

Rule matching does not fabricate semantic certainty. Rare families may retain low confidence or explicit `UNKNOWN` dimensions.

### Accepted visual direction — RB-008

PR #110 establishes:

1. a focused setup dialog for side, start, speed, population, persona and coverage intent;
2. a routed builder workbench after **Start building**;
3. one readable primary board;
4. candidate switching with focused evidence;
5. an opponent-response queue and visible branch progress;
6. separate target fit and profile fit;
7. no simultaneous multi-board default.

### Repertoire target — RB-006

Squash-merged PR #157 provides:

- versioned target identity and one build/session snapshot;
- side, starting point and account context;
- one fixed speed preset and requested/effective population;
- factual peer-resolution provenance;
- explicit objective, risk, theory, complexity and coverage intent;
- field-level defaults and exact overrides;
- immutable/mutable/recalculation field sets;
- no API, UI, persistence, ranking or course writes.

### Candidate decisions — RB-007

Squash-merged PR #166 provides:

- candidate contract version `2026-07-v1`;
- deterministic policy version `2026-07-deterministic-v1`;
- authenticated `POST /api/candidate-decisions`;
- separate `USER_MOVE` and `OPPONENT_RESPONSE` roles;
- bounded stored engine, Masters, selected-population, personal, opening, profile and course evidence;
- explicit unavailable, stale and insufficient source states;
- separate target fit and profile fit;
- stable reason and warning codes without a public opaque aggregate score;
- course conflict, narrow transposition and opponent-coverage evidence.

Final implementation-head CI #1295 passed the complete repository workflow.

## Review work

### RB-004 / #92 — Player Chess Profile calculation

PR #136 provides a shared contract and authenticated deterministic profile endpoint with separate preference/performance evidence, selected-game baselines, evidence grades, opening-classification provenance and bounded supporting games.

CI #1103 passed. User review and accepted integration remain required.

### RB-005 / #93 — Player Chess Profile experience

Stacked PR #139 provides `/progress/profile`, recalculable context filters, separate `What you choose` and `What works` views, evidence expansion, coverage states and focused Angular architecture/tests.

It remains blocked from integration until RB-004 is accepted, the stacked branches are reconciled and hands-on review is complete.

### RB-009 / #97 — Builder session and branch queue

Draft implementation PR #177 provides:

- pure model version `2026-07-v1` under `packages/chess-domain`;
- serializable owner-scoped snapshot and optimistic revision;
- retained RB-006 target and RB-007 evidence/policy references;
- path-stable branch IDs plus normalized-position transposition identity;
- explicit `PENDING`, `ACCEPTED`, `DEFERRED`, `IGNORED`, `COMPLETED` and `STALE` states;
- active, superseded and stale decision history;
- deterministic accept/replace, defer/reopen, stale restart, ignore, complete, reorder, refresh, resume and lifecycle transitions;
- lazy one-decision expansion rather than full-tree generation;
- bounded tree and queue preview;
- limits of 256 branches, 128 queued branches, 8 selected moves and 256 preview nodes.

Persistence is deliberately staged. RB-009 adds no Prisma model, API route, Angular UI or storage adapter. The snapshot is ready for a later adapter, but RB-010 must first demonstrate the routed workbench and a concrete durable-resume requirement.

Implementation-head CI run `30425427760` / #1328 passed lint, build, both opening audits, architecture guardrails, migrations and complete repository tests.

Report: `reports/RB-009-2026-07-29-builder-session-lifecycle.md`.

## Active independent pilot

### RB-017 / #114

The approved traps pilot remains limited to:

- a source-controlled reviewed dataset;
- deterministic validation;
- versioned engine and population snapshots;
- explicit insufficient evidence;
- review output, tests and documentation.

It excludes production persistence, public API, Angular UI, course writes and RB-006/RB-007 contract changes.

## Repository and GitHub issue state

- RB-001 / #89: `DONE`.
- RB-002 / #90: `DONE` through RB-001 delivery evidence.
- RB-003 / #91: `DONE`.
- RB-004 / #92: `REVIEW` through PR #136.
- RB-005 / #93: `REVIEW` through stacked PR #139.
- RB-006 / #94: `DONE` through PR #157.
- RB-007 / #95: `DONE` through PR #166.
- RB-008 / #96: `DONE` through accepted PR #110 direction.
- RB-009 / #97: `REVIEW` through PR #177.
- RB-010 / #98: `BLOCKED` pending accepted RB-009 integration.
- RB-014 / #102: `DONE` through PR #113.
- RB-017 / #114: `CLAIMED` for the bounded pilot.
- RB-018 / #116: `DONE` through PR #121.

## Dependency impact

- RB-006 provides authoritative target snapshots and change-impact semantics.
- RB-007 provides candidate IDs, decision roles, evidence/policy versions, stable reasons and opponent-coverage contribution.
- RB-008 provides the accepted routed board-first interaction.
- RB-009 now provides the review-ready session, decision-history, branch, queue, transposition, stale and preview semantics needed by RB-010.
- RB-010 remains blocked until RB-009 is accepted and integrated; it then becomes the next ordered ready North Star task.
- RB-011 remains responsible for course preview and writes.
- RB-013 remains responsible for profile/persona defaults and overrides.
- RB-017 remains outside the critical path.

## Validation

- RB-004 CI #1103 passed lint, build, audits, guardrails, migrations and complete tests.
- RB-006 CI #1251 and #1256 passed the complete repository workflow.
- RB-007 CI #1281, #1284 and #1295 passed the complete repository workflow and focused acceptance cases.
- RB-008 validation includes responsive prototype review and complete repository CI.
- RB-009 CI #1328 passed the complete repository workflow and focused lifecycle, queue, invalidation, transposition, revision and preview tests.
- RB-014 source/license verification and complete repository CI passed.
- RB-017 must add deterministic offline fixture tests and an explicit opt-in live refresh path.

## Residual risks

- Opening classifications remain reviewable chess judgments.
- RB-006 v1 supports the Lichess Games population source only.
- RB-007 weights, thresholds and evidence limits require real-builder calibration and version increments when changed.
- RB-009 has no durable storage, API or browser recovery; persistence remains conditional on RB-010 evidence.
- RB-009 source freshness is explicit but consumer-driven; no background watcher marks evidence stale.
- RB-009 transpositions are recognized within the loaded session snapshot, not by arbitrary external repertoire-graph traversal.
- Course materialization, conflict resolution and completed-course target metadata remain RB-011 work.
- Engine, personal, course and profile providers do not share one universal freshness timestamp model.

## Queue recommendation

Keep task order and priorities unchanged.

RB-009 is in review. After accepted integration, move RB-010 from `BLOCKED` to `READY`. No new task or roadmap resequencing is required now.
