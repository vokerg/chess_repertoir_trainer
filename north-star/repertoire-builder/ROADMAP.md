# Repertoire Builder Roadmap

Last updated: 2026-07-27

This roadmap orders capability stages and decision gates. Detailed execution belongs in individual task files.

## Stage 0 — program foundation

State: complete on `main` through PR #81, with planning reconciliation through PR #83 and GitHub Issues migration through PR #106.

Gate: passed for execution.

## Stage 1 — reusable evidence foundations

State: complete through RB-001, RB-002 and RB-003.

### Merged baseline

- PR #80: shared Masters/rated Opening Explorer, mixed cache profile and Peer games widget.
- PR #76: previous cross-pool rating-normalization profile, contracts, helpers, tests and reference UI.
- PR #84: fixed peer-population presets, Lichess-benchmark normalization, provider-aware multi-account resolver and compact Peer games UI.
- PR #106: GitHub Issues execution migration.
- PR #107: RB-002 closure reconciliation.
- PR #111: deterministic side-aware opening-classification foundation.

### RB-001 and RB-002 completed delivery

The factual population/player-level foundation provides:

- product speed presets and rating targets;
- Lichess benchmark bands and versioned Chess.com mappings;
- provider/speed classification before aggregation;
- multi-account game-count-weighted normalized band distribution;
- recent-three-month, all-history and generic fallback;
- `dominant-contiguous-window-v1`;
- complete distribution, evidence period and contribution provenance;
- compact Peer games UI and typed contracts.

A separate durable formula, stored snapshot, generic confidence score or override foundation remains rejected without a concrete consumer or measured defect.

### RB-003 completed delivery

The intrinsic opening-profile foundation provides:

- version `2026-07-rules-v1`;
- deterministic ordered regex rules;
- family inheritance, safe lexical modifiers and narrow overrides;
- independent White and Black soundness, character, theoretical status, theory burden, roles and confidence;
- matched-rule provenance and explicit unknowns;
- asymmetric gambit handling, including Evans and Benko color directions;
- generated-book coverage and rule-usage auditing;
- no persistence, runtime AI, Stockfish audit, public contract or UI.

RB-018 completed the systematic rule-coverage and actual-game-audit expansion without reopening this method foundation.

### Stage 1 gate

Passed.

Tasks: RB-001, RB-002, RB-003.

## Stage 1A — opening-classification coverage

State: complete through RB-018 / #116 and PR #121.

Delivered:

- active version `2026-07-rules-v2`;
- deterministic rule-match coverage for all 3,733 entries and all 3,167 unique names in the pinned generated opening book;
- 114 active ordered rules rather than per-entry application storage;
- maintainable family expansion and corrected-regex modules;
- broad family defaults plus narrow soundness and gambit-role exceptions;
- grouped frequency-ranked unknown-family auditing;
- database-backed actual-game-weighted coverage auditing over existing imported-game opening metadata;
- CI artifacts and regression failure when a newly pinned generated name has no matching rule;
- explicit low confidence and `UNKNOWN` dimensions where a stronger semantic claim would be fabricated.

Explicit exclusions remain:

- Stockfish or engine-assisted auditing;
- runtime LLM calls;
- database classification storage or one record per generated row;
- API, Angular UI, background jobs or profile aggregation.

Gate: passed. Every pinned generated name has extractable characteristics and provenance. Rule-match coverage is not equivalent to high-confidence semantic completeness, and production-user weighting remains an operational audit against a populated database.

Task: RB-018.

## Stage 2 — Player Chess Profile

State: RB-004 is in `REVIEW` through PR #136; RB-005 remains blocked until RB-004 is accepted and integrated.

RB-004 review implementation provides:

- an authenticated deterministic calculation endpoint and shared wire contract;
- account, period, fixed speed-preset, color, rated-status and rating-context filters;
- selected-game baselines and explicit analysis coverage;
- separate preference exposure and performance measurements;
- side-aware opening-profile dimensions with rule/source provenance;
- deterministic sample and analysis evidence grades;
- bounded opening and game evidence with explicit truncation, omitted, low-confidence and unknown-dimension counts;
- multi-account tests and a bounded 1,200-game database-backed performance regression;
- no profile persistence, personality label, LLM, UI, candidate ranking or course write.

Goals:

- calculate preference and performance separately;
- preserve sample size, filters, baseline and confidence;
- support periods, accounts, agreed speed presets, colors and rating context;
- expose evidence and supporting games/openings;
- keep profile conclusions advisory;
- report low-confidence and unknown-dimension opening samples explicitly;
- consume completed RB-018 rule coverage without treating rule matching as semantic certainty.

Tasks: RB-004, RB-005.

Gate: pending review. The calculation contract must be accepted and integrated, then RB-005 must demonstrate that profile claims are reproducible, evidence-backed and useful enough to advise without constraining a target.

