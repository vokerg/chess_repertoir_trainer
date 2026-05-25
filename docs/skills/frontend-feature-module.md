# Skill: Frontend feature module

Use this skill when changing Angular code in `apps/web`.

## Goal

Keep the frontend organized by product features and prevent large page components from becoming a mix of UI, state, API orchestration, board behavior, and feature logic.

## Target shape

```text
apps/web/src/app/
  core/
    api/
    config/

  shared/
    chess-board/
    ui/

  features/
    courses/
    line-editor/
    training/
    games/
    lichess-importer/
    stats/
```

## Rules

- Feature-specific code belongs under `features/<feature>`.
- Reusable dumb UI belongs under `shared`.
- Global API/config/infrastructure belongs under `core`.
- Large pages should become shells.
- Feature orchestration belongs in facades, state services, or feature-local utilities.
- Components should prefer inputs/outputs over direct ownership of broad workflows.
- Child UI components should not make unrelated API calls.
- Do not import another feature's internals. Promote shared pieces to `shared` if truly reusable.

## Page component rule

A page component may:

- Read route params.
- Connect feature components.
- Delegate to a facade or feature service.
- Display top-level loading/error states.

A page component should not keep growing:

- Tree traversal algorithms.
- Long API workflows.
- Engine scheduling logic.
- Board state mechanics.
- Complex derived state.
- Feature-specific persistence logic.

## Suggested line-editor direction

The line editor is the highest-risk frontend area. Move toward:

```text
features/line-editor/
  pages/
    line-editor-page.component.ts
  components/
    editor-board-panel/
    move-tree-panel/
    move-notes-panel/
    engine-panel/
    editor-toolbar/
  state/
    line-editor.facade.ts
    line-tree-navigation.ts
  data-access/
    line-editor.api.ts
```

## Adding a frontend feature

1. Pick or create `features/<feature>`.
2. Put route-loaded page components under `pages`.
3. Put feature-specific components under `components`.
4. Put HTTP wrapper functions under `data-access`.
5. Put orchestration and state under `state` or a facade.
6. Promote only genuinely reusable UI to `shared`.
7. Keep direct `ApiService` usage close to data-access/facades, not scattered across child components.

## Review checklist

- Did this change make a page component larger or smaller?
- Is API orchestration centralized in a facade/data-access file?
- Are child components mostly presentational?
- Did any feature import another feature's internals?
- Does shared code stay feature-agnostic?
- Is the route file importing from the feature boundary rather than random page locations where practical?
