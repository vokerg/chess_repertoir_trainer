# VT-301 Authenticated Route Inventory and Completion Reconciliation

Date: 2026-08-05

Issue: #132

Branch: `visual-transformation/vt-301-route-inventory`

Base: `fa5f477bab5cf50d3c94a8d911d4e0dd0d6605c3`

Target: `main`

Disposition: documentation-only final VT-301 reconciliation; eligible for completion only after approved squash merge and post-merge issue reconciliation

## Objective

Verify the current authenticated Angular route tree against the integrated Visual Transformation history and classify every route family as:

- transformed and integrated;
- accepted compatibility debt within a transformed family; or
- explicitly owned by VT-302 or later work.

This checkpoint does not change runtime behavior. It closes the uncertainty left by older records that still described a remaining page inventory without naming every current route.

## Method

1. Read `apps/web/src/app/app.routes.ts` from the exact branch base.
2. Count every route entry guarded by `authGuard`.
3. Collapse guarded URLs that intentionally share a route component, including marathon scopes and tactical-scenario session routes.
4. Record unguarded compatibility redirects into guarded destinations separately.
5. Match each unique guarded route component to its integrated Phase 1, Phase 2, or VT-301 implementation report and pull request.
6. Inspect representative current components and shared shells to verify the integrated composition still exists.
7. Inspect current token ownership and migration records to distinguish route-family completion from descendant compatibility debt.
8. Check open pull requests for file or execution collision before claiming the documentation branch.

## Inventory summary

- Guarded authenticated URL entries: **34**
- Unique guarded route components: **29**
- Unguarded compatibility redirects into guarded destinations: **3**
- Unclassified guarded route components: **0**
- Route families requiring another VT-301 implementation batch: **0**

## Guarded route inventory

| Family | Guarded URLs | Owning route component(s) | Disposition | Integration evidence |
| --- | --- | --- | --- | --- |
| Signed-in Home | `/home` | `HomePageComponent` | Transformed | Phase 1 Home implementation/calibration through PRs #87 and #141; production system foundation through PR #158 |
| Study | `/library` | `LibraryBrowserPageComponent` | Transformed | VT-202 through PR #178 and reconciliation PR #180 |
| Line training | `/library/marathon`; `/courses/:courseId/marathon`; `/chapters/:chapterId/marathon`; `/lines/:lineId/train` | `TrainingMarathonPageComponent`; `LineTrainPageComponent` | Transformed | VT-301 Batch 4a through PR #211 and reconciliation PR #212 |
| Puzzle and tactical-scenario training | `/puzzles`; `/scenario-training/tactical-missed-shot`; `/scenario-training/tactical-missed-shot/:sessionId`; `/scenario-training/tactical-blunder`; `/scenario-training/tactical-blunder/:sessionId` | `LichessPuzzlesPageComponent`; `TacticalScenarioTrainerPageComponent` | Transformed | VT-301 Batch 4d through PR #221 and reconciliation PR #229 |
| Progress and profile | `/progress`; `/progress/profile`; `/progress/accounts/:accountId` | `ProgressEntryPageComponent`; `PlayerChessProfilePageComponent`; `AccountDetailPageComponent` | Transformed | VT-301 Batches 1–2 through PRs #196 and #206 |
| Settings | `/settings/accounts`; `/settings/lichess`; `/settings/appearance` | `AccountsPageComponent`; `LichessSettingsPageComponent`; `AppearanceSettingsPageComponent` | Transformed | VT-301 Batch 3 through PR #209; exact-head CI #2050 passed |
| Games | `/games`; `/games/:gameId` | `GamesExplorerPageComponent`; `GameDetailPageComponent` | Transformed | VT-201 through PR #167/reconciliation #176; shared analytical Game Review composition through PR #235 |
| Opening Analysis | `/opening-analysis` | `OpeningAnalysisPageComponent` | Transformed | VT-203 through PR #183/reconciliation #185; shared analytical evidence through PR #235 |
| Builder and opening evidence | `/builder`; `/opening-struggles` | `RepertoireBuilderPageComponent`; `OpeningStrugglesPageComponent` | Transformed | Builder through VT-301 Batch 4c / PR #221; Opening Struggles through Batch 6 / PR #235 |
| Lab discovery and experiments | `/lab`; `/lab/top-opponents`; `/lab/monthly-games`; `/lab/performance-by-rating`; `/lab/tactical-detections`; `/lab/training-log` | `LabPageComponent`; `TopOpponentsPageComponent`; `MonthlyGamesPageComponent`; `PerformanceByRatingPageComponent`; `TacticalDetectionsPageComponent`; `TrainingLogPageComponent` | Transformed | VT-301 Batches 7a–7c through PRs #252, #269, and #277 |
| Courses and repertoire authoring | `/courses`; `/courses/:courseId`; `/courses/:courseId/review`; `/chapters/:chapterId/lines`; `/lines/:lineId/edit` | `CoursesPageComponent`; `CourseDetailPageComponent`; `CourseReviewPageComponent`; `LinesPageComponent`; `LineEditorPageComponent` | Transformed | VT-301 Batches 4b–4c through PRs #215 and #221, with reconciliation PRs #217 and #229 |
| Free Analysis | `/analysis` | `FreeAnalysisPageComponent` | Transformed | VT-301 Batch 6 through PR #235 and reconciliation PR #236 |

