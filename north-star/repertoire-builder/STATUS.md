# Repertoire Builder Program Status

Last updated: 2026-07-27

## Current state

**Program state:** RB-001, RB-002 and RB-008 are complete; RB-003 remains the unresolved P0 foundation. RB-014 traps-foundation discovery is in review through PR #113.

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

## RB-014 traps discovery

Issue [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102) is `REVIEW` through draft PR [#113](https://github.com/vokerg/chess_repertoir_trainer/pull/113).

Report: `reports/RB-014-2026-07-27-traps-foundation-discovery.md`.

Recommendation:

- proceed with a bounded 20–50 example curated pilot only after user approval;
- identify trap occurrences by normalized trigger position and ordered move transitions, not opening name;
- combine CC0 source candidates, versioned engine evidence, target-population evidence, and editorial review;
- represent setup soundness, temptation, punishment, safe defenses, sample size, confidence, and provenance separately;
- treat related non-identical triggers as one family with separate occurrences;
- do not add production persistence, API, Angular UI, course writes, or RB-006/RB-007 contract changes now.

Source/license findings:

- Lichess game, puzzle, and evaluated-position exports are suitable CC0 sources;
- `lichess-org/chess-openings` is suitable CC0 descriptive metadata;
- user-created studies, videos, blogs, books, and unlicensed trap collections are discovery leads only;
- user-generated Lichess content is not automatically CC0.

Validation boundary:

- repository architecture and official source/license mechanics were inspected;
- representative Légal, Blackburne–Shilling, and Fishing Pole examples test the proposed model;
- exact named-example Stockfish and authenticated Explorer snapshots were not available in this connector environment and are the proposed pilot's first hard gate;
- no engine values, success rates, or population percentages are invented.

## Repository and GitHub issue state

- RB-001 / [#89](https://github.com/vokerg/chess_repertoir_trainer/issues/89): `DONE`.
- RB-002 / [#90](https://github.com/vokerg/chess_repertoir_trainer/issues/90): `DONE` through RB-001 delivery evidence and closure PR #107.
- RB-003 / [#91](https://github.com/vokerg/chess_repertoir_trainer/issues/91): `PROPOSED`, P0, independent and still requires scope discovery.
- RB-008 / [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96): `DONE` through accepted PR #110 direction.
- RB-014 / [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102): `REVIEW` through PR #113.
- Jira coordination is retired; `CRT-2` through `CRT-18` are historical migration records.

## Dependency impact

- RB-004 remains blocked on RB-003 and consumes completed RB-001/RB-002 evidence.
- RB-006 remains blocked on RB-003 and owns the accepted setup-dialog target fields and override semantics; no trap field is added now.
- RB-007 remains blocked on RB-003 and RB-006 and owns candidate/response evidence; no trap-evidence contract is added now.
- RB-009 owns routed session, branch queue, draft and resume semantics.
- RB-010 owns production implementation of the setup dialog and routed board-first workbench.
- RB-014 remains independent and adds no critical-path blocker.

## Validation

RB-008 validation includes responsive prototype review and complete repository CI on PR #110.

RB-014 is documentation-only discovery. Source/license verification and repository inspection were completed. No application build is required for the research branch, but normal repository CI should pass before PR review.

## Residual risks

- Chess.com band boundaries remain approximate product mappings.
- Duplicate copies across owned accounts may contribute more than once to factual level evidence.
- Direction A may later need an explicit structural-comparison mode.
- Theory-burden and response-coverage semantics remain pending RB-007/RB-009.
- trap names are inconsistent and user-created source licensing is heterogeneous;
- a famous trap may be objectively dubious, practically obsolete, or statistically unsupported;
- transposition merging is unsafe when castling or en-passant rights differ;
- a trap-oriented persona could mislead users unless setup soundness and safe defenses remain prominent.

## Queue recommendation

Keep order and priority unchanged. RB-003 remains the unresolved P0 foundation. RB-014 remains non-blocking and awaits user review of the bounded-pilot recommendation. Do not create a production traps issue or modify RB-006/RB-007 before that approval.