## Stage 3 — target and candidate decision model

State: RB-006 is ready; RB-007 remains blocked on RB-006. RB-008 supplies concrete visual data responsibilities.

Goals:

- define a repertoire target using one RB-001 speed preset and one peer/all/explicit rating target;
- keep factual level, profile recommendation and manual override separate;
- snapshot factual evidence only when resumability requires it;
- aggregate engine, master, population, personal, opening-profile and course evidence without collapsing sources;
- rank candidates with explicit reasons and visible missing evidence;
- return a resulting position, bounded preview, target/profile roles, burden, warnings and source metadata for each candidate;
- return explicit opponent-response relevance and coverage inputs.

Tasks: RB-006, RB-007, RB-013.

Gate: one position can produce a deterministic, explainable candidate comparison for a selected target.

## Stage 4 — visual decision proof

State: complete through accepted RB-008 direction in PR #110.

Accepted proof:

- a focused setup dialog launches the workflow;
- **Start building** closes the dialog and opens a routed workbench;
- Direction A is the production default: one primary board, candidate switcher, focused evidence, response queue and branch progress;
- candidate-attached target/profile roles remain;
- Direction B's simultaneous candidate landscape is rejected as the default;
- optional mini-board comparison is deferred.

Task: RB-008.

Gate: passed.

## Stage 5 — resumable builder foundation and MVP

State: blocked on target/ranking contracts and builder-session definition.

Goals:

- define branch queue, accepted decisions, deferred responses, target snapshot and draft lifecycle;
- implement the accepted setup dialog and routed board-first workbench;
- alternate user-move selection and opponent-response coverage;
- preserve selected, pending, deferred, ignored and completed states;
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

State: core tasks are proposed or blocked. RB-014 discovery is complete through PR #113, and RB-017 is the approved isolated traps pilot.

Goals:

- support multiple purposeful repertoires for the same opening;
- validate whether trap knowledge can be represented reproducibly and responsibly;
- determine whether a production trap-oriented capability is justified after the pilot;
- determine whether LLM explanation or orchestration adds value without becoming a factual dependency.

### RB-014 completed discovery

RB-014 established and the user approved:

- normalized position-and-move occurrence identity;
- optional trap-family grouping across related triggers;
- CC0 source candidates;
- versioned Stockfish evidence;
- rating/speed population evidence;
- explicit setup soundness, temptation, punishment, safe defenses, confidence, and provenance;
- editorial review and lifecycle state.

PR #113 adds no production schema, endpoint, UI, course write, or critical-path dependency. RB-006 and RB-007 remain unchanged.

### RB-017 bounded pilot

RB-017 / #114 is limited to:

- 20–50 source-controlled reviewed occurrences;
- deterministic legality, normalization, identity, duplicate, defense, and provenance validation;
- versioned Stockfish and bounded Opening Explorer snapshots;
- explicit missing/insufficient evidence;
- review output, tests, and documentation.

The pilot must not add Prisma persistence, a production import, REST/OpenAPI/MCP contracts, Angular UI, course writes, or builder integration.

Tasks: RB-013, RB-014, RB-017, RB-015.

Gate: RB-017 demonstrates whether the model survives reproducible engine/population validation, including at least one downgrade or rejection of folklore. A separate user decision is required before production work.

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

- review of RB-004 Player Chess Profile calculation;
- RB-006 repertoire-target contract;
- RB-017 bounded traps data/validator pilot.

High-collision areas requiring coordination:

- opening-profile consumer contracts;
- Opening Explorer cache/provenance changes;
- rating-normalization profile or resolver-policy changes;
- imported-game/account evidence aggregation;
- target/candidate schemas;
- builder state and persistence;
- production workbench/board composition;
- course reintegration writes;
- any future trap evidence added to candidate contracts.

Future opening-book updates are normal maintenance under the completed RB-003/RB-018 contract. RB-017 must remain isolated from high-collision production areas. Live Explorer refreshes must be bounded and deterministic tests must use fixtures.

## Queue impact

- RB-001 remains order 10, P0, `DONE`.
- RB-002 remains order 20, P0, `DONE`.
- RB-003 remains order 30, P0, `DONE`.
- RB-018 is order 35, P1, `DONE` through PR #121.
- RB-008 remains order 40, P1, `DONE`.
- RB-004 is order 50, P1, `REVIEW` through PR #136.
- RB-005 remains blocked until accepted RB-004 integration.
- RB-006 remains `READY` and is the next ordered unclaimed task.
- RB-007 remains blocked on RB-006.
- RB-014 remains order 140, P2, `DONE`.
- RB-017 remains order 145, P2, `CLAIMED`.
- No existing priority changes and no new task are required.
- No production traps capability is approved.
