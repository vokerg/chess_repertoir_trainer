# Skill: Architecture review

Use this skill before merging any PR that changes source code, project structure, deployment configuration, or shared packages.

Existing global API services and page-heavy Angular components are accepted debt. Review changes for unnecessary expansion of that debt; do not require unrelated migration work.

## Goal

Catch boundary erosion early. The repo should stay a monorepo with clear apps, modules, and packages.

```text
app      = deployable/runtime unit
module   = feature/domain boundary inside an app
package  = reusable code shared across apps
```

## Review pass 1: ownership

For each changed file, ask:

- Which app, module, or package owns this file?
- Does the file live where that owner expects it to live?
- Did a feature change land in a global technical bucket unnecessarily?
- Did a reusable concern land inside one feature by mistake?

## Review pass 2: API modules

Check backend changes:

- Feature routes live under `apps/api/src/modules/<feature>` where practical.
- Route files do not contain large business workflows.
- Service files do not depend on Fastify reply/request objects.
- Prisma access is hidden behind repositories or feature services.
- Cross-module imports go through public boundaries or explicit ports.
- `routes/index.ts` remains composition-only.
- New feature work does not copy legacy global routes/services as its default structure.

## Review pass 3: frontend modules

Check Angular changes:

- Changes comply with `docs/frontend/angular-architecture.md` or document an explicit exception.
- Feature code is moving toward `features/<feature>`.
- Large page components are not growing more orchestration.
- Child components are mostly presentational.
- API calls are not scattered across unrelated UI components.
- Shared components do not import feature internals.
- Feature components do not import other feature internals.
- Repeated domain data uses stable tracking and refactored templates use built-in control flow.
- Signal-owned state and API DTOs are updated immutably.

## Review pass 4: packages

Check shared packages:

- `chess-domain` stays pure: no Prisma, Fastify, Angular, env vars, or HTTP.
- `contracts` contains request/response shapes only, not business logic.
- Workspace changes include `package-lock.json` updates.
- Shared code is actually used by more than one app or clearly intended to be.

## Review pass 5: deployment and environment

Check operational impact:

- New env vars are documented in `.env.example` and deployment docs.
- Build/start commands still work for Render/Vercel setup.
- Prisma schema changes include migrations.
- Migration commands still have required env vars such as `DATABASE_URL` and `DIRECT_URL`.
- Runtime code binds to `process.env.PORT` where needed.
- CORS changes do not break Vercel-to-Render communication.

## Review pass 6: validation

Run the narrowest relevant validation when practical. Report what ran, what was skipped, and any warnings. Documentation-only changes do not require broad application test runs.

## Red flags

- New global service that only one feature uses.
- Frontend page component gains another unrelated responsibility.
- New docs describe planned modules as current code.
- Contracts expose entire Prisma models by default.
- `chess-domain` imports framework code.
- Build scripts change without lockfile or deployment doc updates.
- PR says refactor but changes product behavior silently.

## PR summary template

Use this when reviewing or writing PR descriptions:

```text
## Product behavior
- ...

## Architecture impact
- ...

## Deployment/env impact
- ...

## Tests/checks
- ...

## Follow-up
- ...
```
