# Chess Repertoire Trainer

Read [`AGENTS.md`](../AGENTS.md) before editing. It is the canonical repository-wide instruction and command entry point.

This repository is a TypeScript modular monolith:

- `apps/web`: Angular product client;
- `apps/api`: Fastify/Prisma API and workers;
- `apps/mobile`: supported React Native / Expo offline-training companion;
- `packages/chess-domain`: framework-neutral chess and training behavior;
- `packages/contracts`: shared Zod HTTP wire contracts.

Create work from the current `main` head, never work directly on `main`, and do not merge without explicit approval. Pull requests into `main` are squash-merged by default unless the user explicitly requests another strategy.

For the exact command `update changelog`, load and follow [`.agents/commands/update-changelog.md`](../.agents/commands/update-changelog.md).

Before editing, inspect the owning feature, its nearest tests, the applicable `.github/instructions/*.instructions.md`, and the relevant `.github/skills/*/SKILL.md`. Use the program entry points listed in `AGENTS.md` for Repertoire Builder, Onboarding, Activity Feed, and Visual Transformation work.

Use existing boundaries. Keep Fastify routes thin, application services transport-independent, and Prisma access in repositories. Keep Angular HTTP calls in typed feature data-access services and mutable page workflows in feature stores/facades. Keep web and mobile independent; share verified contracts and framework-neutral behavior through packages.

For shared endpoint DTOs, `packages/contracts` owns the Zod wire schema and inferred type. Fastify route schemas generate OpenAPI. Do not add `*.openapi.ts`, a separate registry, duplicate shared DTOs in Angular, expose Prisma models as contracts, or parse an already schema-validated request again.

Every `/api/**` product operation declares explicit OpenAPI metadata and intentional responses. Full-app tests inject `authConfig` rather than mutating global authentication environment state. Focused workspace commands prepare their compiled package dependencies.

Use database aggregation for counts, summaries, facets, and averages. Apply the existing repository predicate before grouping and only post-process bounded aggregate rows in Node.

Run the narrowest relevant checks while developing and the affected acceptance checks before finalizing. Update canonical current-state docs whenever architecture or product behavior changes, and report exactly what ran and what was skipped.
