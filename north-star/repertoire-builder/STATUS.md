# Repertoire Builder Program Status

Last updated: 2026-07-27

## Current state

**Program state:** RB-001, RB-002, RB-008 and RB-014 are complete; RB-003 remains the unresolved P0 foundation. RB-017 is the approved bounded traps data/validator pilot and is claimed through issue #114.

**Runtime on `main`:** squash commit `49dc6499eac9998de864ccb75a607541cd945382` from PR #84 provides the Lichess-benchmark profile, provider-aware multi-account peer resolver, preset Opening Explorer API, compact Peer games UI, tests and runtime documentation.

**GitHub program tracker:** [#105 — Repertoire Builder North Star program](https://github.com/vokerg/chess_repertoir_trainer/issues/105), open.

## Completed foundations

### RB-001 and RB-002

Available on `main`:

- fixed speed presets and rating targets;
- Lichess benchmark bands and versioned Chess.com mappings;
- provider/speed classification before aggregation;
- multi-account game-count-weighted normalized band distribution;
- recent-three-month, all-history and generic fallback;
- `dominant-contiguous-window-v1`;
- complete distribution, selected groups, evidence period and contribution provenance;
- compact Peer games UI and typed API contracts.

RB-002 is closed as delivered by this merged RB-001 implementation. No separate durable formula, exact universal number, persistence model, confidence score or override foundation is justified without a concrete consumer or measured defect.

### RB-008 visual direction

Issue [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96) is complete through PR [#110](https://github.com/vokerg/chess_repertoir_trainer/pull/110).

Accepted flow:

1. a focused setup dialog captures side, starting point, speed preset, rating target, persona and coverage/theory preferences;
2. **Start building** closes the dialog and opens a routed workbench;
3. the routed workbench uses one readable primary board, candidate switcher, focused evidence, opponent-response coverage queue and branch progress;
4. Direction B's simultaneous candidate landscape is rejected as the default because it is too heavy and reduces board readability;
5. candidate-attached target/profile roles remain; explicit mini-board comparison is deferred unless later evidence justifies it.

### RB-014 traps discovery

Issue [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102) is complete through squash-merged PR [#113](https://github.com/vokerg/chess_repertoir_trainer/pull/113), commit `d53ff6e2b6eedcbf5f3abcea137373baa0102397`.

Report: `reports/RB-014-2026-07-27-traps-foundation-discovery.md`.

Accepted conclusions:

- identify trap occurrences by normalized trigger position and ordered move transitions, not opening name;
- combine CC0 source candidates, versioned engine evidence, target-population evidence, and editorial review;
- represent setup soundness, temptation, punishment, safe defenses, sample size, confidence, and provenance separately;
- treat related non-identical triggers as one family with separate occurrences;
- keep production persistence, API, Angular UI, course writes, and RB-006/RB-007 contract changes out of the approved pilot.

Source/license findings:

- Lichess game, puzzle, and evaluated-position exports are suitable CC0 sources;
- `lichess-org/chess-openings` is suitable CC0 descriptive metadata;
- user-created studies, videos, blogs, books, and unlicensed trap collections are discovery leads only;
- user-generated Lichess content is not automatically CC0.

## RB-017 active pilot

Issue [#114](https://github.com/vokerg/chess_repertoir_trainer/issues/114) is the only approved traps implementation scope.

Claim branch: `rb-017/issue-114-traps-pilot-claim`.

Scope:

- 20–50 source-controlled reviewed occurrences;
- deterministic legality, normalization, identity, duplicate, defense, and provenance validation;
- versioned Stockfish and bounded Opening Explorer evidence snapshots;
- explicit insufficient-evidence states;
- human-readable review output;
- tests and documentation.

Explicit exclusions:

- no Prisma model or production import;
- no public API, OpenAPI, MCP, or Angular surface;
- no course writes;
- no repertoire-target or candidate-ranking contract changes;
- no unlicensed source copying;
- no fabricated values.

## Repository and GitHub issue state

- RB-001 / [#89](https://github.com/vokerg/chess_repertoir_trainer/issues/89): `DONE`.
- RB-002 / [#90](https://github.com/vokerg/chess_repertoir_trainer/issues/90): `DONE` through RB-001 delivery evidence and closure PR #107.
- RB-003 / [#91](https://github.com/vokerg/chess_repertoir_trainer/issues/91): `PROPOSED`, P0, independent and still requires scope discovery.
- RB-008 / [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96): `DONE` through accepted PR #110 direction.
- RB-014 / [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102): `DONE` through PR #113.
- RB-017 / [#114](https://github.com/vokerg/chess_repertoir_trainer/issues/114): `CLAIMED` for the bounded pilot.
- Jira coordination is retired; `CRT-2` through `CRT-18` are historical migration records.

## Dependency impact

- RB-004 remains blocked on RB-003 and consumes completed RB-001/RB-002 evidence.
- RB-006 remains blocked on RB-003 and owns the accepted setup-dialog target fields and override semantics; no trap field is added now.
- RB-007 remains blocked on RB-003 and RB-006 and owns candidate/response evidence; no trap-evidence contract is added now.
- RB-009 owns routed session, branch queue, draft and resume semantics.
- RB-010 owns production implementation of the setup dialog and routed board-first workbench.
- RB-017 remains independent and adds no critical-path blocker.

## Validation

RB-008 validation includes responsive prototype review and complete repository CI on PR #110.

RB-014 source/license verification, repository inspection, and complete repository CI passed on PR #113.

RB-017 must add deterministic offline fixture tests plus an explicit opt-in refresh path for live engine/population evidence, then pass lint, build, architecture guardrails, migrations, and the complete test suite.

## Residual risks

- Chess.com band boundaries remain approximate product mappings.
- Duplicate copies across owned accounts may contribute more than once to factual level evidence.
- Direction A may later need an explicit structural-comparison mode.
- Theory-burden and response-coverage semantics remain pending RB-007/RB-009.
- trap names are inconsistent and user-created source licensing is heterogeneous;
- a famous trap may be objectively dubious, practically obsolete, or statistically unsupported;
- transposition merging is unsafe when castling or en-passant rights differ;
- a trap-oriented persona could mislead users unless setup soundness and safe defenses remain prominent;
- live Explorer evidence is rate-limited and must not become a required deterministic test dependency.

## Queue recommendation

Keep order and priority unchanged. RB-003 remains the unresolved P0 foundation. Execute RB-017 as an isolated non-production pilot and require a new user review before any production traps capability or RB-006/RB-007 extension is proposed.