The shared route counts reconcile as follows:

- `TrainingMarathonPageComponent` owns three guarded marathon URLs.
- `TacticalScenarioTrainerPageComponent` owns four guarded scenario URLs: two scenario types with optional persisted session ids.
- The remaining 27 route components each own one guarded URL.

Therefore `3 + 4 + 27 = 34` guarded URL entries across `1 + 1 + 27 = 29` unique guarded route components.

## Compatibility redirects into guarded destinations

| Redirect record | Target | Disposition |
| --- | --- | --- |
| `/settings` | `/settings/accounts` | Unguarded redirect record; target page is guarded and remains the canonical Settings entry |
| `/accounts` | `/settings/accounts` | Unguarded compatibility redirect; target page is guarded |
| `/accounts/:accountId` | `/progress/accounts/:accountId` | Unguarded compatibility redirect; target account-progress page is guarded |

These redirect records do not use `canActivate` themselves and render no independent component. Authentication is enforced by their guarded destinations, so they are recorded separately from the 34 guarded page entries and do not represent page-family migrations.

## Current implementation verification

The inventory did not rely on reports alone.

- Study remains a standalone OnPush route page composing `app-page-header`, `app-panel`, feature-local presentational components, `LibraryBrowserStore`, and typed data access.
- Marathon training remains an OnPush route shell with computed header stats/actions, route parsing, feature-store ownership, and the presentational line-training session component.
- Lichess puzzles remain an OnPush route page with shared header/panel composition, typed API service, feature store, and lifecycle-safe query handling.
- The five Lab child routes remain thin OnPush wrappers around one shared `LabExperimentPageHeaderComponent` and isolated experiment components; they do not introduce parallel route shells.
- Game Detail remains an OnPush composition page around feature-owned header, summary, insights, stores, and shared workbench presentation. It does not perform direct HTTP orchestration in presentational children.
- Repository code search found the expected shared page-header/panel/OnPush contracts across the current Courses, Accounts, Settings, Progress, Games, Opening Analysis, Builder, Study, training, puzzle, scenario, Lab, Free Analysis, and Opening Struggles route pages.

No current route implementation contradicted its integrated family report strongly enough to require another VT-301 page batch.

## Accepted compatibility debt

### Home local token aliases

`HomePageComponent` is structurally transformed and remains the approved signed-in entry experience. Its stylesheet still defines calibrated local `--home-*` aliases and a small number of hard-coded status tints. The values align with the approved graphite/mint direction, but the namespace predates the canonical production `--ui-*` contract.

Disposition: accepted compatibility/polish debt. It does not make `/home` an untransformed route. Cleanup may occur in VT-302 or a separately approved narrow token-boundary change.

### Global legacy token layer

`apps/web/src/styles.css` still owns short amber-era roles including `--accent`, `--surface`, `--border`, and `--text`. This is the documented compatibility layer and must not be redefined globally to production values.

Disposition: accepted compatibility debt. New transformed UI must not add dependencies on it.

### Shared workbench and training compatibility

`apps/web/src/workbench.css` still references short legacy roles across shared analytical presentation. Some global `.library-*` presentation also remains while shared line-training surfaces consume it.

Disposition: migrate only after the complete shared consumer set is inspected and regression-covered. Partial remapping would risk Game Review, Free Analysis, Opening Analysis, Builder, Opening Struggles, line editing, and training consumers.

### Deferred browser evidence

