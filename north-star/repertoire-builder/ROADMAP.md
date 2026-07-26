# Repertoire Builder Roadmap

Last updated: 2026-07-26

This roadmap orders capability stages and decision gates. Detailed execution belongs in individual task files.

## Stage 0 — program foundation

State: complete on `main` through PR #81, with later planning reconciliation through PR #83.

Deliverables:

- stable foundation agreements;
- north-star experience description;
- feature catalog;
- ordered task queue;
- claim and completion-report protocol;
- explicit decisions and open questions;
- Jira Epic `CRT-2` and one-to-one Tasks `CRT-3` through `CRT-18`.

Gate: passed for execution; later revisions remain governed by repository/Jira synchronization.

## Stage 1 — reusable evidence foundations

State: active. PR #80 and PR #76 are merged; RB-001 is the next actionable P0 task.

### Runtime baseline

PR #80 provides the shared rated Lichess Opening Explorer, mixed filter-profile cache and Peer games widget.

PR #76 provides the current cross-pool normalization profile, contracts, helpers, tests and documentation.

### Revised delivery direction

RB-001 will simplify the product surface rather than add weighted per-speed aggregation:

- fixed speed presets: All speeds, Blitz and slower, Blitz, Bullet;
- no ultraBullet;
- one rating target: All players, My peers, My peers plus one band, or one explicit Lichess group;
- server-controlled public-game period;
- one mixed Lichess request and one mixed cache profile;
- direct requested/effective filter provenance;
- a new versioned Lichess-benchmark normalization profile;
- Chess.com mappings into those benchmark bands;
- a reusable on-demand peer-band resolver using recent three-month games, then all history, then a generic fallback;
- compact two-select Peer games UI.

Client-side per-speed weighting, separate component calls and arbitrary product-facing speed combinations are not Stage 1 requirements.

RB-002 follows RB-001 and turns the shared benchmark/resolver boundary into a durable multi-account player-level projection with confidence, exclusions and overrides.

RB-003 remains the independent opening-classification dependency.

### Goals

- query one position for a compact, reproducible peer-population target;
- align product levels directly with Lichess Explorer's supported rating groups;
- convert Chess.com evidence into the same versioned benchmark bands;
- resolve and explain a user's temporary peer range without requiring the full profile system;
- preserve source, effective speeds/groups, sample size, cache state and policy versions;
- establish a durable multi-account player-level model after the shared resolver exists;
- establish the opening-classification dependency independently.

### Standalone value

Already available:

- rated Peer games evidence in Opening Analysis;
- reusable Opening Explorer API, contracts, cache and Angular widget;
- distinct Masters and rated Lichess sources;
- current cross-pool rating-normalization API and lab reference table.

Remaining:

- compact peer presets and automatic peer targeting;
- Lichess-benchmark profile version;
- reusable durable multi-account player level;
- reusable opening taxonomy.

Tasks: RB-001, RB-002, RB-003.

Gate:

- the Peer games product uses fixed presets and no raw month/checkbox filter matrix;
- My peers and My peers plus one resolve deterministically with visible provenance;
- one mixed Lichess response is accepted as the target population for the selected preset;
- the active benchmark profile is versioned, tested and documented;
- durable player-level inputs, exclusions, contributions, confidence and overrides are inspectable;
- an opening-profile contract is available or a deliberately limited fallback is approved.

## Stage 2 — Player Chess Profile

Goals:

- calculate preference and performance separately;
- preserve sample size, filters, baseline and confidence;
- provide a recalculable visual profile for periods, accounts, speed presets, colors and rating context;
- expose evidence and supporting games/openings;
- reference the durable RB-002 player-level projection without duplicating it;
- allow conclusions to be corrected or ignored for future builder setup.

Standalone value: a complete product capability independent of the builder.

Tasks: RB-004, RB-005.

Gate: profile claims are reproducible, evidence-backed and useful enough to advise but not constrain a repertoire target.

## Stage 3 — target and candidate decision model

Goals:

- define a repertoire target using RB-001 speed/rating presets, persona, theory, coverage and risk;
- snapshot or reference factual RB-002 peer evidence while preserving manual override;
- aggregate engine, master, population, personal, opening-profile and course evidence without collapsing sources;
- rank candidates with explicit reasons and visible missing evidence.

