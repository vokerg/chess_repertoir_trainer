# VT-301 Authoring and Remaining Training Rollout

Date: 2026-07-30

Issue: #132

Batches: 4c — repertoire authoring; 4d — remaining training

Branch: `visual-transformation/vt-301-authoring-training`

Target: `main`

Pull request: draft PR #221

Disposition: two behavior-preserving visual slices implemented and audited together; replacement exact-final-head CI and direct browser review pending

## Objective

Complete the next two recorded VT-301 slices in one reviewable pull request to reduce repeated repository CI cost without weakening feature ownership, validation, approval, or rollback boundaries.

The combined delivery contains two independently described scopes:

1. repertoire authoring on `/chapters/:chapterId/lines` and `/lines/:lineId/edit`;
2. remaining training on `/puzzles` and the tactical scenario routes.

## Execution and collision disposition

The branch was created from `main` commit `e585c662988ff6419de56905b268c9f559aeaf0a` after Courses and Course Review reconciliation.

During implementation, `main` advanced by one North Star documentation-only commit, `9a4e6166c9a874b8cb5b5efb04a2a4661e848d45`. That commit does not touch the runtime or transformation-report files in this delivery. The branch intentionally remained one commit behind instead of opening a synchronization pull request that would trigger an unnecessary additional CI execution.

Open pull-request collision review found:

- PR #216 was North Star Builder research and documentation only and has since integrated without runtime overlap;
- PR #209 remains isolated to Settings;
- PR #196 remains isolated to Progress;
- no open pull request modifies the line-authoring, Lichess-puzzle, tactical-scenario, or shared scenario-shell files in this delivery.

## Audit disposition

The initial PR head `e31fc74447603eb3a8a2a14b6471e2f9adec9d38` passed repository CI #1620. A subsequent completeness audit found issues that compilation and tests did not detect:

- the Training status panel labeled all active sublines belonging to selected lines as “Selected sublines” rather than counting exact checked sublines;
- the line side value used analytical mono typography even though `WHITE`/`BLACK` is a categorical label;
- subline checkboxes and the PGN import textarea lacked explicit accessible names;
- several route-local loading, success, and error messages lacked complete live-region or alert semantics;
- the Angular migration ledger, transformation status, and this report did not accurately record the integrated and active VT-301 batches.

All identified issues were corrected before approval. CI #1620 is retained as evidence for the pre-audit head only; a replacement exact-final-head run is mandatory.

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
- `LineNotesEditorComponent` remains feature-owned presentation and emits note payloads;
- `LinesApiService`, the shared board, and the shared analysis workbench remain unchanged.

No second store, API owner, route source, move tree, board implementation, engine owner, persistence path, or training command was added.

### Implemented presentation

- composed chapter rename, line-health evidence, line rename, and line transfer through shared `app-panel` surfaces;
- retained feature-local disclosures for create-line and PGN workflows while migrating their controls and surfaces to production roles;
- migrated line and subline tables to production borders, surfaces, status roles, analytical numerics, hover treatment, and three-pixel focus;
- added explicit accessible labels for line selection, subline expansion, subline selection, and PGN controls;
- derived the Selected sublines statistic from exact selected hashes rather than selected-line coverage;
- retained product typography for categorical side labels and mono/tabular typography for counts, percentages, moves, FEN, and PGN;
- migrated action-menu controls, selected/transfer evidence, semantic statuses, and responsive composition;
- replaced legacy line-editor workbench header chrome with `app-page-header` stats/actions;
- composed feature-owned move notes through `app-panel` with explicit saved/error states;
- retained the shared analysis workbench unchanged for the later analytical-substrate batch.

### Behavior preserved

- chapter loading, stats, rename, and return navigation;
- line listing, creation, rename, deletion, selection, select-all, clearing, expansion, and selected-line marathon;
- subline status loading, selection, whole-line training, and selected-subline drilling;
- move/copy destination loading and line transfer;
- PGN import/export and all related messages/errors;
- line-editor route/query node selection;
- move-tree navigation, keyboard navigation, board orientation/moves, engine analysis/warnings, game-move evidence/filters, note saving, and subtree deletion;
- all APIs, stores, helpers, shared board mechanics, and backend behavior.

## Batch 4d — remaining training

### Routes and components

- `/puzzles`;
- tactical missed-shot routes;
- tactical blunder routes;
- `LichessPuzzleTrainerComponent`;
- the shared `ScenarioBoardShellComponent` used by tactical scenario kinds.

### Verified architecture boundary

- `LichessPuzzlesPageComponent` remains the route/query owner backed by `LichessPuzzlesStore` and typed Lichess-puzzle data access;
- `LichessPuzzleTrainerComponent` remains a presentational board/session component with typed inputs and outputs;
- the shared chess board and action toolbar retain replay, movement, orientation, and keyboard behavior;
- `TacticalScenarioTrainerPageComponent` continues to configure scenario kind from route data and delegates session/evaluation commands to `TacticalScenarioTrainerStore`;
- the scenario store and engine service retain random/game/detection selection, evaluation, attempts, dislike/exclusion, completion, local analysis, and navigation behavior;
- `ScenarioBoardShellComponent` remains presentational and emits board/context navigation intents;
- tactical post-pass analysis continues to use the unchanged shared analysis workbench.

No scoring, rating, sync, scenario-selection, engine, store, API, route, board, or persistence authority moved into presentation.

