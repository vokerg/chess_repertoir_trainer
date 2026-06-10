---
name: api-feature
description: "Use for backend/API work under apps/api: Fastify routes, Prisma queries, imported games, repertoire/course APIs, training APIs, review APIs, background jobs, API DTOs, and backend refactors. Do not use for Angular-only changes."
---

# API Feature

Use this skill for backend work under `apps/api`.

## First steps

Before editing:

* Inspect the relevant route/module/service.
* Trace the request flow from route to service to database/domain helpers.
* Check existing DTOs and Prisma models before introducing new shapes.
* Prefer extending existing feature-local patterns over adding a new architecture style.

The API is partly migrated. Current feature modules live under `apps/api/src/modules`, while external-account/import routes and several services remain global. Treat those global files as accepted legacy debt; make narrow changes when needed, but do not copy that layout for new features.

## Core rules

* Keep route handlers thin.
* Validate and normalize input at the API boundary.
* Put orchestration in feature/application services where practical.
* Keep Prisma access explicit and easy to trace.
* Avoid duplicating chess/domain logic that belongs in `packages/chess-domain`.
* Avoid leaking database implementation details into frontend-facing API shapes.
* Prefer typed request/response contracts.
* Preserve backward compatibility unless the task explicitly asks for an API break.

## Domain boundary

Use `packages/chess-domain` for pure chess/repertoire/training logic when the logic:

* is independent from Fastify, Prisma, HTTP, or the filesystem;
* can be unit-tested without infrastructure;
* may be reused by frontend, backend, or tests.

Do not put infrastructure dependencies into `packages/chess-domain`.

## Prisma/database work

When changing Prisma-related code:

* Inspect existing schema relations and indexes.
* Avoid N+1 query patterns.
* Keep migrations intentional and minimal.
* Consider data backfill/default behavior when adding fields.
* Check whether existing import/review/training flows depend on the changed model.

## Before finishing

Run the narrowest relevant validation when practical and report what was and was not run. Do not block documentation-only cleanup on broad test runs.
