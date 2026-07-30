# VT-301 Authoring and Remaining Training Rollout

Date: 2026-07-30

Issue: #132

Batches: 4c — repertoire authoring; 4d — remaining training

Implementation branch: `visual-transformation/vt-301-authoring-training`

Target: `main`

Pull request: squash-merged PR #221

Squash commit: `fed4fed47d17a7cb7b0351c0bfd99bd80dc453da`

Disposition: complete and integrated; audited exact-head CI #1623 passed; direct browser review explicitly deferred by user approval

## Objective

Complete two separately recorded VT-301 slices in one reviewable implementation pull request so they share one final repository CI execution while retaining independent scope descriptions, browser checklists, and feature-file rollback boundaries.

The integrated delivery contains:

1. repertoire authoring on `/chapters/:chapterId/lines` and `/lines/:lineId/edit`;
2. remaining training on `/puzzles` and the tactical missed-shot and blunder routes.

## Audit and approval

The initial PR head `e31fc74447603eb3a8a2a14b6471e2f9adec9d38` passed CI #1620. A subsequent manual completeness audit found issues that compilation and tests did not detect:

- the Training status panel counted active sublines belonging to selected lines rather than exact checked sublines;
- the categorical side label used analytical mono typography;
- subline checkboxes and the PGN import textarea lacked explicit accessible names;
- several route-local loading, success, and error messages lacked complete live-region or alert semantics;
- the Angular migration ledger, transformation status, and rollout report were stale.

All identified issues were corrected on audited head `81c028d3cde57c4fa0591529ac3e6de95e6d0763`.

Validation and approval state:

- exact audited-head CI #1623 passed the complete repository workflow;
- no PR comments, reviews, or unresolved review threads were present;
- the branch was four commits behind `main`, but those commits were isolated to Repertoire Builder AI and North Star documentation with no changed-file overlap;
- the user explicitly approved wrapping both batches and deferred direct browser review;
- PR #221 was marked ready and squash-merged into `main` as `fed4fed47d17a7cb7b0351c0bfd99bd80dc453da`.

Deferred browser evidence is not represented as an observed pass. The checklists below remain applicable to a later consolidated product-review pass.

## Batch 4c — repertoire authoring

### Routes and components

- `/chapters/:chapterId/lines`;
- `/lines/:lineId/edit`;
- line-health table, subline training-status panel, and line action menu;
- line-editor route chrome and feature-owned notes panel.

### Verified architecture boundary

- `LinesPageComponent` remains the chapter route composition shell backed by `LinesPageStore`;
- `LinesPageStore` retains chapter/line loading, selection, expansion, transfer, CRUD, PGN, and training navigation state;
- `LineHealthTableComponent`, `LineTrainingStatusPanelComponent`, and `LineActionMenuComponent` remain presentational components emitting typed intents;
- `LineEditorPageComponent` retains route/query parsing and delegates editor state and commands to `LineEditorStore`;
- `LineEditorStore` retains tree loading, selected-node state, board position, Stockfish analysis, game-move evidence, note persistence, move creation/deletion, and keyboard navigation;
- `LineEditorWorkbenchComponent` continues to compose the shared analysis workbench;
- `LineNotesEditorComponent` remains feature-owned presentation;
- `LinesApiService`, shared board mechanics, and the shared analysis workbench remain unchanged.

No second store, API owner, route source, move tree, board implementation, engine owner, persistence path, or training command was added.

### Integrated presentation

- composed chapter rename, line-health evidence, line rename, and line transfer through shared `app-panel` surfaces;
- retained feature-local create-line and PGN disclosures while migrating their controls and surfaces to production roles;
- migrated line and subline tables to production borders, surfaces, semantic statuses, analytical numerics, hover treatment, and three-pixel focus;
- added accessible names for line selection, subline expansion, exact subline selection, and PGN controls;
- derived the Selected sublines statistic from exact selected hashes;
- retained product typography for categorical side labels and mono/tabular typography for counts, percentages, moves, FEN, and PGN;
- replaced legacy line-editor header chrome with `app-page-header` stats/actions;
- composed feature-owned move notes through `app-panel` with saved/error semantics.

### Behavior preserved

- chapter loading, stats, rename, and return navigation;
- line listing, creation, rename, deletion, selection, select-all, clearing, expansion, and selected-line marathon;
- subline status loading, selection, whole-line training, and selected-subline drilling;
- move/copy destination loading and line transfer;
- PGN import/export and related messages/errors;
- line-editor route/query node selection;
- move-tree and keyboard navigation, board orientation/moves, engine analysis/warnings, game-move evidence/filters, note saving, and subtree deletion;
- all APIs, stores, helpers, shared board mechanics, and backend behavior.

## Batch 4d — remaining training

### Routes and components

- `/puzzles`;
- tactical missed-shot routes;
- tactical blunder routes;
- `LichessPuzzleTrainerComponent`;
- shared `ScenarioBoardShellComponent`.

### Verified architecture boundary

