# Repertoire Builder Roadmap

Last updated: 2026-07-27

This roadmap orders capability stages and decision gates. Detailed execution belongs in individual task files.

## Stage 0 — program foundation

State: complete on `main` through PR #81, planning reconciliation PR #83, GitHub Issues migration PR #106 and RB-002 closure PR #107.

Gate: passed.

## Stage 1 — reusable evidence foundations

State: active. RB-001 and RB-002 are complete; RB-003 remains the only unresolved Stage 1 foundation.

Merged baseline:

- PR #80: shared Masters/rated Opening Explorer and Peer games widget;
- PR #76: previous rating-normalization profile and reference UI;
- PR #84: fixed peer-population presets, Lichess-benchmark normalization, provider-aware multi-account resolver and compact Peer games UI;
- PR #106: GitHub Issues execution migration;
- PR #107: RB-002 closure reconciliation.

Stage 1 gate remains open until RB-003 opening classification is delivered or a deliberately limited fallback is explicitly approved.

Tasks: RB-001, RB-002, RB-003.

## Stage 2 — Player Chess Profile

State: blocked on RB-003. It consumes the completed factual player-level and population boundary from RB-001/RB-002.

Goals:

- calculate preference and performance separately;
- preserve sample size, filters, baseline and confidence;
- support periods, accounts, speed presets, colors and rating context;
- expose evidence and supporting games/openings;
- keep profile conclusions advisory.

Tasks: RB-004, RB-005.

Gate: profile claims are reproducible, evidence-backed and useful enough to advise without constraining a target.

## Stage 3 — target and candidate decision model

State: blocked on opening-profile and target/profile dependencies. RB-008 supplies accepted visual data responsibilities.

Goals:

- define a repertoire target using one RB-001 speed preset and one peer/all/explicit rating target;
- populate a focused setup dialog with side, start, persona, coverage and override state;
- keep factual level, profile recommendation and manual target separate;
- aggregate engine, master, population, personal, opening-profile and course evidence without collapsing sources;
- return resulting position, bounded preview, target/profile roles, burden, warnings and source metadata for each candidate;
- return explicit opponent-response relevance and coverage inputs.

Tasks: RB-006, RB-007, RB-013.

Gate: one position can produce a deterministic, explainable candidate comparison for a selected target.

## Stage 4 — visual decision proof

State: complete through RB-008 and PR #110.

Accepted direction:

- setup is a focused dialog;
- Start building closes the dialog and opens a routed workbench;
- the recursive workbench is board-first with one readable primary board;
- candidates switch board and focused evidence;
- opponent responses use a coverage queue with explicit branch states;
- target fit and profile fit remain separate;
- the simultaneous candidate-landscape direction is rejected as the default because it is too heavy;
- explicit mini-board comparison is deferred unless later evidence justifies it.

Task: RB-008.

Gate: passed by user acceptance on 2026-07-27.

## Stage 5 — resumable builder foundation and MVP

State: blocked on target/ranking contracts, not on further visual discovery.

Goals:

- define branch queue, accepted decisions, deferred responses, target snapshot and draft lifecycle;
- implement the focused setup dialog;
- implement the routed, resumable board-first workbench;
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
- RB-014 traps research.

High-collision areas requiring coordination:

- opening-profile contracts;
- Opening Explorer cache/provenance changes;
- rating-normalization profile or resolver-policy changes;
- imported-game/account evidence aggregation;
- target/candidate schemas;
- builder state and persistence;
- production setup dialog and workbench composition;
- course reintegration writes.

## Queue impact

- RB-001 remains order 10, P0, `DONE`.
- RB-002 remains order 20, P0, `DONE`.
- RB-003 remains order 30, P0, `PROPOSED`.
- RB-008 remains order 40, P1, now `DONE`.
- RB-014 remains order 140, P2, `READY` and independent.
- No order or priority change is recommended.
- No new task is required.

Every completion report must explicitly state whether this roadmap remains valid.
