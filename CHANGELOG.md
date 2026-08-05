# Changelog

This changelog was reconstructed retrospectively from the repository commit history.

Versions `0.0.x` are daily development snapshots: each version represents a calendar day on which project work was committed, not a separately published package release. Snapshot numbering continues independently of package versions; the current repository version remains `1.0.0`.

## [0.0.70] - 2026-08-05

- Added the ACT-001 Activity Feed foundation with typed contracts, a daily aggregate ledger, IANA time-zone preferences, transaction-aware increment and reconciliation services, authenticated history/today/preferences APIs, migration, OpenAPI coverage, and focused tests.
- Modernized and reconciled the Settings routes with clearer account workflow hierarchy, complete Lichess scope guidance, improved Appearance semantics, accessibility fixes, and rendered regression coverage.
- Refreshed repository, product, program, and agent documentation; added the exact `update changelog` command workflow; corrected stale mobile and program entry points; and established short-lived branches with required squash merge into `main`.

## [0.0.69] - 2026-08-04

- Added the durable onboarding preparation run/target/batch execution boundary with globally serialized bounded child-job admission, retained execution snapshots, and focused selection/concurrency coverage.
- Completed onboarding research for administrator authorization and diagnostics, orphan shared-position cleanup, and measured throughput/progress semantics, including bounded defaults and an explicit no-ETA policy.
- Modernized Tactical Detections with the shared Lab panel, action, stat, and select-menu patterns while clarifying result versus run scope, enforcing API row limits, improving request locking, accessibility, responsiveness, and rendered coverage.

## [0.0.68] - 2026-08-03

- Grounded explicit AI game review in bounded reviewed side-aware opening knowledge while preserving deterministic analysis, feature gating, and non-authoritative generated output.
- Redesigned Study and simplified Games exploration and analysis actions, including removal of the game action-menu component and speed-category analysis eligibility.
- Modernized Performance by Rating plus the Lab discovery, Top Opponents, Monthly Games, and Training Log surfaces with the production visual system and accessibility-focused regression coverage.
- Reconciled durable account-import and onboarding coordination with the accepted preparation, lifecycle, throughput, and Activity Feed boundaries.

## [0.0.67] - 2026-08-02

- Surfaced reviewed side-aware opening knowledge in Repertoire Builder through a versioned candidate-decision contract with bounded summaries, plans, conditions, provenance, and ranking-neutral behavior.
- Finalized destructive onboarding lifecycle invariants, implementation allocations, and canonical completion records for account/game/user operations and shared-data retention boundaries.

## [0.0.66] - 2026-08-01

- Added the versioned static side-aware opening-knowledge foundation with deterministic inheritance, provenance validation, generated-book and imported-game-weighted audits, and regression coverage.
- Defined progressive onboarding preparation orchestration with durable parents, targets and batches, bounded admission, direct-user priority, committed-import pipelining, and stage-specific account fairness.
- Accepted and closed the Repertoire Builder side-aware knowledge foundation while retaining outcome evaluation as an evidence-gated follow-up.
- Modernized the authenticated Progress account dashboard with the production visual system and responsive containment fixes.
- Established the User Activity Feed and Daily Momentum sub-project with one bounded tracker and four implementation issues.

## [0.0.65] - 2026-07-31

- Modernized the shared analytical workbench and opening-evidence surfaces across Free Analysis, Game Review, Opening Analysis, and Opening Struggles while preserving route, store, API, board, engine, filter, and persistence ownership.
- Added profile-derived Repertoire Builder personas and editable/rejectable defaults with deterministic provenance and override accounting.
- Defined and accepted the lightweight onboarding experience blueprint for progressive disclosure, first-value reveals, and product/visual-program coordination.
- Validated the curated chess-trap knowledge pilot with retained engine and Lichess evidence and an explicit revise-before-production recommendation.
- Lightened shared game filters into a sheet-based presentation and removed obsolete external tracker references from North Star coordination.

## [0.0.64] - 2026-07-30

