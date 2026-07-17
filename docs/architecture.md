# Architecture

This monorepo contains the Fastify API, Angular web app, React Native / Expo mobile app, and shared packages.

The Angular web application remains the broad product client. `apps/mobile` is a supported but deliberately narrow offline-training client. The implemented mobile rollout currently covers the production Chessground adapter, Clerk authentication, versioned SQLite course downloads, durable single-line training, idempotent attempt synchronization, and durable course/chapter marathons. Selected-line and selected-subline marathons remain follow-up work.

```text
apps/
  api/     Fastify + Prisma API and persistent-job worker runtimes
  web/     Angular
  mobile/  React Native + Expo
packages/
  chess-domain/  pure chess and training logic
  contracts/     active package for verified HTTP wire schemas and DTO types
```

See [Native mobile architecture](mobile/architecture.md) for the mobile boundary and rollout status.

## Current API structure

`apps/api/src/routes/index.ts` is the route composition source of truth. Notable registered feature modules include:

```text
apps/api/src/modules/
  analysis/              engine and imported-game analysis
  courses/               courses, chapters, lines, and move nodes
  imported-games/        game browsing, facets, PGN, opening data, and processing orchestration
  jobs/                  persistent imported-game jobs, executors, and worker runtime
  lab/                   exploratory game reports
  mobile-sync/           offline course bundles and mobile attempt ingestion
  opening-struggles/     recurring opening problems and course coverage
  repertoire-coverage/   course review against imported games
  stats/                 summary, line, and course statistics
  training/              line training sessions
  training-marathons/    marathon next-item workflow and selected candidate resolution
```

The complete registered set remains defined by `apps/api/src/routes/index.ts`; this documentation list is intentionally descriptive rather than exhaustive.

These registered routes remain global because they span provider/account integration rather than one product module:

- `routes/externalAccounts.ts` owns current-user accounts and provider sync endpoints.

Several modules also call services under `apps/api/src/services`. This is accepted organizational debt, not the preferred structure for new features. Do not invent `games` or `importers` modules in documentation until those boundaries exist in code.

The imported-games module has a feature-local query service that shares filtering and pagination semantics across backend consumers while keeping REST response mapping in `ImportedGamesService`. Imported-game filtering is SQL-side through the imported-games repository; latest analysis status and accuracy filters use materialized fields on `ImportedGame` that are synchronized from `GameAnalysisRun` writes.

Imported-game reads use consumer-specific projections. List endpoints do not return detail-only fields, response DTOs describe the fields their consumer needs, and Prisma selects mirror those DTOs. Snapshot columns replace relation reads when they already contain the list value. Counts, facets, averages, and rankings use database aggregation or explicitly bounded queries rather than unbounded row loading followed by Node reduction. Browser, detail, opening-analysis, workflow, and MCP models remain separate even when they reuse `buildImportedGameWhere`.

Imported-game analysis keeps reusable engine output and per-game classification separate. Reusable position analysis is stored in the analysis module's position-analysis cache with compact or rich persistence: imported-game flows write scalar-only compact rows, while free/interactive analysis can write rich rows with PV lines. Per-game ply score loss and classification fields are stored on `ImportedGamePly` in batches. `ImportedGameAnalysisService` is the direct, awaitable single-game execution boundary shared by the persistent worker and the temporary API-process batch queue. See [Position Analysis Cache](position-analysis-cache.md) for browser interactive analysis and backend whole-game analysis flows.

The imported-games module owns domain orchestration through `ImportedGameProcessingService`: indexing includes missing-opening assignment, analysis includes tag refresh after successful completion, and complete processing composes both. Explicit tag refresh remains available without rerunning Stockfish.

The jobs module owns `JobRun`/`JobTask` persistence, current-user job creation/read models, lifecycle integrity, the separate persistent-job worker runtime, and the four imported-game executor adapters. Worker claims use short PostgreSQL transactions with `FOR UPDATE SKIP LOCKED`, job-level priority, stable task ordinals, 25-task fairness slices, one active task per imported game, opaque claim fencing, heartbeat, stale recovery, orphan reconciliation, and graceful shutdown. Analysis-backed tasks own an isolated Stockfish engine and propagate the worker `AbortSignal`; indexing and tag-only tasks remain engine-free. The API-process queue is a backend compatibility wrapper over the same processing services until final cleanup. See [Persistent imported-game job processing](imported-game-job-processing.md).

