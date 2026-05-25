# Skill: Contracts

Use this skill when defining or changing request/response shapes shared between API and web.

## Goal

Keep API boundary shapes explicit and shared without confusing them with domain logic, Prisma models, or UI state.

## Current status

`packages/contracts` is scaffolded but not wired into root workspaces yet. Do not rely on it in build-critical API or web code until `package-lock.json` is regenerated and the root workspace is updated.

## What belongs in contracts

Contracts may contain:

- Request schemas.
- Response schemas.
- DTO schemas.
- TypeScript types inferred from schemas.
- API enum/string-literal shapes used across API and web.

Examples:

```text
CreateCourseRequest
CreateLineRequest
CreateMoveNodeRequest
StartTrainingResponse
PlayTrainingMoveRequest
PlayTrainingMoveResponse
```

## What does not belong in contracts

Contracts must not contain:

- Chess rules.
- Training engine behavior.
- Prisma queries.
- Fastify route handlers.
- Angular components or services.
- Business workflows.
- Database-only fields that should not cross the HTTP boundary.

## Difference from chess-domain

```text
chess-domain = behavior and rules
contracts    = input/output shapes
```

Examples:

- `chess-domain` answers: was this move correct in this move tree?
- `contracts` answers: what JSON does `POST /api/training/:sessionId/move` accept and return?

## Difference from Prisma models

Prisma models are persistence shapes. Contracts are API shapes.

Do not expose a Prisma model by default just because it exists. Decide what the frontend actually needs.

## Adding or changing a contract

1. Identify the API endpoint or cross-app boundary.
2. Define the request schema if the endpoint accepts a body.
3. Define the response schema if the response is consumed by web.
4. Export inferred TypeScript types.
5. Update API validation to use the schema once contracts are wired.
6. Update frontend API calls to use the inferred types once contracts are wired.
7. Avoid adding behavior to the contract file.

## Wiring contracts into the repo

Only wire `packages/contracts` into root workspaces together with a lockfile update:

1. Add `packages/contracts` to root `package.json` workspaces.
2. Add root scripts such as `build:contracts` if needed.
3. Run `npm install` locally to regenerate `package-lock.json`.
4. Run `npm ci` from a clean checkout if possible.
5. Run `npm run build` and `npm test`.

## Review checklist

- Is this a real HTTP/API boundary shape?
- Is the schema independent of Prisma internals?
- Is there any business logic hiding in the contract?
- Does the frontend need all exposed fields?
- Does the API validate the same shape the frontend expects?
- Was the lockfile regenerated if workspaces changed?