- Added exact existing-course Repertoire Builder entry from opponent-gap findings and closed the bounded existing-course adaptation task.
- Added optional, disabled-by-default generated Repertoire Builder candidate explanations and post-apply completion summaries while keeping deterministic evidence, state, and course writes authoritative.
- Modernized line training, Courses, Course Review, repertoire authoring, and remaining training surfaces using the Visual Transformation system without changing their workflow ownership.
- Added the shared single-choice filter select menu and improved training-layout responsiveness.
- Defined bounded recent-first provider import and resumable historical backfill contracts for onboarding and data lifecycle work.

## [0.0.63] - 2026-07-29

- Added a persisted Lichess puzzle trainer with server-owned solutions, rated-result synchronization, refresh-safe rounds, OAuth configuration, Prisma persistence, API contracts, Angular UI, and focused tests.
- Modernized the Games exploration workflow with explorer-focused filters, production design tokens, responsive evidence cards, and preserved route, pagination, service, store, job, and navigation ownership.
- Added deterministic repertoire-candidate evidence aggregation and explainable ranking behind a versioned contract and authenticated API.
- Completed shell and entry-point browser validation and corrected local-development authentication return URLs.

## [0.0.62] - 2026-07-28

- Advanced the visual transformation through the production navigation rail, inline expanded-rail accordions, signed-in Home, production brand assets, calibrated Home surfaces, and a shared graphite/mint token and typography contract.
- Added configurable original Wood, Digital, and Silent chess sound packs with persisted pack and volume preferences, Appearance controls, previews, and tests.
- Defined the versioned repertoire-target contract, including requested and effective populations, target intent, defaults, override provenance, and recalculation semantics.
- Established the onboarding and data-lifecycle program with its roadmap, decision and question ledgers, research tasks, and coordination rules.

## [0.0.61] - 2026-07-27

- Added deterministic, side-aware regex opening classification and expanded it to complete pinned generated-book coverage with imported-game audits and regression tests.
- Defined the repertoire-builder setup flow as a focused dialog followed by a routed, board-first recursive workbench.
- Established the curated chess-trap knowledge and validator pilot, including identity, sourcing, licensing, validation, examples, and explicit production boundaries.
- Added the Player Chess Profile foundation and accepted the routed board-first repertoire-builder prototype.

## [0.0.60] - 2026-07-26

- Generalized the Masters integration into a shared Opening Explorer backend with separate Masters and rated-Lichess datasets, source-isolated caching, explicit endpoints, configurable filters, shared contracts, coverage, documentation, and a Lichess Games Explorer widget.
- Established the Repertoire Builder north-star planning workspace, immutable task queue, GitHub Issues coordination protocol, and execution/reporting rules.

## [0.0.59] - 2026-07-25

- Unified course review and course-ending discovery into a single three-mode course review page with tabs, shared finding presentation, consolidated state, and a Lab launcher.

## [0.0.58] - 2026-07-24

- Corrected worker task claiming so a lower-priority task cannot run for a game while a higher-priority queued task is waiting.

## [0.0.57] - 2026-07-23

- Added the Course Extension Candidates Lab report for common opponent continuations after course lines end, with shared game filters, transposition-aware coverage, thresholds, WDL, and example games.
- Ran tactical detection automatically after whole-game analysis with idempotent refresh and retry-safe post-processing.
- Added tactical findings to game review with shared filters, direct detected-ply navigation, and game-scoped missed-shot and blunder training.

## [0.0.56] - 2026-07-22

- Fixed imported-game job tracking to release and refresh each game as its individual task settles instead of waiting for the parent run to finish.

## [0.0.55] - 2026-07-21

- Kept the course-moves widget stable while data is loading.

## [0.0.54] - 2026-07-20

- Added Lichess and Chess.com Bullet reports to performance-by-rating while keeping both Bullet toggles disabled by default.
- Added the optional on-demand AI game-review widget with an OpenAI-compatible provider boundary, feature flags, validated and persisted output, and clickable turning points.

## [0.0.53] - 2026-07-19

- Restricted imported-game processing eligibility to standard chess variants.
- Added manual Docker deployment through Compose and Nginx configuration.
- Stabilized lint preparation by generating Prisma before linting.

