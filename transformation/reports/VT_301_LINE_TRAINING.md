# VT-301 Line Training Rollout

Date: 2026-07-30

Issue: #132

Batch: 4a — Marathon and focused line training

Branch: `visual-transformation/vt-301-line-training`

Target: `main`

Pull request: pending

Disposition: behavior-preserving implementation complete; repository CI and direct browser review pending

## Objective

Modernize the authenticated marathon and focused line-training routes with the validated production visual system without changing route parsing, scope selection, stores, APIs, training evaluation, board mechanics, session progression, persistence, or mistake-review data.

## Sequence adjustment

The inventory originally placed Courses, Course Review, chapter lines, and line editing before Training. Active PR #208 currently changes Course Review and Repertoire Builder entry flows, including the Course Review route page and finding components.

This batch therefore advances the next collision-free family and splits Training into reviewable slices:

- Batch 4a: marathon routes, `/lines/:lineId/train`, and `LineTrainingSessionComponent` presentation;
- later Training slice: Lichess puzzles and tactical scenario-training routes.

No PR #208, Settings PR #209, Progress PR #196, or Builder file is modified.

## Verified architecture boundary

The existing implementation already follows the intended Angular ownership model:

- `TrainingMarathonPageComponent` reads route/query state and delegates initialization and commands to `TrainingMarathonStore`;
- `LineTrainPageComponent` reads the line route id and delegates workflow ownership to `LineTrainStore`;
- both stores own loading, errors, async commands, session state, board position, hint visibility, completion, accuracy, mistakes, and review loading;
- `LinesApiService` remains the typed HTTP owner;
- `LineTrainingSessionComponent` remains a presentational signal-input/output component;
- `ChessgroundBoardComponent` remains the shared board owner.

VT-301 Batch 4a introduces no second store, API path, route state, board implementation, persistence owner, or training decision.

## Implemented presentation

### Route hierarchy

- replaced legacy `workbench-header` route chrome with the proven `app-page-header` contract;
- retained route-specific back navigation outside the shared header;
- represented marathon mode selection through existing shared toggle actions while continuing to call `TrainingMarathonStore.switchMode`;
- retained current line, training side, run completion, session status, source summary, and edit-tree access;
- replaced hand-rolled loading cards with `app-panel`.

### Shared training session

- retained the board-first desktop composition and 980px single-column collapse;
- migrated the remaining mobile legacy token usage to production `--ui-*` roles;
- strengthened the hint row, progress evidence, result summary, mistake-review panel, and mistake cards through production surfaces, borders, typography, and semantic status roles;
- applied mono/tabular typography only to moves, percentages, and counts;
- added visible three-pixel focus treatment for feature-local actions and links;
- added progressbar semantics to the existing derived progress indicator;
- retained text labels and status messages so colour is not the only signal;
- disabled the progress-width transition for reduced-motion users.

### Responsive behavior

- retained the established 980px workbench collapse;
- retained the 640px compact board/session composition and narrow 420px adjustments;
- preserved shell-owned mobile-navigation clearance;
- synchronized numeric media-query comments with the shared breakpoint contract.

## Behavior preserved

- guarded lazy marathon and line-training routes;
- marathon chapter, course, selected-line, and selected-subline scopes;
- marathon query parsing and mode defaults;
- mode switching, run reset, next-line loading, recent-subline handling, and completed-this-run counting;
- focused line loading and session restart;
- white/black board orientation;
- board move submission, expected-move hint reveal, finish, retry, next-line, stop, back, and edit-tree commands;
- correct/incorrect feedback and same-position retry behavior;
- last-move and board-position-version updates;
- completion, pass/fail, accuracy, mistake counts, and mistake review;
- stale-request protection and error handling;
- all `LinesApiService` calls and backend behavior.

## Explicit exclusions

- no route, query, API, contract, schema, migration, database, or dependency change;
- no training algorithm, eligibility, scoring, accuracy, progress calculation, or session-selection change;
- no board, sound, animation, engine, or move-validation change;
- no Course Review, Builder, line editor, puzzle, tactical-scenario, or Lab change;
- no new shared state or UI primitive;
- no merge without explicit approval.

## Automated validation

No working local checkout is available in this session, so local build, lint, tests, architecture checks, and browser validation are not represented as passed.

Pre-documentation branch comparison:

- base: current `main` commit `f1c3a1d5ddfb9e170639b1f1940f5c5f36e4d59e`;
- branch: eight commits ahead and zero behind;
- runtime changes: the two training route page triplets and shared session template/style only;
- no store, API, model, helper, route, package, schema, migration, or dependency file changed.

No focused component spec exists for these presentation files. Required validation is:

- repository CI, including Angular template/type compilation, lint, architecture guardrails, migrations, and the complete test suite;
- exact final documentation-head CI;
- direct browser review or explicit recorded deferral.

## Browser review required

Review chapter, course, selected-line, selected-subline, and focused-line training with realistic data:

- loading and invalid/unavailable/error states;
- white and black training sides;
- All, Weak, Untrained, and Mixed marathon modes;
- current line/source/status statistics and edit-tree links;
- correct and incorrect feedback;
- hidden and revealed expected move;
- clean completion, failed/needs-review completion, empty review, and populated mistake review;
- finish, retry, next line, stop marathon, back, and edit commands;
- long line, source, subline, branch, note, and annotation labels;
- desktop, 980px, 640px, and narrow-phone layouts;
- keyboard traversal, focus visibility, reduced motion, and mobile-navigation clearance.

Unavailable states must be recorded explicitly rather than represented as observed passes.

## Files inspected

- `TRANSFORMATION.md`
- `AGENTS.md`
- `.agents/skills/angular-frontend/SKILL.md`
- `docs/frontend/angular-architecture.md`
- `docs/frontend/design-tokens.md`
- `transformation/reports/VT_301_REMAINING_PAGE_INVENTORY.md`
- issue #132
- open PR inventory and PR #208 changed-file list
- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/shared/ui/page-header/page-header.component.ts`
- `apps/web/src/app/shared/ui/shell-actions/shell-actions.component.ts`
- `apps/web/src/app/shared/ui/shell-actions/shell-actions.component.html`
- `apps/web/src/app/shared/ui/ui-shell.model.ts`
- `apps/web/src/app/features/lines/pages/training-marathon-page.component.ts`
- `apps/web/src/app/features/lines/pages/training-marathon-page.component.html`
- `apps/web/src/app/features/lines/pages/training-marathon-page.component.css`
- `apps/web/src/app/features/lines/pages/line-train-page.component.ts`
- `apps/web/src/app/features/lines/pages/line-train-page.component.html`
- `apps/web/src/app/features/lines/pages/line-train-page.component.css`
- `apps/web/src/app/features/lines/components/line-training-session.component.ts`
- `apps/web/src/app/features/lines/components/line-training-session.component.html`
- `apps/web/src/app/features/lines/components/line-training-session.component.css`
- `apps/web/src/app/features/lines/state/training-marathon.store.ts`
- `apps/web/src/app/features/lines/state/line-train.store.ts`
