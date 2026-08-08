# VT-302 — Opening Analysis evidence workbench

Date: 2026-08-08

Issue: [#133](https://github.com/vokerg/chess_repertoir_trainer/issues/133)

Branch: `codex/opening-analysis-evidence-workbench`

Final review base: `main` `07d19790a20beedf79bb094fead2c48c76404912`

## Scope

This continuation slice reintegrates the approved Opening Analysis prototype hierarchy into the production Angular route while preserving the existing application typography, navigation, APIs, filters, engine lifecycle, board mechanics, course evidence, opening filters, and Challenge Bot.

It does not complete VT-302 and must not close issue #133.

## Audited ownership and consumers

Opening Analysis is a route-local composition backed by `OpeningAnalysisStore`. Imported personal evidence is supplied by `PositionGameMovesApiService`; Masters and Peers own their public-database requests inside their existing widgets. The prior four visibility booleans were used only by this page and its store/tests.

The engine UI has one production component chain:

1. `StockfishPanelComponent` renders live lines;
2. `AnalysisBoardComponent` owns the evaluation bar, best-move arrow, board and line panel;
3. `AnalysisWorkbenchComponent` composes the board with feature-owned side content.

The complete workbench consumer set was checked before changing that chain: Opening Analysis, Free Analysis, Game Detail, Line Editor, and tactical missed-shot analysis. Only Opening Analysis opts into the new row interaction.

The existing `CopyableLineComponent` has three established modes/consumers: linked lines in Opening Analysis and Opening Struggles, plus copy-button-only course sublines. The segmented trail extends that boundary without changing its default stacked or button-only presentation.

## Implemented hierarchy

- Personal Next moves remains permanently first in the evidence column.
- My performance, Masters, Peers, and Last games now share one tabbed Position evidence panel.
- Only the active source is mounted, avoiding four simultaneous long panels and eager public-database requests.
- `OpeningAnalysisStore.activeEvidenceTab` replaces four independent visibility booleans. Performance and Last games load only when active and retain request-sequence stale-response protection.
- My openings in this position remains below the tabbed evidence and keeps its exact-name filter behavior.
- The former context strip is removed because it duplicated the line, filter summary, board perspective, and visibility state already present in the workbench.
- The header keeps the approved Games, Score, and WDL summary. Its actions are now Engine and Challenge Bot.
- Production Next moves does not contain, and this slice does not introduce, a Best result badge.

## Current-line interaction

`CopyableLineComponent` now has an optional segmented-trail mode. Opening Analysis supplies its existing SAN/uci history as stable segments:

- each earlier segment rewinds to that ply;
- the current segment is exposed with `aria-current="step"`;
- copying still uses the complete current line;
- Open analysis still deep-links to Free Analysis with the current UCI sequence;
- the start position retains the compact toolbar treatment rather than falling back to a second card.

`OpeningAnalysisStore.goToPly()` uses the existing chess.js move history, undoes the required moves, truncates the public history, updates the last-move marker, and synchronizes the board/evidence/engine once. It does not reconstruct chess.js from a terminal FEN, so subsequent Previous navigation remains valid.

## Engine interaction boundary

Stockfish rows become real buttons only when a consumer sets the new opt-in input. Default behavior remains the original non-interactive row for every existing consumer.

Opening Analysis enables the input and sends the selected row's first validated UCI move through `store.playBoardMove()`. That existing workflow validates legality with chess.js, updates SAN/history/FEN/last move, stops the obsolete engine run, refreshes evidence, and starts analysis for the new position.

Only the first move is applied. Applying a whole principal variation would require a new transactional navigation contract and would make one row click mutate several positions. That broader behavior is intentionally excluded.

## Accessibility and responsive behavior

- Tabs use native buttons, tab/list/panel roles, selected state, panel labelling, roving tabindex, Arrow Left/Right, Home, and End navigation.
- The tab row scrolls horizontally when four readable labels do not fit instead of shrinking typography.
- Current-line segments and selectable engine rows use native buttons with visible production focus outlines and text/non-colour current or interactive cues.
- Shared widget embedded presentation is opt-in, removing nested-card chrome only inside the tab shell.
- No font family, font package, or global type scale changed. The route continues to inherit the production application stack and uses existing `--ui-*` tokens.

## Regression coverage

Focused component and store coverage verifies:

- default tab and lazy Performance/Last-games requests;
- no imported-panel requests for Masters/Peers selection;
- stale request rejection and earlier-ply board history;
- header action/stat simplification and trail projection;
- tab order, ARIA association, roving tabindex, and keyboard selection;
- copyable-line segmented mode, current state, deep link, start state, and rewind output;
- Stockfish default non-interactive behavior, opt-in first-move emission, and stale/invalid-line suppression;
- opt-in input/output propagation through Analysis Board and Analysis Workbench.

Validation completed on 2026-08-08:

- the focused suite passes 28 tests in Chrome Headless;
- the complete web suite passes all 436 tests in Chrome Headless;
- `npm run build:web` passes;
- `npm run lint` passes;
- `npm run check:architecture` passes;
- `git diff --check` passes.

The first focused run exposed one incorrect test expectation around Angular's readable comma-separated query-string serialization. The assertion was corrected without changing production behavior. Independent diff review then found that handled tab Arrow/Home keys could bubble into the page-wide board shortcuts; the tab composite now stops propagation for its handled keys and regression coverage verifies the shield. The same review corrected compact-width CSS precedence so embedded Masters and Peers retain the tab shell's single-padding boundary. No actionable findings remained after re-review. The full focused suite passes after these corrections. The production build continues to report the repository's existing CommonJS optimization warnings for selected contracts and chess-domain imports.

## Residual risk

Switching away from Peers destroys that widget, so its local population-filter selection resets when the user returns. This matches the prior close/reopen behavior and avoids keeping every evidence source mounted or making public requests eagerly. Persisting cross-tab public-explorer state would require a separately reviewed ownership change.

Direct authenticated browser review is not claimed at this checkpoint: the available in-app browser has no signed-in local session and the guarded route correctly redirects to Clerk sign-in. Static/template compilation and automated browser tests remain available; authenticated visual review must be completed in a signed-in browser before final integration acceptance.
