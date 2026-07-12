# Architecture

This monorepo contains the Fastify API, Angular web app, and shared chess-domain code.

The responsive Angular application is the only supported client. The former Expo/React Native workspace has been removed; Git history is its archive.

```text
apps/
  api/    Fastify + Prisma
  web/    Angular
packages/
  chess-domain/  pure chess and training logic
  contracts/     active package for verified HTTP wire schemas and DTO types
```

## Current API structure

`apps/api/src/routes/index.ts` is the route composition source of truth. It currently registers these feature modules:

```text
apps/api/src/modules/
  analysis/              engine and imported-game analysis
  courses/               courses, chapters, lines, and move nodes
  imported-games/        game browsing, facets, PGN, and opening data
  lab/                   exploratory game reports
  repertoire-coverage/   course review against imported games
  stats/                 summary, line, and course statistics
  training/              line training sessions
  training-marathons/    marathon next-item workflow and selected candidate resolution
```

These registered routes remain global because they span provider/account integration rather than one product module:

- `routes/externalAccounts.ts` owns current-user accounts and provider sync endpoints.

Several modules also call services under `apps/api/src/services`. This is accepted organizational debt, not the preferred structure for new features. Do not invent `games` or `importers` modules in documentation until those boundaries exist in code.

The imported-games module has a feature-local query service that shares filtering and pagination semantics across backend consumers while keeping REST response mapping in `ImportedGamesService`. Imported-game filtering is SQL-side through the imported-games repository; latest analysis status and accuracy filters use materialized fields on `ImportedGame` that are synchronized from `GameAnalysisRun` writes.

Imported-game analysis keeps reusable engine output and per-game classification separate. Reusable position analysis is stored in the analysis module's position-analysis cache with compact or rich persistence: imported-game flows write scalar-only compact rows, while free/interactive analysis can write rich rows with PV lines. Per-game ply score loss and classification fields are stored on `ImportedGamePly` in batches. See [Position Analysis Cache](position-analysis-cache.md) for the browser and backend analysis flows.

Lab tactical detections are persisted reports over analysed imported games. They reuse cached position evals to identify missed shots, punished opponent blunders, and user blunders without running an engine. See [Tactical Detections](tactical-detections.md) for detection semantics, persistence, and Lab UI behavior.

MCP is a backend transport under `apps/api`; its read-only tools call feature/application services directly rather than calling REST endpoints.

`apps/api/src/app.ts` owns reusable Fastify construction, compiler/plugin registration, centralized request-validation errors, generated OpenAPI and official Swagger UI, auth/CORS, route composition, and Prisma disconnection through Fastify `onClose`. Tests construct independent app instances through `buildApp`, inject deterministic auth and lifecycle collaborators, and close each instance. Production omits injected auth so `loadAuthConfig()` still reads the environment. `apps/api/src/main.ts` loads environment configuration, listens, guards duplicate shutdown signals, closes Fastify, and uses `process.exitCode` instead of forcing an immediate successful exit.

For new backend work, extend the owning directory under `apps/api/src/modules` when one exists. Keep routes thin and place feature orchestration and Prisma access next to the owning module where practical. Make narrow changes to legacy global code when that is safer than an unrelated migration; do not copy the global layout into new features.

## Boundaries