### Implemented presentation

- retained the production puzzle page structure while strengthening settings hierarchy, rated-mode evidence, notices/errors, focus, and responsive composition;
- replaced the puzzle trainer's hand-rolled fact list with the proven `app-fact-grid` contract;
- introduced a restrained board surface, semantic guidance/feedback, clearer action hierarchy, and compact layouts;
- composed tactical loading, intro, challenge, result, passed-analysis, attempt-history, and context copy through `app-panel`;
- migrated tactical evaluation facts, reveal lines, attempt history, errors, actions, focus, responsive states, and reduced-motion loading behavior to production roles;
- migrated the shared scenario shell board/context surfaces to production tokens and composed Game context through `app-panel`;
- retained the board-first desktop hierarchy and established 980px/640px collapse points.

### Behavior preserved

- Lichess difficulty/rated settings, round query restoration, round start, board move submission, abandon, next puzzle, retry sync, reconnect link, notices, and errors;
- previous-move replay and left/right keyboard review;
- puzzle rating, progress, mode, sync, themes, guidance, mistake feedback, and Lichess rating consequences;
- missed-shot and blunder scenario-kind configuration;
- random, detection-specific, session-specific, and game-specific scenario starts;
- context replay, challenge moves, browser Stockfish evaluation, best/original move reveal, retry, next, finish, dislike/exclusion, attempts, and post-pass local analysis;
- all stores, APIs, engine behavior, shared board behavior, routes, and backend behavior.

## Scope boundary

The two route families are complete within their recorded feature-owned visual scope. They still consume the shared analysis workbench and analytical widgets in Line Editor and tactical post-pass analysis. Those shared consumers are intentionally excluded here and remain part of the later analytical-substrate batch, where the full consumer set can be reviewed together.

This exclusion means PR #221 does not claim universal visual migration of every nested shared analytical widget. It claims complete migration of the authoring and remaining-training route chrome, feature-owned panels, evidence, controls, feedback, and responsive composition.

## Shared validation boundary

The two slices share one pull request and one repository CI execution per final review head, but retain separate browser checklists and feature-file rollback boundaries.

No working local checkout is available in this session, so local build, lint, tests, architecture checks, and browser validation are not represented as passed.

Automated validation state:

- initial pre-audit head CI #1620 passed the complete repository workflow;
- audit corrections changed the branch after that run;
- repository CI on the replacement exact final head is required, including Angular template/type compilation, lint, architecture guardrails, migrations, and the complete test suite.

## Browser review required

### Batch 4c

Review realistic desktop, 980px, 760px, 640px, and narrow-phone states for:

- chapter loading/error/empty/populated states and long chapter/line labels;
- chapter and line rename;
- line selection, select all, clear, expanded sublines, exact subline selection/counts, line/subline training, and status colours with text labels;
- line create/delete, move/copy destinations, disabled/current-destination states, and confirmations;
- PGN import/export, long PGN/FEN text, success, and error states;
- line-editor loading/error states, white/black orientation, move creation/tree selection/navigation/deletion, engine warnings, game-move filters, note save/saved/error states, and train/back actions;
- keyboard traversal, three-pixel focus visibility, reduced motion, and mobile-navigation clearance.

### Batch 4d

Review realistic desktop, 980px, 760px, 640px, and narrow-phone states for:

- puzzle disconnected/reconnect, practice/rated settings, loading, active, wrong-move, completed, abandon, retry-sync, next-puzzle, and keyboard replay states;
- puzzle fact-grid values, long themes/guidance/errors, board sizing, and mobile actions;
- missed-shot and blunder routes from random, game, detection, and existing-session entry points;
- tactical loading/error, intro, context, challenge, result, pass/fail, reveals, retry, next, finish, dislike, attempt-history, and post-pass analysis states;
- white/black orientation, long player/provider labels, shared context tree, keyboard traversal, focus visibility, reduced motion, and mobile-navigation clearance.

Unavailable states must be recorded explicitly rather than represented as observed passes.

## Explicit exclusions

- no store, API, route, query, contract, schema, migration, database, package, or dependency change;
- no line/chapter CRUD, transfer, PGN, editor-tree, note, board, engine, game-evidence, training, puzzle, rating, sync, scoring, scenario, attempt, dislike, or completion behavior change;
- no shared analysis-workbench, engine-widget, move-tree, board-mechanics, or analytical-substrate migration;
- no Lab, Builder, Progress, Settings, Opening Struggles, Free Analysis, or Game Review change;
- no new shared primitive;
- no merge without explicit approval.

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
- issue #132, PR #221, CI #1620, and current open pull-request inventory;
- `apps/web/src/app/app.routes.ts`;
- `LinesPageComponent` and `LinesPageStore`;
- line-health table, line-training status panel, and line action menu components;
- `LineEditorPageComponent`, `LineEditorStore`, and `LineEditorWorkbenchComponent`;
- `LineNotesEditorComponent`;
- `LichessPuzzlesPageComponent`, `LichessPuzzlesStore`, and `LichessPuzzleTrainerComponent`;
- `TacticalScenarioTrainerPageComponent`, its store/config/data-access boundary, and `TrainerEngineService`;
- shared `ScenarioBoardShellComponent`;
- shared `app-page-header`, `app-panel`, `app-fact-grid`, chess board, board toolbar, and analysis-workbench contracts.
