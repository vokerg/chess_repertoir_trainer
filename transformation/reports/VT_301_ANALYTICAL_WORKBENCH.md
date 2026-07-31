# VT-301 Analytical Workbench and Openings Evidence

Date: 2026-07-31

Issue: #132

Implementation pull request: #235

Implementation branch: `visual-transformation/vt-301-analytical-workbench`

Target: `main`

Disposition: integrated into `main`; automated validation passed; direct browser review explicitly deferred

## Integration record

PR #235 was approved for squash merge by the user and integrated into `main` as commit `65ee1b56cc39f377d7066a1827e510e922b695fa`.

The exact implementation head was `869a99fed591f6354bf38ed1d5f26ad9aa987076`. CI run #1714 passed on that head before merge. The workflow covered dependency installation, lint, full repository build and Angular template/type compilation, opening audits, architecture guardrails, database migrations, and the complete test suite.

No review submissions or unresolved inline review threads existed at merge time. The pull request was mergeable and was squash-merged only after explicit user approval.

## Objective

Deliver the inventory-defined VT-301 analytical-workbench batch across the shared analysis substrate, Free Analysis, Game Review, Opening Analysis regression, and Opening Struggles without changing workflow ownership or product behavior.

## Scope

The slice migrated shared analytical presentation from the legacy short-token compatibility layer to the production `--ui-*` contract:

- analysis workbench layout and responsive spacing;
- board navigation hints plus shared copyable FEN/text presentation;
- move-tree panel, move rows, classifications, deletion affordance, and copy-line header;
- evaluation bar and engine line panel;
- course-position suggestions;
- Masters and Lichess peer explorer evidence;
- opening filter breakdowns;
- position move, top-game, and performance evidence;
- shared bot-challenge dialog presentation;
- Game Review summary, insight tabs, tactical findings, AI review, and evaluation graph;
- Opening Struggles criteria, transformed game-filter presentation, result table, and repertoire-coverage popover.

The complete shared consumer set used by Opening Analysis was migrated, allowing removal of the feature-scoped legacy-token bridge.

## Presentation outcome

- Important analytical surfaces use white or muted production surfaces with restrained borders and elevation.
- Selected moves, filters, insight tabs, and evidence use mint interaction roles rather than semantic status colours.
- Success, warning, danger, and information remain distinct for classifications, game results, coverage, and errors.
- Evaluations, move numbers, engine lines, FEN, WDL values, counts, and game metrics use the production monospaced stack where appropriate.
- Focus rings are explicit on move rows, evidence rows, copy controls, criteria modes, summaries, dialogs, and popovers.
- Dense side-panel content retains the established 980px workbench collapse and 640px compact treatment.
- Reduced motion disables the evaluation-bar transition.
- Opening Struggles reuses the existing `presentation="explorer"` game-filter contract rather than adding another filter implementation.

## Behavior preserved

- all routes and route parameters;
- Free Analysis initialization, board editing, engine, Masters, imported-game, bot challenge, and reintegration behavior;
- Game Review loading, tactical findings, AI review, move selection, engine, evaluation graph, course suggestions, and subtree deletion;
- Opening Analysis filters, history, board, widgets, stale-response guards, and navigation;
- Opening Struggles criteria, queries, result modes, copying, analysis links, filters, and coverage meaning;
- board, move-tree, engine, API, store, schema, persistence, and backend ownership;
- existing shared component inputs and outputs.

## Architecture boundary

No new shared primitive or dependency was introduced. The existing controlled, OnPush workbench and feature-owned widget contracts remain intact. Presentation was localized to the owning shared or feature component rather than redefining legacy tokens globally or restyling Builder and line-editor consumers through `workbench.css`.

## Validation disposition

Passed:

- exact-head repository CI #1714;
- lint;
- full repository build and Angular template/type compilation;
- architecture guardrails;
- database migration validation;
- opening classification audits;
- complete repository test suite.

Not performed locally:

- local checkout-based commands, because the available container could not resolve `github.com` during implementation;
- authenticated direct browser review of `/analysis`, `/games/:gameId`, `/opening-analysis`, and `/opening-struggles` at desktop, 980px, 760px, and 640px;
- direct browser permutations for keyboard, loading, error, empty, stale-cache, engine-hidden, AI-review, tactical-finding, dialog, and dense-data states.

The user explicitly approved merge and task wrap-up without requiring those direct browser checks. They remain deferred evidence and are not represented as observed passes.

## Coordination

The implementation branch was isolated from draft PR #196, which owns Progress account-dashboard files, and draft PR #209, which owns Settings files. Concurrent `main` changes during implementation were onboarding and North Star documentation changes and did not overlap the runtime slice.

Issue #132 remains open because VT-301 contains additional active and remaining rollout batches. This report closes only the analytical-workbench batch represented by PR #235.

## Explicit exclusions

- no global rewrite of `apps/web/src/workbench.css`;
- no Builder, line-editor, Progress, Settings, onboarding, or Labs change;
- no new component contract, state, API, schema, dependency, animation library, or visual framework.
