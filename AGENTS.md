# Repository instructions

This is a chess repertoire trainer with an Angular frontend, Fastify/Prisma backend, and shared chess/domain packages.

## How to work in this repo

Before changing code:

* Inspect the relevant feature/module first.
* Understand existing naming, data flow, state management, and tests before editing.
* Prefer small, feature-local changes over new global abstractions.
* Do not introduce cross-feature deep imports.
* Do not move logic into shared/global code unless it is genuinely reused by multiple features.
* Keep changes focused on the requested problem.

## Project skills

Use project skills when relevant:

* Use `$angular-frontend` for Angular/frontend work under `apps/web`.
* Use `$api-feature` for backend/API work under `apps/api`.
* Use `$architecture-review` before larger refactors, feature reviews, duplicated-code analysis, or unclear architectural changes.

If a task touches multiple areas, inspect all involved boundaries before editing.

## Architecture boundaries

* `apps/web` owns Angular UI, frontend state, pages, components, and frontend data-access services.
* `apps/api` owns Fastify routes, API orchestration, Prisma access, import jobs, and backend services.
* `packages/chess-domain` must remain pure TypeScript domain logic. It must not depend on Angular, Fastify, Prisma, browser APIs, or Node-only infrastructure unless explicitly intended.
* Shared packages should contain stable domain/application logic, not one-off feature implementation details.

## Angular frontend rules

For frontend changes:

* Use standalone Angular components.
* Use `ChangeDetectionStrategy.OnPush`.
* Prefer signals/computed for component state.
* Keep route/page components as composition and orchestration shells.
* Put page workflows and mutable page state in feature-local stores/facades.
* Put HTTP calls in typed data-access services.
* Keep presentational components free of HTTP and backend knowledge.
* Use built-in template control flow: `@if`, `@for`, `@switch`.
* Track lists by stable domain ids where possible.
* Preserve filters, pagination, selected rows, loaded rows, and user context during row-level commands.

Project Angular docs are authoritative:

* `docs/frontend/angular-architecture.md`
* `docs/frontend/angular-patterns.md`
* `docs/frontend/angular-migration.md`
* `docs/skills/frontend-feature-module.md`

Do not rely on generic/downloaded Angular reference docs as project rules.

## Backend/API rules

For backend changes:

* Keep route handlers thin.
* Put orchestration into feature/application services where practical.
* Keep Prisma access explicit and easy to trace.
* Validate inputs at the API boundary.
* Keep domain decisions out of infrastructure-heavy code where possible.
* Avoid duplicating chess logic already available in shared/domain packages.

## Validation

Run the most relevant validation before finishing.

Common commands:

* Frontend changes: `npm run build:web`
* Backend/API changes: inspect `package.json` and run the relevant build/test command.
* Shared/domain changes: run affected package tests/builds where available.

When reporting completion:

* Say what changed.
* Say what validation was run.
* Mention any warnings, skipped tests, uncertainty, or follow-up risks.
