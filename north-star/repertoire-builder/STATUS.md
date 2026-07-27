# Repertoire Builder Program Status

Last updated: 2026-07-27

## Current state

**Program state:** RB-001, RB-002 and RB-008 are complete; RB-003 remains the unresolved P0 foundation. RB-008 accepted a focused setup dialog that launches a routed board-first workbench.

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

Artifacts: `prototypes/rb-008-visual-candidate-choice/`.

Report: `reports/RB-008-2026-07-26-visual-candidate-prototype-review.md`.

## Repository and GitHub issue state

- RB-001 / [#89](https://github.com/vokerg/chess_repertoir_trainer/issues/89): `DONE`.
- RB-002 / [#90](https://github.com/vokerg/chess_repertoir_trainer/issues/90): `DONE` through RB-001 delivery evidence and closure PR #107.
- RB-003 / [#91](https://github.com/vokerg/chess_repertoir_trainer/issues/91): `PROPOSED`, P0, independent and still requires scope discovery.
- RB-008 / [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96): `DONE` through accepted PR #110 direction.
- RB-014 / [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102): independent P2 ready research stream.
- Jira coordination is retired; `CRT-2` through `CRT-18` are historical migration records.

## Dependency impact

- RB-004 remains blocked on RB-003 and consumes completed RB-001/RB-002 evidence.
- RB-006 remains blocked on RB-003 and now owns the accepted setup-dialog target fields and override semantics.
- RB-007 remains blocked on RB-003 and RB-006 and now owns candidate/response evidence responsibilities for the accepted board-first surface.
- RB-009 owns routed session, branch queue, draft and resume semantics.
- RB-010 owns production implementation of the setup dialog and routed board-first workbench.

## Validation

RB-008 validation includes:

- Chromium/Playwright rendering of the original alternatives at 1440 × 1100 and 390 × 844;
- candidate switching and arrow-key navigation;
- response cover/defer/ignore interaction and cumulative coverage updates;
- responsive behavior, visible focus, semantic controls and readable board size;
- complete repository CI on PR #110.

No production runtime code changed.

## Residual risks

- Chess.com band boundaries remain approximate product mappings.
- Duplicate copies across owned accounts may contribute more than once to factual level evidence.
- Direction A may later need an explicit structural-comparison mode.
- Theory-burden and response-coverage semantics remain pending RB-007/RB-009.
- Production implementation must reinspect the current visual-transformation branch and approved Angular primitives.

## Queue recommendation

Keep order and priority unchanged. RB-003 remains the unresolved P0 foundation. RB-014 remains the next independent `READY` task if parallel work is desired. No new production UI task is required because RB-006, RB-007, RB-009 and RB-010 already own the downstream work.