While compatibility analysis routes and the worker coexist, a PostgreSQL freshness guard prevents an older `GameAnalysisRun` from replacing a newer denormalized latest-analysis snapshot on `ImportedGame`.

Opening struggles is a standalone Openings feature. It counts candidate games before loading early plies, rejects scopes above its documented safety limit, builds prefix aggregates in memory, and annotates returned prefixes with side-specific course coverage. It reuses the repertoire sequence matcher shared with course review and exposes a verified contract from `packages/contracts`. See [Opening struggles](opening-struggles.md).

Lab tactical detections are persisted reports over analysed imported games. They reuse cached position evals to identify missed shots, punished opponent blunders, and user blunders without running an engine. See [Tactical Detections](tactical-detections.md) for detection semantics, persistence, and Lab UI behavior.

MCP is a backend transport under `apps/api`; its read-only tools call feature/application services directly rather than calling REST endpoints.

`apps/api/src/app.ts` owns reusable Fastify construction, compiler/plugin registration, centralized request-validation errors, generated OpenAPI and official Swagger UI, auth/CORS, route composition, and Prisma disconnection through Fastify `onClose`. Tests construct independent app instances through `buildApp`, inject deterministic auth and lifecycle collaborators, and close each instance. Production omits injected auth so `loadAuthConfig()` still reads the environment. `apps/api/src/main.ts` loads environment configuration, listens, guards duplicate shutdown signals, closes Fastify, and uses `process.exitCode` instead of forcing an immediate successful exit.

`apps/api/src/worker.ts` is a separate process entry point. It loads worker timing configuration, creates the imported-game executor registry, starts the jobs-module scheduling loop, handles `SIGINT`/`SIGTERM`, aborts the active executor through an `AbortSignal`, waits for bounded graceful shutdown, and disconnects its own Prisma client. The API process does not start or own this loop.

For new backend work, extend the owning directory under `apps/api/src/modules` when one exists. Keep routes thin and place feature orchestration and Prisma access next to the owning module where practical. Make narrow changes to legacy global code when that is safer than an unrelated migration; do not copy the global layout into new features.

## Boundaries

