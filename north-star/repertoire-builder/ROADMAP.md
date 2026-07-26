# Repertoire Builder Roadmap

Last updated: 2026-07-26

This roadmap orders capability stages and decision gates. Detailed execution belongs in individual task files.

## Stage 0 — program foundation

State: complete on the foundation branch; review pending.

Deliverables:

- stable foundation agreements;
- north-star experience description;
- feature catalog with standalone value and maturity;
- ordered task queue;
- claim and completion-report protocol;
- open decisions and questions recorded explicitly.

Gate:

- user reviews the planning workspace and approves or revises the program foundation.

## Stage 1 — reusable evidence foundations

Goals:

- integrate speed- and rating-targeted population evidence through a reusable contract;
- support arbitrary speed combinations and controlled General weighting;
- resolve an inspectable player level across multiple accounts using rating normalization;
- establish the opening-classification dependency through an independent delivery.

Standalone value:

- stronger opening analysis;
- reusable rating and player-strength views;
- reusable opening taxonomy.

Tasks:

- RB-001, RB-002, RB-003.

Gate:

- one position can be queried for the selected speed/rating population;
- player-level inputs are explainable and overrideable;
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
- clear distinction between profile recommendation and target choice.

Task:

- RB-008.

This task may start in parallel with Stage 2 or early Stage 3 using explicit mock contracts, but production implementation waits for its reviewed output.

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

- population explorer implementation/integration;
- rating normalization and player-level discovery;
- independent opening classification;
- visual candidate-choice prototypes;
- traps definition research, provided it does not block the core plan.

High-collision areas that should not proceed independently without coordination:

- shared candidate contracts;
- rating-normalization schema changes;
- opening-profile identifiers;
- builder persistence models;
- course reintegration writes;
- route registration and primary Angular builder state.

## Reprioritization rules

Reprioritize when:

- parallel work changes a required contract;
- profile calculations show opening classification is insufficient;
- visual discovery invalidates proposed endpoint or state boundaries;
- a smaller standalone delivery removes a major risk;
- a dependency is delayed and an independent task can advance safely;
- completion reports identify missing tasks or obsolete assumptions.

Every completion report must explicitly state whether this roadmap remains valid.