## [0.0.52] - 2026-07-18

- Completed the persistent imported-game job migration with cancellation, retry, terminal history and dismissal, cooperative worker settlement, retention, and removal of the legacy in-memory queue.
- Added a complete deep-linkable URL contract for Games Explorer filters while preserving draft/applied filter state and browser navigation.
- Avoided Prisma generation races in development and applied final batch-processing integration fixes.

## [0.0.51] - 2026-07-17

- Added shared game-filter period presets synchronized with the underlying custom date range.
- Added the persistent worker runtime, safe PostgreSQL task claiming, imported-game domain executors, and operational documentation.
- Moved Games Explorer, account, and game-review processing flows to durable jobs with recovery, global progress, and affected-data refresh.

## [0.0.50] - 2026-07-16

- Added the cached Masters Explorer as a configurable analysis-workbench widget.
- Added standard Tags and Engine toggles to opening analysis, aligned engine behavior with free analysis, and redistributed workbench widgets.
- Introduced the persisted imported-game job foundation with Prisma models, shared contracts, authenticated routes, ownership checks, and rollout documentation.

## [1.0.0] - 2026-07-15

- Released performance-by-rating reporting with minimum-rating filtering and robust partial-date validation.
- Promoted Opening Struggles into a standalone report with poor-results, repeated-mistakes, and bad-position modes, course-coverage annotations, scope safety limits, and responsive UI.
- Refactored Lab into a catalog with dedicated routes for each experiment.
- Cleaned up opening-analysis presentation and expanded configurable WDL display.
- Added the cached Lichess Masters Explorer foundation with shared contracts, PostgreSQL persistence, validated upstream access, authenticated API delivery, stale fallback, and coverage.
- Added compact progressive-list presentation and enabled Vercel deployment from `main`.

## [0.0.49] - 2026-07-14

- Delivered the supported Expo companion client through authenticated offline course downloads, single-line training, attempt synchronization, and durable offline marathons.
- Added mobile sync APIs, SQLite persistence, native authentication/device validation, and mobile development/deployment documentation.
- Added database-backed opening and tag breakdowns with exact opening filters and improved WDL presentation.
- Built the performance-by-opponent-rating Lab report across contracts, aggregation, API, state, and UI.

## [0.0.48] - 2026-07-12

- Optimized course reads, training statistics, and prepared marathon candidates.
- Added shared course read models, content revision tracking, stale-run recovery, and regression coverage.
- Prevented mixed-mode marathon candidate repetition and aligned OpenAPI behavior.

## [0.0.47] - 2026-07-11

- Converged API schemas into shared contracts, upgraded validation/OpenAPI generation, and removed legacy OpenAPI and retired mobile architecture.
- Added architecture guardrails and broader request/contract tests.
- Added an unobtrusive move-tree delete action, fixed terminal/checkmate scenario evaluation, and restored the course-backup ignore rule.

## [0.0.46] - 2026-07-10

- Refactored Lichess result resolution and added unit coverage.

## [0.0.45] - 2026-07-09

- Hardened browser Stockfish one-shot analysis, worker lifecycle, and tests.
- Added a single API test runner.
- Added tactical blunder training by sharing the scenario-training framework with missed-shot training.
- Refined user-blunder detection and coverage.

## [0.0.44] - 2026-07-08

- Reorganized authenticated/mobile navigation and added Progress, Lichess, and appearance entry points.
- Added a default progress account.
- Added a standard indexing-and-analysis workflow for newly imported blitz and rapid games.
- Added scenario-attempt evaluation logic and tests.

## [0.0.43] - 2026-07-07

- Added automatic opening assignment for imported games.
- Added promotion selection and configurable board theming.

## [0.0.42] - 2026-07-06

- Added feedback/dislike handling for tactical detections.
- Refactored Stockfish behind a pluggable local/WASM engine contract with worker-thread support and shared normalization.
- Split opening-analysis loading into independent analysis, performance, and representative-games endpoints.

## [0.0.41] - 2026-07-05

- Added persisted tactical missed-shot scenario training with attempt evaluation, analysis mode, navigation, and loading states.
- Refined detection versions, thresholds, mate context, and move-comparison rules.

