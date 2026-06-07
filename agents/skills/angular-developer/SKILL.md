---
name: angular-developer
description: Project-specific Angular guidance for the chess repertoire trainer web app.
---

# Angular Developer

Use this skill for changes under `apps/web`.

Before editing, read:

- `docs/frontend/angular-architecture.md` for normative project rules.
- `docs/frontend/angular-patterns.md` for approved implementation recipes.
- `docs/frontend/angular-migration.md` for current migration status and ordering.
- `docs/skills/frontend-feature-module.md` for feature-boundary review.

## Architecture

- Build standalone components and lazy-load route pages with `loadComponent`.
- Use `ChangeDetectionStrategy.OnPush` for pages and presentational components.
- Keep route pages focused on composition and initialization.
- Put HTTP calls and DTO typing in feature-local `data-access` services.
- Put signals, derived state, async commands, and error handling in feature stores or facades.
- Keep components presentational through typed inputs and outputs.
- Use external templates and styles once component markup or CSS is non-trivial.
- Prefer built-in `@if`, `@for`, and `@switch`; track repeated domain items by stable identity.

## State

- Use signals for page state and `computed` for derived state.
- Update signal values immutably, including nested DTOs.
- Patch list rows by stable id after row-level commands.
- Do not reload or clear the Games explorer after analysing or indexing one game.
- Reserve full reloads for initialization, filter application/reset, and explicit refresh.
- Avoid `effect()` for command handling and avoid adding a global state library without a demonstrated need.
- Use `toSignal` and `takeUntilDestroyed` instead of manual component subscription cleanup.

## Games Contracts

- `ImportedGameListItem` is the Games explorer row model.
- Analysis and ply-index states are independent nested summaries.
- A row action must preserve active filters, loaded rows, and pagination cursor.
- Batch commands should patch accepted/completed rows when the API response identifies them.
- When an API response lacks refreshed metrics, patch the reliable status fields and document that limitation.

## Verification

- Add focused store/helper tests for changed state transitions where the test harness supports them.
- Run `npm run build:web` after frontend changes.
- Check that row rendering tracks by game id and that presentational components perform no HTTP work.

Treat the repository architecture document as authoritative if this skill and the docs diverge.
