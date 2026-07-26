# Repertoire Builder Roadmap

Last updated: 2026-07-26

This roadmap orders capability stages and decision gates. Detailed execution belongs in individual task files.

## Stage 0 — program foundation

State: complete on `main` through PR #81.

Deliverables:

- stable foundation agreements;
- north-star experience description;
- feature catalog with standalone value and maturity;
- ordered task queue;
- claim and completion-report protocol;
- open decisions and questions recorded explicitly;
- Jira Epic `CRT-2` and one-to-one Tasks `CRT-3` through `CRT-18`.

Gate:

- passed for execution; later revisions remain governed by the repository and Jira synchronization protocol.

## Stage 1 — reusable evidence foundations

State: active, with two merged foundations and two actionable P0 tasks.

PR #80 delivered the reusable rated Lichess evidence baseline and Opening Analysis consumer. RB-001 remains `READY`, not complete, because product-level weighting, per-speed explainability, direct filter provenance, own-level/grade-offset targeting, and sparse-data semantics remain.

PR #76 delivered the versioned cross-pool rating-normalization profile, contracts, helpers, API, reference UI, tests, and documentation. RB-002 is now `READY`, not complete, because the multi-account player-level formula and evidence projection remain unresolved.

Goals:

- complete speed- and rating-targeted population evidence through the shared Opening Explorer contract;
- support arbitrary speed combinations and controlled General weighting;
- expose the component evidence and selected filters needed to explain population aggregates;
- resolve an inspectable player level across multiple accounts using the merged rating-normalization profile;
- map own-level and stronger-level targets back to supported provider/speed ranges and population buckets;
- establish the opening-classification dependency through an independent delivery.

Standalone value already available:

- rated Peer games evidence in Opening Analysis;
- reusable shared Opening Explorer API, contracts, cache, and Angular widget;
- distinct Masters and rated Lichess evidence sources;
- versioned rating grades for Chess.com and Lichess bullet, blitz, and rapid;
- rating-grade API, classification/range helpers, source confidence, soft padding, and lab reference table.

Remaining standalone value:

- controlled population weighting and explainable aggregate evidence;
- reusable multi-account player-level calculation and contribution view;
- reusable opening taxonomy.

Tasks:

- RB-001, RB-002, RB-003.

Gate:

- one position can be queried for the selected speed/rating population — raw source filtering is available; controlled product aggregation remains;
- weighted combinations expose enough source components and filter provenance to remain explainable;
- player-level inputs, exclusions, contributions, confidence, profile version, and overrides are inspectable;
- own-level and one-or-more-grades-above targets translate deterministically to supported source ranges;
- an opening-profile contract is available or a deliberately limited fallback is approved.

## Stage 2 — Player Chess Profile

Goals:

- calculate preference and performance separately;
- preserve sample size, filters, baseline, and confidence;
- provide a recalculable visual profile for periods, accounts, speeds, colors, and rating context;
- expose evidence and supporting games/openings;
- allow conclusions to be corrected or ignored for future builder setup.

Standalone value:

- a complete new product capability independent of the builder.

Tasks:

- RB-004, RB-005.

Gate:

- profile claims are reproducible, evidence-backed, and useful enough to influence but not constrain a repertoire target.

## Stage 3 — target and candidate decision model

Goals:

- define a repertoire target supporting speed combinations, rating goals, persona, theory, coverage, and risk;
- aggregate engine, master, population, personal, opening-profile, and course evidence without collapsing sources;
- rank candidates with explicit reasons and visible missing evidence;
- support profile-derived defaults and user overrides.

Tasks:

- RB-006, RB-007, RB-013.

Gate:

- for a single position, the system can produce a deterministic, explainable candidate comparison for a selected target.

## Stage 4 — visual decision proof

Goal:

- prove how a player visually compares move choices and consequences before production builder architecture is locked.

Requirements:

- realistic position data;
- desktop and mobile consideration;
- candidate selection, evidence, and tradeoffs;
- opponent coverage view;
- clear distinction between factual player-level evidence, profile recommendation, and target choice.

Task:

- RB-008.