## [0.0.40] - 2026-07-04

- Added `USER_BLUNDERED` and `SLOW_BLEED_WIN` game tags and retired `MISSED_DRAW`.
- Fixed bot-challenge test wiring and tactical-threshold response compatibility.

## [0.0.39] - 2026-07-03

- Added opening-book lookup and update tooling.
- Added the tactical-detections Lab workflow end to end across Prisma, Fastify, Angular state, and UI.
- Simplified the analysis workbench presentation.

## [0.0.38] - 2026-07-02

- Added time-control breakdowns to account performance.
- Added Lichess bot challenges from free and opening analysis.
- Improved global button hover, focus, and accessibility styling.

## [0.0.37] - 2026-07-01

- Expanded the game-filter panel with toggle behavior and advanced filters.
- Improved Chess.com archive import diagnostics and tracking.
- Unified live engine best-move handling across arrows and Stockfish panels.
- Added best victories and largest rating-upset defeats to account performance, and completed Lichess OAuth account connection.

## [0.0.36] - 2026-06-30

- Completed the interactive rich-analysis cache flow.
- Added imported-game tag filtering and latest-analysis snapshot fields, including backfill and analysis/accuracy filters.
- Added opening-position performance insights with WDL and game-state tags, plus refined tag codes.

## [0.0.35] - 2026-06-29

- Refined account rating/performance calculations and data structures.
- Introduced compact and rich position-analysis persistence modes, cache requirements, cleanup tooling, and coverage tests.
- Expanded the Sicilian course content.

## [0.0.34] - 2026-06-28

- Added account detail pages, account switching, rating-history charts, rating statistics, performance summaries, and yearly highs.
- Added bulk position-analysis storage and improved cache reuse.

## [0.0.33] - 2026-06-27

- Added the responsive Study mobile launcher for course, chapter, line, and marathon workflows.
- Improved board layout and training-feedback presentation.

## [0.0.32] - 2026-06-26

- Integrated the Clerk user menu and documented the authentication setup.
- Made the generated web configuration optional.
- Added a stable position key, promoted it to the primary deduplication key, and provided 128-bit rewrite, backfill, and collision-validation tooling.

## [0.0.31] - 2026-06-25

- Added a dedicated signup page and route.

## [0.0.30] - 2026-06-24

- Added bulk synchronization for active accounts and a training-log feature.
- Introduced the imported-game tagging system with documented tag definitions, analysis-based generation, filtering, and display rules.
- Expanded opening, comeback, time-pressure, and user-blunder classifications and refined tag thresholds.

## [0.0.29] - 2026-06-23

- Added course-position suggestions and a reusable free-analysis workbench with route helpers and game-tree tests.
- Improved responsive/mobile navigation, training layouts, marathon layouts, and game cards.
- Added a reusable, tested confirmation-dialog service for destructive actions.

## [0.0.28] - 2026-06-22

- Refactored the training basket and training-scope management.
- Applied follow-up fixes to the revised training flow.

## [0.0.27] - 2026-06-21

- Changed training to deterministic fixed subline paths and persisted subline-level attempt statistics.
- Added subline identity/text tracking, chapter statistics, recent-subline handling, and external-move sounds.

## [0.0.26] - 2026-06-20

- Added and refined the “Sicil for the kill” repertoire course.
- Improved training-session layout and move sounds.
- Updated Prisma tooling and modernized the development proxy configuration.

## [0.0.25] - 2026-06-19

- Updated Angular and Prisma dependencies and added package overrides for dependency stability.

## [0.0.24] - 2026-06-18

- Added a reusable move-tree panel to the analysis workbench.
- Enhanced the Study library with selected course and chapter details.

## [0.0.23] - 2026-06-17

- Added a reusable game-filter panel, query mapper, summaries, position move evidence, representative games, and shared page headers.
- Refined chapter selection and replaced generic copyable text with dedicated FEN and move-line controls.
- Synchronized peer dependencies and lockfiles to restore CI.

## [0.0.22] - 2026-06-16

- Refined imported-game facet handling for analysis statuses.

