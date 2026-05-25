# Skill: API feature module

Use this skill when adding or changing backend behavior in `apps/api`.

## Goal

Keep backend code grouped by product feature instead of drifting back to flat technical buckets like global `routes/`, `services/`, and `repositories/`.

## First decision: who owns the behavior?

Choose exactly one owning module:

```text
apps/api/src/modules/
  courses/       course, chapter, line, move-node authoring
  training/      training sessions and attempts
  games/         linked accounts, imported games, import runs
  importers/     provider-specific importers
  stats/         reporting and aggregated read models
  import-export/ JSON backup/import flows
```

If no module fits, pause and name the product concept before adding files.

## Preferred module shape

```text
modules/<feature>/
  <feature>.routes.ts
  <feature>.schemas.ts
  <feature>.service.ts
  <feature>.repository.prisma.ts
  index.ts                 optional public module exports
```

Not every module needs every file immediately. Add files only when they clarify ownership.

## Rules

- Route files should only parse HTTP concerns, validate input, call services, and map expected errors.
- Service files own feature orchestration and business workflow.
- Repository files hide Prisma queries for that feature.
- Do not deep-import another module's internal files.
- If cross-module access is needed, expose a public function, explicit port, or small read service.
- Modules may import shared packages such as `chess-domain` and, later, `contracts`.
- Modules must not import app bootstrapping details such as `main.ts`.
- Infrastructure may compose modules; modules should not compose infrastructure.

## Adding a new endpoint

1. Identify the owning module.
2. Add or reuse a Zod schema in `<feature>.schemas.ts`.
3. Add the route in `<feature>.routes.ts`.
4. Put orchestration in `<feature>.service.ts`.
5. Put Prisma reads/writes in `<feature>.repository.prisma.ts`.
6. Register only the module route file from `apps/api/src/routes/index.ts`.
7. Verify no old global route/service file was expanded unnecessarily.

## Cross-module examples

Good:

```text
training service asks a courses public read function for a line tree
lichess importer writes normalized games through a games repository/service boundary
stats reads through dedicated query functions or reporting repositories
```

Bad:

```text
training deep-imports courses.repository.prisma.ts and mutates move nodes directly
lichess importer imports course services
frontend-shaped DTOs leak into Prisma models
```

## Review checklist

- Does this change have one clear owning module?
- Did Prisma access stay behind repository/service boundaries?
- Did route files avoid business logic?
- Did services avoid HTTP response objects?
- Did module code avoid importing another module's internals?
- Did the global route registry remain boring?
- Did the change avoid introducing a new global utility or service without a strong reason?
