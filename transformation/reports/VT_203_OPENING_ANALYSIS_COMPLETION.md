# VT-203 Opening Analysis Completion

Date: 2026-07-29

Issue: #129

Implementation pull request: #183

Squash commit: `3f84b0203e25ba7b63b4daeadbaacf8f90c4d41d`

## Disposition

VT-203 is complete and integrated into `main`.

The user explicitly approved integration on 2026-07-29 without performing the direct browser checklist. Browser feedback is intentionally deferred for a later consolidated review rather than represented as observed validation.

## Delivered

- shared `AnalysisWorkbenchComponent` composition instead of a page-local duplicate board/side grid;
- retained `AnalysisBoardComponent` ownership of the board, toolbar, evaluation bar, engine arrow, and Stockfish panel;
- projected current line, course suggestions, performance, next moves, Masters, Peers, opening breakdowns, and recent games through the established workbench slots;
- derived current-line, perspective, filter-summary, and visible-tool context without duplicate state;
- production-role presentation scoped to Opening Analysis while preserving unrelated shared-widget consumers;
- responsive alignment with the shared 980px workbench and 640px compact thresholds;
- focused context-derivation coverage;
- documented Games/Study/Opening Analysis candidates for VT-204 comparison.

## Preserved boundaries

- guarded lazy `/opening-analysis` route and page ownership;
- `OpeningAnalysisStore` position history, filters, perspective, widget state, stale-request handling, engine lifecycle, and navigation ownership;
- `PositionGameMovesApiService` typed HTTP ownership;
- current FEN, line label, last move, board version, move commands, filter commands, and opening/tag selection;
- engine visibility, evaluation, best-move arrow, start/stop behavior, and worker ownership;
- Tags, Masters, Peers, Last games, Engine, free-analysis deep link, and Lichess bot challenge behavior;
- backend, API, contract, schema, database, engine algorithm, imported-game filter model, Games, Study, dependencies, and final mobile navigation.

## Validation

CI #1392 passed the complete repository workflow on the corrected implementation head.

CI #1394 passed the same complete workflow on the exact documentation head.

Both covered dependency installation, lint, full build and Angular template/type compilation, both opening audits, architecture guardrails, migrations, and the complete test suite.

CI #1389 and #1391 exposed focused-spec issues only: mutation through a read-only signal type and an expectation that did not reflect the existing `blitz,rapid` default. Both corrections were test-only.

## Deferred browser feedback

The unperformed browser checklist remains useful for later consolidated feedback:

- shared board/workbench hierarchy and board width;
- engine shown and hidden, evaluation bar, arrow, and Stockfish panel;
- White and Black filter perspectives;
- Left-arrow and Home shortcuts outside form controls;
- next-move selection and resulting FEN, history, and context updates;
- collapsed and expanded filters, apply, reset, and refresh;
- Tags, Masters, Peers, Last games, and Engine toggles independently and in dense combinations;
- course, opening, performance-tag, Masters, and Peers move selection;
- long line, opening, player, and filter-summary labels;
- loading, error, empty, placeholder, and long-list states where reproducible;
- 980px workbench stacking and 640px compact context stacking;
- keyboard focus and reduced-motion behavior.

These items are deferred product-review evidence, not blockers to the completed integration.