- `apps/web` owns Angular UI, feature state, and frontend data access.
- `apps/api` owns HTTP routes, application workflows, provider integration, and Prisma access.
- `packages/chess-domain` stays framework- and infrastructure-free.
- Reusable repertoire graph, normalized-FEN matching, conflict detection, and reintegration planning live in `packages/chess-domain`; API modules own persistence and transactions.
- Available subline extraction lives in `packages/chess-domain/src/sublines.ts`. It is the source for the course sublines widget, line-training candidate selection, marathon candidate selection, weak-subline candidate selection, and active line/chapter/course stats scopes.
- `packages/chess-domain` owns extraction and canonical subline key generation. The canonical key is semantic and includes version, line id, starting FEN, side to train, and ordered UCI moves; it does not depend on node ids or SAN.
- The API owns SHA-256 hashing, active subline DTOs, and persistence. Sublines are not persisted as source-of-truth rows.
- Training first selects one active terminal subline, then the training engine follows exactly that path. Opponent moves are auto-played only when they are the next node in the selected subline.
- Marathon candidate selection supports a course/chapter scope, selected line ids, selected active subline hashes, and recent subline hashes. Scope-only requests preserve whole-course/chapter marathon behavior. Selected lines are ownership checked and, when a scope is also provided, must belong to that scope. Selected subline hashes are filtered against active owned sublines, so inactive hashes remain historical and are not trained.
- Marathon modes are `ALL`, `WEAK_SUBLINES`, `UNTRAINED_SUBLINES`, and `MIXED_WEAK_UNTRAINED`. Weak and untrained filtering uses the same active subline extraction and last-5 scored-attempt window as stats.
- The web marathon flow creates a bounded, short-lived in-memory run and requests subsequent candidates by run id. Prepared candidate trees and recent hashes live for 30 minutes of inactivity, are ownership checked, and do not survive API restarts, matching active training-session lifetime. The legacy stateless `/api/training-marathons/next` route remains compatible.
- Persisted training stats live in `TrainingSublineAttempt`, keyed by user, line, and subline hash. Line, chapter, and course stats count only active hashes and the last 5 scored attempts per active subline; old hashes remain historical but inactive after move-tree edits.
- Course read models are assembled by `course-derived-data.service.ts` from lean hierarchy/move selections. `/api/library/catalog` derives all owned lines once and uses one bounded attempt read for course and line summaries; `/api/courses/:courseId/overview` serves course metadata, chapters, statistics, and active sublines from one course derivation.
- `packages/contracts` is an active workspace. Endpoint schemas are added only after their actual API output and consumers have been verified.

Frontend conventions and accepted debt are documented under `docs/frontend`.

## Frontend product ownership

- `/library` is the Study planner. Its primary hierarchy and summaries come from one `/api/library/catalog` request. It owns repertoire/section browsing, line checkbox selection, marathon mode selection, and selected-line basket navigation to `/library/marathon`.
- App navigation lives in `apps/web/src/app/core/layout/main-navigation`. It owns the hierarchical desktop/mobile nav model described in [Frontend Navigation](frontend/navigation.md). Keep desktop and mobile navigation driven by the same route/group data.
- Study is the primary entry point for repertoire study and tactical missed-shot training. The main menu nests Missed shots under Study rather than exposing it as a separate top-level item.
- Openings groups Opening analysis (`/opening-analysis`) and Opening struggles (`/opening-struggles`). Opening struggles remains routed directly even though its implementation currently lives under the Lab experiment directory.
- Tools groups Analysis (`/analysis`) and Lab (`/lab`). These routes are not Settings.
- Settings groups import accounts (`/settings/accounts`), Lichess OAuth integration (`/settings/lichess`), and Appearance (`/settings/appearance`). Legacy `/accounts` URLs redirect into Settings or Progress routes.
- Progress uses `/progress` as the entry point and `/progress/accounts/:accountId` for the account dashboard. The entry route opens the default progress account first, then an active account, then the first available account.
- `/chapters/:chapterId/lines` is the line/subline training-health diagnosis page. It owns line selection, expandable per-line subline status, and selected-subline drill launch.
- `/courses/:courseId` stays course/content oriented. Its available-sublines section is a structural repertoire dump, not a user-specific training-health dashboard.
- `/library/marathon`, `/courses/:courseId/marathon`, and `/chapters/:chapterId/marathon` share the line marathon page. Query parameters can provide `lineIds`, `sublineHashes`, and `mode`; route params provide optional course/chapter scope.
