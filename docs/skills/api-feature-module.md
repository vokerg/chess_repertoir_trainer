# Skill: API feature module

Use this skill when adding or changing backend behavior in `apps/api`.

## Goal

Keep backend code grouped by product feature instead of drifting back to flat technical buckets like global `routes/`, `services`, and `repositories`.

## First decision: who owns the behavior?

Choose exactly one owning module:

```text
apps/api/src/modules/
  courses/       course, chapter, line, move-node authoring
  training/      training sessions and attempts
  games/         linked accounts, imported games, import runs
  importers/     provider-specific importers
  analysis/      backend engine analysis and imported-game analysis
  stats/         reporting and aggregated read models
  import-export/ JSON backup/import flows
```

If no module fits, pause and name the product concept before adding files.

## Preferred module shape

```text
modules/<feature>/
  <feature>.routes.ts
  <feature>.schemas.ts
  <feature>.openapi.ts          route-local OpenAPI metadata when the feature exposes HTTP endpoints
  <feature>.service.ts
  <feature>.repository.prisma.ts
  index.ts                      optional public module exports
```

Not every module needs every file immediately. Add files only when they clarify ownership.

## Rules

- Route files should only parse HTTP concerns, validate input, call services, map expected errors, and register route-local API documentation.
- Service files own feature orchestration and business workflow.
- Repository files hide Prisma queries for that feature.
- OpenAPI metadata belongs next to the owning route/module, not in a growing central hand-written Swagger object.
- New routes should use the OpenAPI route registry/helper or the current generated-docs mechanism so `/api/docs` cannot drift from registered routes.
- Do not deep-import another module's internal files.
- If cross-module access is needed, expose a public function, explicit port, or small read service.
- Modules may import shared packages such as `chess-domain` and, later, `contracts`.
- Modules must not import app bootstrapping details such as `main.ts`.
- Infrastructure may compose modules; modules should not compose infrastructure.

## Adding a new endpoint

1. Identify the owning module.
2. Add or reuse a Zod schema in `<feature>.schemas.ts`.
3. Add route-local OpenAPI metadata in `<feature>.openapi.ts` when the endpoint should appear in `/api/docs`.
4. Add the route in `<feature>.routes.ts` and register the OpenAPI operation through the route-local docs mechanism.
5. Put orchestration in `<feature>.service.ts`.
6. Put Prisma reads/writes in `<feature>.repository.prisma.ts`.
7. Register only the module route file from `apps/api/src/routes/index.ts`.
8. Verify no old global route/service file was expanded unnecessarily.
9. Verify `/api/docs/openapi.json` contains the endpoint after route registration.

## Cross-module examples

Good:

```text
training service asks a courses public read function for a line tree
lichess importer writes normalized games through a games repository/service boundary
stats reads through dedicated query functions or reporting repositories
analysis service reads imported games through its own repository boundary and stores analysis-owned rows
```

Bad:

```text
training deep-imports courses.repository.prisma.ts and mutates move nodes directly
lichess importer imports course services
frontend-shaped DTOs leak into Prisma models
new endpoint exists in Fastify routes but is missing from /api/docs
new endpoint is documented only by editing a central monolithic Swagger object
```

## Review checklist

- Does this change have one clear owning module?
- Did Prisma access stay behind repository/service boundaries?
- Did route files avoid business logic?
- Did services avoid HTTP response objects?
- Did module code avoid importing another module's internals?
- Did HTTP endpoints carry route-local docs/schema metadata when applicable?
- Did `/api/docs/openapi.json` update through the generated/registered route-docs mechanism?
- Did the global route registry remain boring?
- Did the change avoid introducing a new global utility or service without a strong reason?