Several accepted integrations were approved without direct authenticated browser review. Their automated validation and recorded review checklists remain valid evidence, but deferred browser observations are not converted into passes by this report.

Disposition: representative browser, keyboard, screen-reader, contrast, reduced-motion, zoom, and responsive review remains VT-302 scope.

## VT-302 boundary

After this reconciliation pull request is squash-merged and issue #132 is closed, issue #133 may become `READY` and own:

- coherent first-run and onboarding guidance;
- cross-route empty, loading, partial-data, error, recovery, and retry consistency;
- keyboard and screen-reader review;
- contrast, focus, reduced-motion, zoom, and representative responsive widths;
- evidence-based cleanup of accepted compatibility boundaries;
- restrained appearance and motion refinement;
- final residual-risk and program-completion assessment.

VT-302 must not reopen completed route-family rollout merely because accepted descendant compatibility debt remains.

## Canonical-record corrections

This checkpoint corrects stale records that still described VT-103 or VT-104 as current work and a pending unnamed route inventory.

The earlier integrated `VT_301_LINE_TRAINING.md` report refers to `VT_301_REMAINING_PAGE_INVENTORY.md`, but that draft file is not present on current `main`. This final report supersedes that historical reference and is the canonical authenticated-route inventory.

## Validation

Performed through direct GitHub inspection on the exact branch base:

- literal `canActivate: [authGuard]` route count and route/component mapping;
- separate inspection of unguarded redirect records and their guarded destinations;
- integrated report and pull-request mapping;
- representative current route-page composition;
- shared Lab route wrapper contract;
- Home and workbench token-compatibility boundaries;
- open pull-request collision check;
- issue #132 claim and branch coordination;
- changed-file scope restricted to transformation/frontend documentation.

Application builds and tests were not run locally because this is a documentation-only checkpoint and the runtime could not resolve `github.com` for a local checkout. No local command is represented as passed. Pull-request CI remains the executable validation authority for the exact branch head.

Direct browser review was not performed and is not represented as observed evidence.

## Completion decision

VT-301 has completed authenticated page-family rollout. There are no unclassified guarded route components and no additional VT-301 implementation batch is justified by the current route tree.

Issue #132 is eligible to close only after:

1. this reconciliation is approved;
2. the pull request is squash-merged into `main`;
3. post-merge repository state is verified;
4. issue #122 and issue #132 are reconciled;
5. issue #133 is re-evaluated and explicitly changed from `BLOCKED` to `READY` if its dependency is fully satisfied.

## Explicit exclusions

- no Angular route or navigation change;
- no component, template, CSS runtime, store, API, contract, schema, migration, dependency, job, board, engine, training, or persistence change;
- no onboarding implementation;
- no broad legacy-token search-and-replace;
- no browser result invented from automated evidence;
- no merge without explicit user approval.

## Files inspected

- `AGENTS.md`
- `.agents/skills/angular-frontend/SKILL.md`
- `TRANSFORMATION.md`
- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/features/home/home-page.component.{ts,html,css}`
- `apps/web/src/app/features/library/pages/library-browser-page.component.ts`
- `apps/web/src/app/features/lines/pages/training-marathon-page.component.ts`
- `apps/web/src/app/features/lichess-puzzles/pages/lichess-puzzles-page.component.ts`
- `apps/web/src/app/features/games/pages/game-detail-page.component.{ts,html,css}`
- `apps/web/src/app/features/lab/pages/top-opponents-page.component.ts`
- `apps/web/src/app/features/lab/pages/monthly-games-page.component.ts`
- `apps/web/src/app/features/lab/pages/performance-by-rating-page.component.ts`
- `apps/web/src/app/features/lab/pages/tactical-detections-page.component.ts`
- `apps/web/src/app/features/lab/pages/training-log-page.component.ts`
- `apps/web/src/app/features/lab/components/lab-experiment-page-header.component.ts`
- `apps/web/src/styles.css`
- `apps/web/src/workbench.css`
- `docs/frontend/angular-architecture.md`
- `docs/frontend/angular-migration.md`
- `docs/frontend/design-tokens.md`
- `transformation/MASTER_PLAN.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `transformation/WORKING_RULES.md`
- `transformation/reports/VT_301_LINE_TRAINING.md`
- transformation reports directory inventory
- issues #122, #132, and #133
- PRs #141 and #236
- current open pull-request inventory
