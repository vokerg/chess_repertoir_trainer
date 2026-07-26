# Repertoire Builder Roadmap

Last updated: 2026-07-26

This roadmap orders capability stages and decision gates. Detailed execution belongs in individual task files.

## Stage 0 — program foundation

State: complete on `main` through PR #81, with planning reconciliation through PR #83 and GitHub Issues migration through PR #106.

Gate: passed for execution.

## Stage 1 — reusable evidence foundations

State: active. RB-001 and RB-002 are complete; RB-003 remains the only unresolved Stage 1 foundation.

### Merged baseline

- PR #80: shared Masters/rated Opening Explorer, mixed cache profile and Peer games widget.
- PR #76: previous cross-pool rating-normalization profile, contracts, helpers, tests and reference UI.
- PR #84: fixed peer-population presets, Lichess-benchmark normalization, provider-aware multi-account resolver and compact Peer games UI.
- PR #106: GitHub Issues execution migration.

### RB-001 and RB-002 completed delivery

Squash commit `49dc6499eac9998de864ccb75a607541cd945382` provides:

- speed presets: All speeds, Blitz and slower, Blitz, Bullet;
- no product-facing ultraBullet;
- rating targets: All players, My peers, My peers and above, or one explicit group;
- defaults: Blitz and slower plus My peers and above;
- one mixed Lichess request and existing deterministic cache architecture;
- no client-selected public-game months;
- active normalization profile `2026-07-lichess-bands-v1` using the nine Lichess Explorer groups;
- versioned approximate Chess.com bullet/blitz/rapid mappings;
- provider/speed classification before aggregation;
- multi-account game-count-weighted normalized band distribution;
- recent-three-month → all-history → generic peer fallback;
- resolver policy `dominant-contiguous-window-v1`;
- complete distribution, selected groups, eligible-game count, evidence period and account/provider/speed contributions;
- direct request/effective-population/resolver provenance;
- two compact Peer games selects;
- full CI validation and canonical runtime documentation.

RB-002 is complete through this implementation. The earlier expectation of a separate durable formula, stored snapshot, generic confidence score or override foundation is rejected until a real consumer or measured defect justifies additional behavior.

### Stage 1 boundary

RB-001 supplies the factual peer-population and multi-account player-level resolver used by Opening Analysis and later consumers.

RB-002 records that boundary as complete and prevents a duplicate formula or premature persistence model.

RB-003 owns independent named opening classification.

### Stage 1 gate

The population/player-level portion of the gate is passed. Stage 1 remains open only until:

- RB-003 opening classification is delivered; or
- a deliberately limited fallback is explicitly approved.

Tasks: RB-001, RB-002, RB-003.

## Stage 2 — Player Chess Profile

State: blocked on RB-003. It consumes the completed factual player-level and population boundary from RB-001/RB-002.

Goals:

- calculate preference and performance separately;
- preserve sample size, filters, baseline and confidence;
- support periods, accounts, agreed speed presets, colors and rating context;
- expose evidence and supporting games/openings;
- keep profile conclusions advisory;
- extract or rename the factual player-level contract only when the profile becomes the second real consumer.

Tasks: RB-004, RB-005.

Gate: profile claims are reproducible, evidence-backed and useful enough to advise without constraining a target.

## Stage 3 — target and candidate decision model

State: blocked on opening-profile and target/profile dependencies, not on further player-level formula work.

Goals:

- define a repertoire target using one RB-001 speed preset and one peer/all/explicit rating target;
- keep factual level, profile recommendation and manual override separate;
- snapshot factual evidence only when resumability requires it;
- aggregate engine, master, population, personal, opening-profile and course evidence without collapsing sources;
- rank candidates with explicit reasons and visible missing evidence.

Tasks: RB-006, RB-007, RB-013.

Gate: one position can produce a deterministic, explainable candidate comparison for a selected target.

## Stage 4 — visual decision proof

State: RB-008 is `READY` and is the next actionable issue in queue order. It may proceed with verified population responses plus explicit mocks for unresolved opening-profile and target evidence.

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

Safe parallel work:

- RB-003 opening-classification discovery;
- RB-008 visual candidate/coverage prototype;
- RB-014 traps research.

High-collision areas requiring coordination:

- opening-profile contracts;
- Opening Explorer cache/provenance changes;
- rating-normalization profile or resolver-policy changes;
- imported-game/account evidence aggregation;
- target/candidate schemas;
- builder state and persistence;
- course reintegration writes.

## Queue impact

- RB-001 remains order 10, P0, `DONE`.
- RB-002 remains order 20, P0, now `DONE`.
- RB-003 remains order 30, P0, `PROPOSED`.
- RB-008 remains order 40, P1, `READY`, and is the next actionable task.
- No task order or priority change is recommended.
- No new task is required.

Every completion report must explicitly state whether this roadmap remains valid.
