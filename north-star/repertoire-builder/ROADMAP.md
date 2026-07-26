# Repertoire Builder Roadmap

Last updated: 2026-07-26

This roadmap orders capability stages and decision gates. Detailed execution belongs in individual task files.

## Stage 0 — program foundation

State: complete on `main` through PR #81, with planning reconciliation through PR #83.

Gate: passed for execution.

## Stage 1 — reusable evidence foundations

State: active. RB-001 is implemented and in review on PR #84; RB-002 remains blocked until RB-001 is accepted and merged; RB-003 remains independent.

### Merged baseline

- PR #80: shared Masters/rated Opening Explorer, mixed cache profile and Peer games widget.
- PR #76: previous cross-pool rating-normalization profile, contracts, helpers, tests and reference UI.

### RB-001 review delivery

PR #84 delivers:

- speed presets: All speeds, Blitz and slower, Blitz, Bullet;
- no product-facing ultraBullet;
- rating targets: All players, My peers, My peers and above, or one explicit group;
- defaults: Blitz and slower plus My peers and above;
- one mixed Lichess request and existing deterministic cache architecture;
- no client-selected public-game months;
- active normalization profile `2026-07-lichess-bands-v1` using the nine Lichess Explorer groups;
- versioned approximate Chess.com bullet/blitz/rapid mappings;
- recent-three-month → all-history → generic peer fallback;
- resolver policy `dominant-contiguous-window-v1`;
- direct request/effective-population/resolver provenance;
- two compact Peer games selects;
- full CI validation and canonical runtime documentation.

### Stage 1 boundary

RB-001 owns the temporary factual peer resolver required by Opening Analysis.

RB-002 owns the later durable multi-account projection, confidence, exclusions, persistence/snapshot and overrides. It must reuse the accepted RB-001 profile and resolver policy.

RB-003 owns independent named opening classification.

### Gate

RB-001 portion is reviewable when:

- fixed presets resolve deterministically;
- effective speeds/groups are returned directly;
- personal resolver provenance is inspectable and not stored in the public cache;
- one mixed cache snapshot retains honest HIT/REFRESHED/STALE semantics;
- profile and resolver policies are versioned;
- Masters remains separate;
- lint, build, architecture, migrations and complete tests pass.

These conditions are met on PR #84. Merge/acceptance remains required before RB-002 is unblocked.

Stage 1 remains open until:

- RB-002 durable player level is delivered;
- RB-003 opening classification is delivered or a deliberately limited fallback is approved.

Tasks: RB-001, RB-002, RB-003.

## Stage 2 — Player Chess Profile

State: blocked on RB-002 and RB-003; population-relative conclusions also consume RB-001.

Goals:

- calculate preference and performance separately;
- preserve sample size, filters, baseline and confidence;
- support periods, accounts, agreed speed presets, colors and rating context;
- expose evidence and supporting games/openings;
- keep profile conclusions advisory.

Tasks: RB-004, RB-005.

Gate: profile claims are reproducible, evidence-backed and useful enough to advise without constraining a target.

## Stage 3 — target and candidate decision model

State: blocked on Stage 1 contracts and profile/opening dependencies.

Goals:

- define a repertoire target using one RB-001 speed preset and one peer/all/explicit rating target;
- keep factual level, profile recommendation and manual override separate;
- aggregate engine, master, population, personal, opening-profile and course evidence without collapsing sources;
- rank candidates with explicit reasons and visible missing evidence.

Tasks: RB-006, RB-007, RB-013.

Gate: one position can produce a deterministic, explainable candidate comparison for a selected target.

## Stage 4 — visual decision proof

State: RB-008 remains READY and may proceed independently with verified population responses plus explicit mocks for unresolved durable level/profile evidence.

Goal: prove how a player visually compares candidate moves, consequences and opponent coverage before production builder architecture is locked.

Task: RB-008.

Gate: one reviewed interaction direction is understandable on desktop and mobile.

## Stage 5 — resumable builder foundation and MVP

Goals:

- define branch queue, accepted decisions, deferred responses, target snapshot and draft lifecycle;
- implement a routed, resumable workbench;
- alternate user-move selection and opponent-response coverage;
- produce a previewable repertoire tree.

Tasks: RB-009, RB-010.

Gate: a user can build one bounded repertoire slice and inspect the complete draft before course writes.

## Stage 6 — course materialization and adaptation

Goals:

- preview and apply accepted trees through current course-writing patterns;
- create or merge course material safely;
- enter the builder from gaps, endings, deviations and weak choices;
- preserve conflicts, transpositions and ownership.

Tasks: RB-011, RB-012.

Gate: accepted decisions become trainable material and existing-course maintenance uses the same workflow.

## Stage 7 — specialized personas and optional intelligence

Goals:

- support multiple purposeful repertoires for the same opening;
- research traps representation/data;
- determine whether LLM explanation or orchestration adds value without becoming a factual dependency.

Tasks: RB-013, RB-014, RB-015.

Gate: optional capabilities have explicit evidence, safety and architecture decisions before implementation.

## Stage 8 — outcome feedback

Goals:

- measure whether built/trained choices appear in later games;
- distinguish adoption, recall, opening-position quality and results;
- identify regression and newly relevant coverage;
- feed validated outcomes back into profile and course maintenance.

Task: RB-016.

Gate: the program can evaluate real opening outcomes rather than only course size.

## Parallel-delivery guidance

Safe parallel work while PR #84 is reviewed:

- RB-003 opening-classification discovery;
- RB-008 visual candidate/coverage prototype;
- RB-014 traps research.

Do not start RB-002 implementation until the RB-001 contract is accepted and merged.

High-collision areas requiring coordination:

- population and player-level contracts;
- Opening Explorer cache/provenance;
- rating-normalization profile changes;
- imported-game/account evidence aggregation;
- target/candidate schemas;
- builder state and persistence;
- course reintegration writes.

## Queue impact

- RB-001 remains order 10, P0, `REVIEW`.
- RB-002 remains order 20, P0, `BLOCKED` until RB-001 acceptance/merge.
- No other task order or priority change is recommended.
- No new task is required.

Every completion report must explicitly state whether this roadmap remains valid.