- `LichessPuzzlesPageComponent` remains the route/query owner backed by `LichessPuzzlesStore` and typed puzzle data access;
- `LichessPuzzleTrainerComponent` remains a presentational board/session component with typed inputs and outputs;
- the shared chess board and action toolbar retain replay, movement, orientation, and keyboard behavior;
- `TacticalScenarioTrainerPageComponent` continues to configure scenario kind from route data and delegates commands to `TacticalScenarioTrainerStore`;
- the scenario store and engine service retain random/game/detection selection, evaluation, attempts, dislike/exclusion, completion, local analysis, and navigation behavior;
- `ScenarioBoardShellComponent` remains presentational and emits board/context navigation intents;
- tactical post-pass analysis continues to use the unchanged shared analysis workbench.

No scoring, rating, sync, scenario-selection, engine, store, API, route, board, or persistence authority moved into presentation.

### Integrated presentation

- strengthened puzzle settings hierarchy, rated-mode evidence, notices/errors, focus, and responsive composition;
- replaced the puzzle trainer's hand-rolled fact list with `app-fact-grid`;
- introduced a restrained board surface, semantic guidance/feedback, clearer action hierarchy, and compact layouts;
- composed tactical loading, intro, challenge, result, passed-analysis, attempt-history, and context copy through `app-panel`;
- migrated tactical evaluation facts, reveal lines, attempt history, errors, actions, focus, responsive states, and reduced-motion loading behavior to production roles;
- migrated the shared scenario shell board/context surfaces to production tokens and composed Game context through `app-panel`;
- retained the board-first desktop hierarchy and 980px/640px collapse points.

### Behavior preserved

- Lichess difficulty/rated settings, round query restoration, round start, board move submission, abandon, next puzzle, retry sync, reconnect link, notices, and errors;
- previous-move replay and keyboard review;
- puzzle rating, progress, mode, sync, themes, guidance, mistake feedback, and rating consequences;
- missed-shot and blunder scenario-kind configuration;
- random, detection-specific, session-specific, and game-specific scenario starts;
- context replay, challenge moves, browser Stockfish evaluation, best/original move reveal, retry, next, finish, dislike/exclusion, attempts, and post-pass local analysis;
- all stores, APIs, engine behavior, shared board behavior, routes, and backend behavior.

## Scope boundary

The two route families are complete within their recorded feature-owned visual scope. Line Editor and tactical post-pass analysis still consume the shared analysis workbench and analytical widgets. Those shared consumers remain explicitly assigned to the later analytical-substrate batch so their complete consumer set can be reviewed together.

PR #221 therefore does not claim universal migration of every nested shared analytical widget. It completes the authoring and remaining-training route chrome, feature-owned panels, evidence, controls, feedback, and responsive composition.

## Deferred browser checklist

### Batch 4c

- chapter loading/error/empty/populated states and long labels;
- chapter and line rename;
- line and exact subline selection/counts, expansion, training, and semantic statuses;
- create/delete, move/copy, disabled destinations, and confirmations;
- PGN import/export, long PGN/FEN, success, and error states;
- line-editor orientation, tree/navigation/deletion, engine warnings, game evidence, notes, train/back actions;
- desktop, 980px, 760px, 640px, narrow-phone, keyboard focus, reduced motion, and mobile-navigation clearance.

### Batch 4d

- puzzle disconnected/reconnect, practice/rated, loading, active, wrong-move, completed, abandon, retry-sync, next, and keyboard replay states;
- puzzle facts, long themes/guidance/errors, board sizing, and mobile actions;
- missed-shot and blunder routes from random, game, detection, and existing-session entry points;
- tactical loading/error, intro, context, challenge, result, pass/fail, reveals, retry, next, finish, dislike, attempts, and post-pass analysis;
- white/black orientation, long labels, context tree, desktop/mobile widths, keyboard focus, reduced motion, and mobile-navigation clearance.

## Explicit exclusions

- no store, API, route, query, contract, schema, migration, database, package, or dependency change;
- no line/chapter CRUD, transfer, PGN, editor-tree, note, board, engine, game-evidence, training, puzzle, rating, sync, scoring, scenario, attempt, dislike, or completion behavior change;
- no shared analysis-workbench, engine-widget, move-tree, board-mechanics, or analytical-substrate migration;
- no Lab, Builder, Progress, Settings, Opening Struggles, Free Analysis, or Game Review change;
- no new shared primitive.

## Files inspected

- `.agents/skills/angular-frontend/SKILL.md`;
- `docs/frontend/angular-architecture.md`;
- `docs/frontend/angular-patterns.md`;
- `docs/frontend/angular-migration.md`;
- `docs/frontend/design-tokens.md`;
- `docs/skills/frontend-feature-module.md`;
- `transformation/STATUS.md`;
- `transformation/reports/VT_301_REMAINING_PAGE_INVENTORY.md`;
- `transformation/reports/VT_301_LINE_TRAINING.md`;
- issue #132, PR #221, CI #1620, CI #1623, and current `main` divergence;
- the Course/Review and line-training completion reports defining the residual slices;
- chapter-lines page/store and its feature-owned child components;
- line-editor page/store/workbench and notes component;
- Lichess puzzle page/store/trainer;
- tactical scenario page/store/config/data-access and engine boundary;
- shared scenario board shell, page header, panel, fact grid, board toolbar, board, and analysis-workbench contracts.
