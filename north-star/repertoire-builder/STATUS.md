# Repertoire Builder Program Status

Last updated: 2026-07-26

## Current state

**Program state:** RB-001 and RB-002 are complete; RB-003 remains the unresolved P0 foundation; RB-008 has delivered two responsive visual directions and is in user review through PR #110.

**Runtime on `main`:** squash commit `49dc6499eac9998de864ccb75a607541cd945382` from PR #84 provides the Lichess-benchmark profile, provider-aware multi-account peer resolver, preset Opening Explorer API, compact Peer games UI, tests and runtime documentation.

**GitHub program tracker:** [#105 — Repertoire Builder North Star program](https://github.com/vokerg/chess_repertoir_trainer/issues/105), open.

## RB-001 and RB-002 delivered scope

Available on `main`:

- speed presets: All speeds, Blitz and slower, Blitz, Bullet;
- rating targets: All players, My peers, My peers and above, one explicit Lichess group;
- defaults: Blitz and slower plus My peers and above;
- no ultraBullet or public-game month controls;
- one mixed Lichess request and the existing deterministic cache architecture;
- active normalization version `2026-07-lichess-bands-v1` with nine Lichess Explorer bands;
- historical `2026-07-product-v1` profile preserved;
- Chess.com and Lichess provider/speed classification through the established correlation matrix;
- multi-account game-count-weighted normalized band distribution;
- recent-three-month, all-history and generic 1400–1599 fallback;
- `dominant-contiguous-window-v1`: shortest one-to-three-band window covering at least 70%;
- full distribution, selected groups, eligible-game count, evidence period and account/provider/speed contributions;
- direct population and resolver provenance;
- two native filter selects and resolved-population summary;
- focused contracts, API, resolver, cache, OpenAPI and Angular tests;
- canonical rating-normalization and Opening Explorer documentation.

RB-002 is closed as delivered by this merged RB-001 implementation. A separate durable formula, exact universal number, persistence model, confidence score or override foundation is not justified without a concrete consumer or measured defect.

## RB-008 visual review

Issue [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96) is `REVIEW` on PR [#110](https://github.com/vokerg/chess_repertoir_trainer/pull/110).

Artifacts under `prototypes/rb-008-visual-candidate-choice/` compare:

- **Direction A — board-first decision desk:** one large shared board, keyboard-switchable candidates, focused evidence, opponent-response coverage queue and branch-progress strip;
- **Direction B — candidate landscape:** simultaneous resulting-position mini-boards, candidate-attached evidence and a response coverage matrix.

Both demonstrate:

- sharp-versus-solid choice;
- profile recommendation versus explicit target intent;
- engine, selected-population, master, personal and theory-burden evidence;
- selected, pending, deferred and ignored branch states;
- cumulative first-pass coverage;
- desktop and 390px mobile behavior.

Provisional recommendation pending user review: Direction A as the default workbench, borrowing candidate-attached target/profile labels and an optional mini-board compare mode from Direction B.

Report: `reports/RB-008-2026-07-26-visual-candidate-prototype-review.md`.

## Repository and GitHub issue state

- RB-001 / [#89](https://github.com/vokerg/chess_repertoir_trainer/issues/89): `DONE`.
- RB-002 / [#90](https://github.com/vokerg/chess_repertoir_trainer/issues/90): `DONE` through RB-001 delivery evidence and closure PR #107.
- RB-003 / [#91](https://github.com/vokerg/chess_repertoir_trainer/issues/91): `PROPOSED`, P0, independent and still requires scope discovery.
- RB-008 / [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96): `REVIEW`; user visual decision pending on PR #110.
- RB-014 / [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102): remains an independent P2 ready research stream.
- Jira coordination is retired; `CRT-2` through `CRT-18` are historical migration records.

## Dependency impact

- RB-004 remains blocked on RB-003 and consumes completed RB-001/RB-002 evidence.
- RB-006 remains blocked on RB-003; PR #110 now provides concrete target-display and override-separation requirements.
- RB-007 remains blocked on RB-003 and RB-006; PR #110 now provides concrete candidate/response evidence responsibilities.
- RB-009/RB-010 remain blocked on contract direction and the final RB-008 review decision.

## Validation

RB-001 implementation CI passed before PR #84 merged.

RB-002 closure PR #107 passed lint, build, architecture checks, migrations and complete tests before squash merge.

RB-008 local validation performed:

- Chromium/Playwright rendering at 1440 × 1100 and 390 × 844;
- candidate switching and arrow-key navigation;
- response cover/defer/ignore interaction and cumulative coverage updates;
- responsive stacking and scroll snapping;
- visible focus, semantic controls, status text and readable board size.

PR #110 repository CI is required before review readiness. No production runtime code changed.

## Residual risks

- Chess.com band boundaries remain approximate product mappings.
- Duplicate copies across owned accounts may contribute more than once to factual level evidence.
- Direction A may need stronger structural comparison.
- Direction B risks small boards, card overload, horizontal mobile density and sticky-overlay complexity.
- Theory-burden and response-coverage semantics are mock responsibilities pending RB-007/RB-009.
- Production implementation must reinspect the current visual-transformation branch and approved Angular primitives.

## Queue recommendation

Keep order and priority unchanged during review. Do not create a production UI task until the user selects Direction A, Direction B, the proposed hybrid, or requests a third direction. RB-003 remains the unresolved P0 foundation; RB-014 remains the next independent `READY` task if parallel work is desired.
