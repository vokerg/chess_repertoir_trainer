# API feature module

Use this guide when changing backend behavior under `apps/api`.

## Current structure

Notable registered feature modules include:

```text
modules/
  analysis/              engine and game analysis
  courses/               repertoire authoring
  imported-games/        game queries and derived opening data
  lab/                   exploratory reports
  opening-struggles/     recurring opening problems and course coverage
  repertoire-coverage/   course review matching
  stats/                 aggregate statistics
  training/              line training sessions
  training-marathons/    marathon workflow
```

`apps/api/src/routes/index.ts` is the complete route composition source of truth. The list above is descriptive rather than exhaustive. Route composition also registers global external-account and authentication routes. Global services and repositories remain in use, including provider import services and some training, stats, PGN, and current-user logic.

These global files are accepted legacy debt. They describe the current implementation, not the preferred shape for new work. In particular, there are no current `games` or `importers` modules.

## New work

- Extend the owning module under `apps/api/src/modules` when one exists.
- Keep route handlers focused on HTTP parsing, validation, service calls, and expected error mapping.
- Put feature workflow and Prisma access in feature-local services/repositories where practical.
- Make narrow changes without spreading old organizational patterns. Do not add `*.openapi.ts`, an OpenAPI registry, or a merge layer.
- Change endpoints vertically with shared contracts where appropriate and Fastify route schemas as described in `docs/api-conventions.md` and `.github/skills/openapi-route-migration/SKILL.md`.
- Register module routes only in `apps/api/src/routes/index.ts`.
- Avoid arbitrary deep imports into another module's internals. Reuse an explicitly shared application/domain boundary when behavior has more than one owner.
- `repertoire-coverage/course-review.matcher.ts` is currently the intentional shared repertoire-sequence boundary used by course review and opening-struggle course annotations. Persistence remains in the owning repositories.
- Reuse chess logic from `packages/chess-domain` instead of duplicating it.

Not every module needs the same file layout. Follow the owning module's current pattern and add a new abstraction only when it clarifies real ownership.

## Legacy changes

When a task touches a global route or service, either make a narrow change there or perform an explicit, scoped migration. Do not create a nominal feature module that still leaves ownership split across duplicate implementations, and do not copy global technical buckets as the default for new features.

## Validation

Run the narrowest relevant validation when practical and report what was and was not run. Documentation-only cleanup does not require broad application test runs.
