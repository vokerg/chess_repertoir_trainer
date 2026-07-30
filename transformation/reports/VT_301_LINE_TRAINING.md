# VT-301 Line Training Rollout

Date: 2026-07-30

Issue: #132

Batch: 4a — Marathon and focused line training

Branch: `visual-transformation/vt-301-line-training`

Target: `main`

Pull request: squash-merged PR #211

Squash commit: `a59cb7847270db407e950740df804dde4bd1f060`

Disposition: complete and integrated; exact approved-head CI #1594 passed; direct browser review explicitly deferred by user approval

## Objective

Modernize the authenticated marathon and focused line-training routes with the validated production visual system without changing route parsing, scope selection, stores, APIs, training evaluation, board mechanics, session progression, persistence, or mistake-review data.

## Sequence adjustment

The inventory placed Courses, Course Review, chapter lines, and line editing before Training. Active PR #208 changed Course Review and Repertoire Builder entry flows, so this collision-free training family proceeded first as a reviewable slice.

Batch 4a covers marathon routes, `/lines/:lineId/train`, and `LineTrainingSessionComponent`. Lichess puzzles and tactical scenario-training remain a separate later slice.

## Verified architecture boundary

- `TrainingMarathonPageComponent` reads route/query state and delegates to `TrainingMarathonStore`.
- `LineTrainPageComponent` reads the route id and delegates to `LineTrainStore`.
- Both stores retain loading, errors, commands, session state, board position, hints, completion, accuracy, mistakes, and review ownership.
- `LinesApiService` remains the typed HTTP owner.
- `LineTrainingSessionComponent` remains a presentational signal-input/output component.
- `ChessgroundBoardComponent` remains the shared board owner.

No second store, API path, route state, board implementation, persistence owner, or training decision was introduced.

## Integrated presentation

- replaced legacy route-level workbench headers with `app-page-header`;
- retained route-specific back navigation and edit-tree access;
- represented marathon modes through the existing shared toggle-action contract while preserving `TrainingMarathonStore.switchMode`;
- replaced hand-rolled loading cards with `app-panel`;
- migrated remaining mobile legacy tokens to production `--ui-*` roles;
- strengthened hint, progress, result, review, and mistake-card surfaces;
- applied mono/tabular typography only to moves, percentages, and counts;
- added visible three-pixel keyboard focus treatment;
- added progressbar semantics without changing the derived progress calculation;
- disabled progress-width animation for reduced-motion users;
- retained the 980px, 640px, and narrow-phone responsive compositions.

## Behavior preserved

- guarded lazy marathon and line-training routes;
- chapter, course, selected-line, and selected-subline marathon scopes;
- route/query parsing, mode defaults, mode switching, run reset, next-line loading, recent-subline handling, and run completion counts;
- focused line loading and session restart;
- white/black board orientation;
- board move submission, hint reveal, finish, retry, next-line, stop, back, and edit commands;
- correct/incorrect feedback and same-position retry behavior;
- completion, pass/fail, accuracy, mistake counts, and mistake review;
- stale-request protection, API calls, and backend behavior.

## Validation and approval

- PR #211 exact final head: `7f6442c7937276ad51788a641f7a96309d401eb3`;
- CI run #1594 passed the complete repository workflow;
- no PR comments, reviews, or unresolved review threads were present at approval;
- the user explicitly approved squash integration and deferred direct browser review;
- PR #211 was squash-merged into `main` as `a59cb7847270db407e950740df804dde4bd1f060`.

Deferred browser evidence is not represented as an observed pass. The original review checklist remains applicable for a later consolidated product-review pass.

## Explicit exclusions

- no route, query, API, contract, schema, migration, database, or dependency change;
- no training algorithm, eligibility, scoring, accuracy, progress calculation, or session-selection change;
- no board, sound, engine, or move-validation change;
- no Course Review, Builder, line editor, puzzle, tactical-scenario, or Lab change;
- no new shared state or UI primitive.

## Files inspected

- `.agents/skills/angular-frontend/SKILL.md`
- `docs/frontend/angular-architecture.md`
- `docs/frontend/design-tokens.md`
- `transformation/reports/VT_301_REMAINING_PAGE_INVENTORY.md`
- issue #132 and open PR inventory
- PR #208 changed-file inventory
- shared page-header and shell-action contracts
- marathon and focused-line route page TS/HTML/CSS
- `line-training-session.component.{ts,html,css}`
- `training-marathon.store.ts`
- `line-train.store.ts`