- `apps/web` owns Angular UI, feature state, frontend data access, and the root imported-game job store/panel. It submits durable whole-game work but does not execute imported-game indexing, classification, or whole-game Stockfish loops.
- Browser-side chess engines remain appropriate for interactive analysis of the currently selected position; they do not own persisted whole-game workflows.
- `apps/mobile` owns Expo routes, native lifecycle, Chessground DOM hosting, authentication orchestration, user-scoped SQLite content/training repositories, offline marathon runs, and attempt synchronization.
- `apps/web` and `apps/mobile` never import from one another.
- `apps/api` owns HTTP routes, application workflows, provider integration, persistent-job scheduling/execution infrastructure, and Prisma access.
- `packages/chess-domain` stays framework- and infrastructure-free.
- Mobile-safe domain imports use explicit subpaths such as `chess-domain/training`, `chess-domain/sublines`, and `chess-domain/position`.
- The versioned serializable training reducer lives under `packages/chess-domain/src/training`. It records immutable attempt events, auto-plays fixed-path opponent moves, supports deterministic JSON replay, derives counters/review, and preserves existing server move-attempt and early-finish semantics.
- `@chess-trainer/contracts/training` and `@chess-trainer/contracts/mobile-sync` own the versioned wire schemas for downloaded content and attempt synchronization. The API exposes an owned-course manifest, complete course bundles, and idempotent offline-attempt batch ingestion under `/api/mobile-sync`.
- Course content carries a monotonic revision and content-change timestamp. Each logical bundle mutation increments the affected course once; moving content between courses increments both. Training and statistics writes do not change content revisions.
- Offline attempts are replayed with the serializable training domain, validated against their submitted immutable subline snapshot, and persisted into the existing training session, subline-attempt, and move-attempt models. Client start/completion timestamps remain the training chronology; `receivedAt` records deterministic server receipt time.
- Reusable repertoire graph, normalized-FEN matching, conflict detection, and reintegration planning live in `packages/chess-domain`; API modules own persistence and transactions.
- Available subline extraction lives in `packages/chess-domain/src/sublines.ts`. It is the source for the course sublines widget, line-training candidate selection, marathon candidate selection, weak-subline candidate selection, and active line/chapter/course stats scopes.
- `packages/chess-domain` owns extraction and canonical subline key generation. The canonical key is semantic and includes version, line id, starting FEN, side to train, and ordered UCI moves; it does not depend on node ids or SAN.
- The API owns SHA-256 hashing, active subline DTOs, and persistence. Sublines are not persisted as source-of-truth rows.
- Training first selects one active terminal subline, then the training engine follows exactly that path. Opponent moves are auto-played only when they are the next node in the selected subline.
- Marathon candidate selection supports a course/chapter scope, selected line ids, selected active subline hashes, and recent subline hashes. Scope-only requests preserve whole-course/chapter marathon behavior. Selected lines are ownership checked and, when a scope is also provided, must belong to that scope. Selected subline hashes are filtered against active owned sublines, so inactive hashes remain historical and are not trained.
- Marathon modes are `ALL`, `WEAK_SUBLINES`, `UNTRAINED_SUBLINES`, and `MIXED_WEAK_UNTRAINED`. Weak and untrained filtering uses the same active subline extraction and last-5 scored-attempt window as stats.
- The web marathon flow creates a bounded, short-lived in-memory run and requests subsequent candidates by run id. Prepared candidate trees and recent hashes live for 30 minutes of inactivity, are ownership checked, and do not survive API restarts, matching active training-session lifetime. The legacy stateless `/api/training-marathons/next` route remains compatible.
- The mobile course/chapter marathon flow persists its run, current session, recent candidates, served-untrained identities, and completion count in SQLite. It survives app restarts and selects the next candidate without an API request.
- Persisted training stats live in `TrainingSublineAttempt`, keyed by user, line, and subline hash. Line, chapter, and course stats count only active hashes and the last 5 scored attempts per active subline; old hashes remain historical but inactive after move-tree edits.
- Course read models are assembled by `course-derived-data.service.ts` from lean hierarchy/move selections. `/api/library/catalog` derives all owned lines once and uses one bounded attempt read for course and line summaries; `/api/courses/:courseId/overview` serves course metadata, chapters, statistics, and active sublines from one course derivation.
- `packages/contracts` is an active workspace. Endpoint schemas are added only after their actual API output and consumers have been verified.

Frontend conventions and accepted debt are documented under `docs/frontend`.

## Frontend product ownership

- `/library` is the Study planner. Its primary hierarchy and summaries come from one `/api/library/catalog` request. It owns repertoire/section browsing, line checkbox selection, marathon mode selection, and selected-line basket navigation to `/library/marathon`.
- App navigation lives in `apps/web/src/app/core/layout/main-navigation`. It owns the hierarchical desktop/mobile nav model described in [Frontend Navigation](frontend/navigation.md). Keep desktop and responsive-mobile navigation driven by the same route/group data.
- Study is the primary entry point for repertoire study and tactical missed-shot training. The main menu nests Missed shots under Study rather than exposing it as a separate top-level item.
- Openings groups Opening analysis (`/opening-analysis`) and the standalone Opening struggles feature (`/opening-struggles`), backed by `/api/opening-struggles`.
- Tools groups Analysis (`/analysis`) and Lab (`/lab`). These routes are not Settings.
- Settings groups import accounts (`/settings/accounts`), Lichess OAuth integration (`/settings/lichess`), and Appearance (`/settings/appearance`). Legacy `/accounts` URLs redirect into Settings or Progress routes.
- Progress uses `/progress` as the entry point and `/progress/accounts/:accountId` for the account dashboard. The entry route opens the default progress account first, then an active account, then the first available account.
- Games Explorer and single-game review submit persisted imported-game jobs through the root job store. Single-game review keeps interactive selected-position analysis local to the browser.
- `/chapters/:chapterId/lines` is the line/subline training-health diagnosis page. It owns line selection, expandable per-line subline status, and selected-subline drill launch.
- `/courses/:courseId` stays course/content oriented. Its available-sublines section is a structural repertoire dump, not a user-specific training-health dashboard.
- `/library/marathon`, `/courses/:courseId/marathon`, and `/chapters/:chapterId/marathon` share the line marathon page. Query parameters can provide `lineIds`, `sublineHashes`, and `mode`; route params provide optional course/chapter scope.