This task may start in parallel with Stage 2 or early Stage 3. It may use verified Peer games responses from PR #80 and rating-grade metadata from PR #76 plus explicit mock extensions for unresolved player-level, weighted, and component evidence. Production implementation waits for reviewed contract and interaction output.

Gate:

- one reviewed interaction direction demonstrates that the workflow is understandable and genuinely visual.

## Stage 5 — resumable builder foundation and MVP

Goals:

- define branch queue, accepted decisions, deferred responses, target snapshot, and draft lifecycle;
- implement a routed, resumable workbench;
- alternate user-move selection and opponent-response coverage;
- produce a previewable repertoire tree.

Tasks:

- RB-009, RB-010.

Gate:

- a user can build one bounded repertoire slice, leave and resume if persistence is approved, and inspect the complete draft before writing a course.

## Stage 6 — course materialization and adaptation

Goals:

- preview and apply accepted trees through current course-writing patterns;
- create a new line/course or merge into existing material as supported;
- enter the builder from gaps, endings, deviations, or weak choices;
- preserve conflicts, transpositions, ownership, and course revision behavior.

Tasks:

- RB-011, RB-012.

Gate:

- generated decisions become trainable course material safely;
- existing courses can use the same workflow without a parallel recommendation system.

## Stage 7 — specialized personas and optional intelligence

Goals:

- support multiple purposeful repertoires for the same opening;
- research traps representation and data;
- determine whether LLM explanation or orchestration adds value without becoming a factual dependency.

Tasks:

- RB-013, RB-014, RB-015.

Gate:

- optional capabilities have explicit evidence, safety, data, and architecture decisions before implementation.

## Stage 8 — outcome feedback

Goals:

- measure whether built and trained repertoire choices appear in later games;
- distinguish adoption, recall, opening-position quality, and results;
- identify regression and newly relevant coverage;
- feed validated outcomes back into profile and course maintenance.

Task:

- RB-016.

Gate:

- the program can evaluate whether recommendations improve the player's real opening outcomes rather than only producing larger courses.

## Parallel-delivery guidance

Safe or useful early parallel tracks:

- RB-001 weighting, component explainability, filter provenance, and sparse-data semantics on top of the merged Opening Explorer baseline;
- RB-002 multi-account level discovery and implementation on top of the merged rating-normalization baseline;
- independent opening classification;
- visual candidate-choice prototypes using verified source data and grade metadata plus clearly marked mock extensions;
- traps definition research, provided it does not block the core plan.

Coordination boundary between RB-001 and RB-002:

- RB-002 owns account evidence, normalized player-level resolution, confidence, and grade-offset source ranges;
- RB-001 owns population query/aggregation semantics for a selected target;
- a shared boundary must not duplicate profile IDs, grade IDs, source ranges, or confidence metadata.

High-collision areas that should not proceed independently without coordination:

- shared population, player-level, and candidate contracts;
- Opening Explorer cache-profile or response-provenance changes;
- rating-normalization schema or profile changes;
- opening-profile identifiers;
- builder persistence models;
- course reintegration writes;
- route registration and primary Angular builder state.

## Reprioritization impact of PR #80 and PR #76

- RB-001 remains order 10, P0, and `READY` after PR #80.
- RB-002 remains order 20 and P0, but changes from `BLOCKED` to `READY` after PR #76 merged.
- RB-008 can use real Peer games and rating-grade evidence earlier, reducing mock-data risk, but must not assume raw multi-speed aggregation or single-rating classification is final product policy.
- RB-004 and RB-006 remain blocked because they require the completed RB-002 player-level result, not only its normalization prerequisite.
- Other downstream tasks remain blocked because the remaining RB-001 semantics, RB-002 outcome, and RB-003 are still required.
- No task is complete solely because PR #80 or PR #76 merged.
- No task order or priority change is recommended.

## Reprioritization rules

Reprioritize when:

- parallel work changes a required contract;
- profile calculations show opening classification is insufficient;
- visual discovery invalidates proposed endpoint or state boundaries;
- a smaller standalone delivery removes a major risk;
- a dependency is delayed and an independent task can advance safely;
- completion reports identify missing tasks or obsolete assumptions.

Every completion report must explicitly state whether this roadmap remains valid.