Tasks: RB-006, RB-007, RB-013.

Gate: for one position, the system can produce a deterministic, explainable candidate comparison for a selected target.

## Stage 4 — visual decision proof

Goal: prove how a player visually compares move choices and consequences before production builder architecture is locked.

Requirements:

- realistic position data;
- desktop and mobile consideration;
- candidate selection, evidence and tradeoffs;
- opponent coverage view;
- clear distinction between factual player level, profile suggestion and target override.

Task: RB-008.

This may start in parallel using verified Peer games data plus explicit mocks for unresolved player-level and target evidence. It must use the revised preset direction rather than the current checkbox UI as the future contract.

Gate: one reviewed interaction direction demonstrates an understandable, genuinely visual workflow.

## Stage 5 — resumable builder foundation and MVP

Goals:

- define branch queue, accepted decisions, deferred responses, target snapshot and draft lifecycle;
- implement a routed, resumable workbench;
- alternate user-move selection and opponent-response coverage;
- produce a previewable repertoire tree.

Tasks: RB-009, RB-010.

Gate: a user can build one bounded repertoire slice, leave and resume if persistence is approved, and inspect the draft before writing a course.

## Stage 6 — course materialization and adaptation

Goals:

- preview and apply accepted trees through current course-writing patterns;
- create or merge lines safely;
- enter the builder from gaps, endings, deviations or weak choices;
- preserve conflicts, transpositions, ownership and revision behavior.

Tasks: RB-011, RB-012.

Gate:

- generated decisions become trainable course material safely;
- existing courses use the same workflow rather than a parallel recommendation system.

## Stage 7 — specialized personas and optional intelligence

Goals:

- support multiple purposeful repertoires for the same opening;
- research traps representation and data;
- determine whether LLM explanation/orchestration adds value without becoming a factual dependency.

Tasks: RB-013, RB-014, RB-015.

Gate: optional capabilities have explicit evidence, safety, data and architecture decisions before implementation.

## Stage 8 — outcome feedback

Goals:

- measure whether built and trained choices appear in later games;
- distinguish adoption, recall, opening-position quality and results;
- identify regression and newly relevant coverage;
- feed validated outcomes back into profile and course maintenance.

Task: RB-016.

Gate: the program can evaluate whether recommendations improve real opening outcomes rather than merely producing larger courses.

## Parallel-delivery guidance

Safe early parallel tracks:

- RB-001 implementation;
- independent RB-003 planning/classification work;
- RB-008 visual prototype using the revised presets and explicit mocks;
- RB-014 traps research.

Do not implement RB-002 against the old 13-grade model while RB-001 is replacing the active benchmark bands.

High-collision areas:

- rating-normalization schema/profile changes;
- shared peer resolver and player-level contracts;
- Opening Explorer cache-profile and provenance changes;
- target preset contracts;
- opening-profile identifiers;
- builder persistence;
- course reintegration writes.

## Critical path

```text
RB-001 peer presets / benchmark bands / temporary resolver
        ↓
RB-002 durable player level
        +
RB-003 opening profile
        ↓
RB-004/005 Player Chess Profile
        ↓
RB-006 target contract
        ↓
RB-007 candidate evidence/ranking
        +
RB-008 visual proof
        ↓
RB-009/010 builder
        ↓
RB-011/012 course delivery and adaptation
        ↓
RB-016 feedback
```

## Reprioritization impact

- RB-001 remains order 10, P0 and `READY`, with revised scope.
- RB-002 remains order 20 and P0 but becomes `BLOCKED` on RB-001.
- RB-006 must use fixed presets and peer targets rather than arbitrary weighted speed sets.
- Other downstream blocked states remain valid.
- No task is completed by this planning revision.

## Reprioritization rules

Reprioritize when:

- a shared contract changes;
- profile calculations show opening classification is insufficient;
- visual discovery invalidates proposed endpoint/state boundaries;
- a smaller standalone delivery removes a major risk;
- a dependency is delayed and independent work can advance safely;
- completion reports identify missing tasks or obsolete assumptions.

Every completion report must explicitly state whether this roadmap remains valid.