## [0.0.21] - 2026-06-15

- Fixed integration/build issues after the authentication changes.

## [0.0.20] - 2026-06-14

- Added external-user resolution and updated request authentication handling.

## [0.0.19] - 2026-06-13

- Started the first authentication phase and applied supporting fixes.

## [0.0.18] - 2026-06-12

- Added MCP summarisation support.
- Added generated board imagery to course analysis.

## [0.0.17] - 2026-06-11

- Continued the Angular feature/store refactor and component-boundary cleanup.

## [0.0.16] - 2026-06-10

- Added shared move-sequence formatting and a reusable board action toolbar.
- Deduplicated repeated ply-analysis updates.
- Added an optional unauthenticated MCP mode and refreshed backend/documentation structure.

## [0.0.15] - 2026-06-08

- Expanded line management and training with dedicated stores, create/edit/delete flows, PGN import/export, and clearer loading/error states.
- Fixed repertoire-review behavior and stabilized the build.

## [0.0.14] - 2026-06-07

- Completed a large Angular structure refactor.
- Updated workspace dependencies and lockfiles and repaired the build.

## [0.0.13] - 2026-06-06

- Added marathon-run behavior and related UI refinements.
- Added local batch Stockfish analysis with error handling.
- Fixed Angular change-detection issues.

## [0.0.12] - 2026-06-05

- Simplified game-filter and legacy analysis code.
- Made API builds generate the Prisma client reliably in CI.

## [0.0.11] - 2026-06-04

- Corrected game-analysis accuracy calculations.

## [0.0.10] - 2026-06-03

- Refactored analysis storage around client-side Stockfish results, normalized positions, and per-ply quality.
- Replaced backend position execution with client-submitted analysis summaries while preserving reusable stored position data.
- Updated schemas, routes, repositories, migrations, OpenAPI documentation, and imported-game detail data for the new flow.

## [0.0.9] - 2026-06-01

- Marked the original backend Stockfish path for retirement ahead of the client-computed analysis redesign.

## [0.0.8] - 2026-05-31

- Simplified import behavior by removing the update-existing-game path.
- Applied small maintenance changes and restored the build.

## [0.0.7] - 2026-05-30

- Added personal opening analysis with reusable time-control filtering, API aggregation, page routing, and navigation.
- Refactored frontend structure around the growing analysis features.

## [0.0.6] - 2026-05-29

- Added imported-game ply indexing with schema, migration, repository, service, route, and documentation.
- Exposed indexing status and force-rebuild actions in the Games explorer.
- Added the accounts import page and navigation.

## [0.0.5] - 2026-05-28

- Added a reusable imported-games browser API with metadata filters, cursor pagination, analysis facets, and documentation.
- Added the Games explorer, imported-game detail/replay page, navigation entry, and analysis/indexing actions.
- Added Angular project guidance and repaired the resulting build.

## [0.0.4] - 2026-05-26

- Added Chess.com public-game imports and provider-aware account synchronization.
- Redesigned Study as a Finder-style repertoire browser.
- Reworked the line editor into a board workbench and the training page into a focused training mode.

## [0.0.3] - 2026-05-25

- Added the backend foundation for Lichess game imports and server-side Stockfish analysis of imported games.
- Introduced analysis persistence, position caching, forced reruns, accuracy calculation, compact responses, and OpenAPI documentation.
- Refactored the API and web application into clearer feature boundaries and added deployment/build fixes for Neon, Render, and Vercel.

## [0.0.2] - 2026-05-24

- Added browser Stockfish analysis to the editor with evaluations, principal variations, best-move arrows, and engine warnings.
- Expanded training UX with mistake review, move notes, and PGN import/export.
- Prepared hobby deployment and CI for Neon, Render, and Vercel.

## [0.0.1] - 2026-05-23

- Created the initial monorepo and stabilized the core repertoire-authoring and line-training flow.
- Introduced synthetic-root move trees, safer authoring validation, reliable attempt finalization, and loading/error-state fixes.
- Added move-subtree deletion and replaced the original board with a swappable Chessground implementation, including navigation and sounds.
