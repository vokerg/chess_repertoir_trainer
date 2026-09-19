# Working guide: Contracts

Use this guide when defining or changing request/response shapes shared between API and web. The procedural agent workflow is `.github/skills/api-contract-change/SKILL.md`.

## Goal

Keep API boundary shapes explicit and shared without confusing them with domain logic, Prisma models, or UI state.

## Current status

`packages/contracts` is an active root workspace, but schemas are exported only after verification against the real route, mapper, Angular consumer, and tests. Do not revive the deleted provisional exports.

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
5. Update API route validation/serialization to use the schema.
6. Update frontend API calls to use the inferred types.
7. Avoid adding behavior to the contract file.

## Workspace status

The package is wired into root, API, web, CI, and deployment build order. Product exports still move only as complete endpoint slices; workspace activation alone does not make an unverified shape authoritative.

Run the narrowest relevant validation when practical and report what was and was not run.

## Review checklist

- Is this a real HTTP/API boundary shape?
- Is the schema independent of Prisma internals?
- Is there any business logic hiding in the contract?
- Does the frontend need all exposed fields?
- Does the API validate the same shape the frontend expects?
- Was the lockfile regenerated if workspaces changed?
