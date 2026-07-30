# VT-301 Courses and Course Review Rollout

Date: 2026-07-30

Issue: #132

Batch: 4b — Course list, Course detail, and Course Review

Branch: `visual-transformation/vt-301-courses-review`

Target: `main`

Pull request: pending

Disposition: behavior-preserving implementation complete; repository CI and direct browser review pending

## Objective

Modernize `/courses`, `/courses/:courseId`, and `/courses/:courseId/review` with the validated production visual system while preserving Course and Course Review stores, APIs, filters, review modes, findings, RB-012 Builder entry actions, chapter commands, routes, and destructive confirmations.

## Sequence

The Courses/Review family was initially deferred while active RB-012 PR #208 changed Course Review findings and exact Builder anchors. PR #208 is now squash-merged as `1583b153a2bc674c649b2500769be997a8f4474e`, so this batch was refreshed from the integrated implementation.

Chapter-line authoring and `/lines/:lineId/edit` remain a separate later slice.

## Verified architecture boundary

- `CoursesPageComponent` remains an OnPush route page backed by `CoursesStore` and typed course data access.
- `CourseDetailPageComponent` remains an OnPush route page backed by `CourseDetailStore`.
- `CourseReviewPageComponent` continues to own route/query restoration and delegates review workflows to `CourseReviewStore`.
- Review mode tabs, conflicts, issue lists, and issue cards remain presentational components.
- RB-012 Builder query construction remains in `CourseReviewIssueCardComponent` and the existing repertoire-builder helpers.
- Confirmation ownership remains in `ConfirmDialogService`.

No second store, API owner, route source, filter model, finding mapper, Builder payload, or course/chapter command was introduced.

## Implemented presentation

### Course list

- retained `app-page-header` and `app-panel` boundaries;
- replaced nested anchor/button actions with direct accessible action links;
- introduced production-token course cards, direct primary/review actions, semantic destructive treatment, visible focus, and 980px/640px responsive composition;
- retained loading, error, empty, populated, create, delete, and navigation behavior.

### Course detail

- composed rename, chapter list, and chapter creation through `app-panel`;
- migrated chapter cards, order evidence, forms, direct actions, destructive treatment, subline disclosure, focus, and responsive states to production roles;
- retained header stats/actions, rename/save/cancel, chapter creation/rename/delete, line navigation, marathon navigation, review navigation, subline loading, and course deletion.

### Course Review

- retained the post-RB-012 mode, filter, finding, anchor, and Builder contracts;
- migrated review scope controls and mode tabs to production surfaces, borders, selected states, numerics, focus, and responsive layouts;
- migrated finding cards, board links, sequences, line anchors, Builder actions, W/D/L evidence, examples, and provider/review links;
- migrated conflict warnings to `app-panel` with semantic danger surfaces and direct edit actions;
- retained all review modes, filter restoration, thresholds, loading/error/empty states, game links, analysis links, and exact Builder launch query construction.

## Behavior preserved

- course listing, creation, deletion, and navigation;
- course detail loading, rename, delete, chapter CRUD, stats, sublines, line links, and marathon links;
- `MY_DEVIATIONS`, `OPPONENT_GAPS`, and `COURSE_ENDINGS` modes;
- query-based mode selection and restored filter scope;
- game filters, minimum overlap, minimum games, apply/reset/collapse behavior;
- conflicts, findings, examples, counts, W/D/L results, FEN copy, board analysis, game review, and provider links;
- RB-012 exact `LINE_START`/`NODE` Builder actions and source-filter payloads;
- all stores, APIs, helpers, routes, contracts, and backend behavior.

## Explicit exclusions

- no store, API, route, query, filter, contract, schema, migration, database, or dependency change;
- no Course Review calculation, finding mapping, anchor planning, or Builder launch change;
- no chapter-line table, line editor, training, puzzle, scenario, analysis-workbench, Builder, or Lab change;
- no new shared primitive;
- no merge without explicit approval.

## Validation

No working local checkout is available in this session, so local build, lint, tests, architecture checks, and browser validation are not represented as passed.

Pre-report branch comparison:

- base: `main` commit `4f223f38dd828ace97ad800eed4e9e189870e7fb`;
- runtime files changed: 11 Course/Course Review TS, HTML, and CSS files;
- no store, API, helper, route, contract, package, schema, migration, database, or backend file changed.

Required:

- repository CI including Angular template/type compilation, lint, architecture guardrails, migrations, and complete tests;
- exact final documentation-head CI;
- direct browser review or explicit recorded deferral.

## Browser review required

Review realistic desktop, 980px, 640px, and narrow-phone states for:

- Course list loading, error, empty, populated, creation, deletion, long names/descriptions, and action focus;
- Course detail loading, error, empty/populated chapters, course/chapter rename, chapter creation/deletion, subline disclosure, header actions, and long labels;
- all three Course Review modes, collapsed/expanded filters, thresholds, restored scope, mixed-side warning, loading/error/empty/populated findings, conflicts, shared positions, multiple exact line anchors, Builder actions, analysis/game/provider links, and long evidence labels;
- keyboard traversal, focus visibility, destructive confirmations, reduced motion, and mobile-navigation clearance.

Unavailable states must be recorded explicitly rather than represented as observed passes.

## Files inspected

- `.agents/skills/angular-frontend/SKILL.md`
- `docs/frontend/angular-architecture.md`
- `docs/frontend/design-tokens.md`
- `transformation/reports/VT_301_REMAINING_PAGE_INVENTORY.md`
- issue #132 and open PR inventory
- merged PR #208 metadata and changed-file disposition
- shared `app-page-header` and `app-panel` contracts
- `courses-page.component.{ts,html,css}`
- `course-detail-page.component.{ts,html,css}`
- `course-review-page.component.{ts,html,css}`
- Course Review mode tabs, conflicts, issue list, and issue card components
