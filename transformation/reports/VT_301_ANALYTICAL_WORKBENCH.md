# VT-301 Analytical Workbench and Openings Evidence

Date: 2026-07-31

Issue: #132

Pull request: #235

Branch: `visual-transformation/vt-301-analytical-workbench`

Target: `main`

Disposition: implementation complete; repository CI and direct browser review pending

## Objective

Deliver the inventory-defined VT-301 analytical-workbench batch across the shared analysis substrate, Free Analysis, Game Review, Opening Analysis regression, and Opening Struggles without changing workflow ownership or product behavior.

## Scope

The slice migrates shared analytical presentation from the legacy short-token compatibility layer to the production `--ui-*` contract:

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
- Opening Struggles criteria, result table, and repertoire-coverage popover.

The complete shared consumer set used by Opening Analysis is now migrated, so the feature-scoped legacy-token bridge has been removed.

## Presentation outcome

- important analytical surfaces use white or muted production surfaces with restrained borders and elevation;
- selected moves, filters, insight tabs, and evidence use the mint interaction roles rather than semantic status colours;
- success, warning, danger, and information remain distinct for classifications, game results, coverage, and errors;
- evaluations, move numbers, engine lines, FEN, WDL values, counts, and game metrics use the production monospaced stack where appropriate;
- focus rings are explicit on move rows, evidence rows, copy controls, criteria modes, summaries, dialogs, and popovers;
- dense side-panel content retains the established 980px workbench collapse and 640px compact treatment;
- reduced motion disables the evaluation-bar transition.

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

## Validation status

Local application checks were not run because the available container could not resolve `github.com`, so no repository checkout was available. Build, Angular template/type compilation, tests, lint, architecture checks, and browser validation are not represented as passed.

Required before approval:

- repository CI;
- affected shared-analysis and Game Review specs;
- full web test and production build;
- lint and architecture checks;
- authenticated browser review of `/analysis`, `/games/:gameId`, `/opening-analysis`, and `/opening-struggles` at desktop, 980px, 760px, and 640px;
- keyboard review for board navigation, copying, move selection, deletion, insight tabs, evidence rows, criteria modes, filters, dialogs, and coverage popovers;
- loading, error, empty, stale-cache, engine-hidden, AI-review, tactical-finding, and dense-data states;
- explicit deferral for any state that cannot be reproduced.

## Coordination

The branch was created from `main` at `4d57e140e77c62a3cac67d02fa5085b5f55dc985`. While implementation was in progress, `main` advanced by onboarding-documentation commit `b485b9b2992e1152c1810c91d40cc5150d39284d`; it does not overlap this slice. Refresh the branch from current `main` before final approval if further concurrent changes land.

Open draft PR #196 owns Progress account-dashboard files and draft PR #209 owns Settings files. This slice does not touch either runtime boundary or their colliding migration/status documents.

## Explicit exclusions

- no global rewrite of `apps/web/src/workbench.css`;
- no Builder, line-editor, Progress, Settings, onboarding, or Labs change;
- no new component contract, state, API, schema, dependency, animation library, or visual framework;
- no merge without explicit approval.
