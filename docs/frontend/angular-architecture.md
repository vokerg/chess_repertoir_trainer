# Angular architecture

This document is the source of truth for frontend architecture under `apps/web`. Agent skills reference these rules rather than redefine them.

## Application shape

The application uses standalone components, route-level lazy loading, OnPush change detection, signal-based feature stores, and immutable state updates.

```text
features/<feature>/
  pages/          route containers
  components/     feature presentation
  state/          stores and orchestration
  data-access/    HTTP services and DTOs
  helpers/        pure domain/view transformations

shared/           feature-agnostic UI and utilities
core/             application-wide infrastructure and configuration
```

Existing code may be migrated incrementally. New code must follow this structure unless a documented exception makes the additional files less maintainable.

Some older `pages/*` files and large route components still own too much state or workflow. This is accepted legacy debt, not a pattern for new features. When touching one, make a narrow safe change or refactor it deliberately; do not reproduce its structure elsewhere.

## Ownership rules

- Route pages compose the feature, read route state, and delegate commands.
- Feature stores own mutable page state, derived state, async commands, and workflow errors.
- Data-access services perform typed HTTP operations only. They contain no UI state.
- Presentational components receive typed inputs and emit typed user intents. They do not call HTTP services.
- Pure parsing, traversal, mapping, and formatting logic belongs in helpers when it can be tested without Angular.
- A feature must not import another feature's internals. Promote genuinely reusable code to `shared` or expose a deliberate public boundary.
- Shared chess board behavior and visual theming belong under `shared/chess/board`; feature code should not duplicate board mechanics.
- The shared analysis workbench is presentational UI only. Feature stores own persistence and workflow semantics: the line editor persists repertoire changes, while game and free analysis own local-only variation trees.
- Dialogs are UI composition concerns. Shared generic confirmation belongs in `shared/ui`; feature-specific input dialogs belong in `features/<feature>/components`; stores must not call browser-native dialogs or collect user input.

## Angular defaults

- Use standalone components and `loadComponent` for route pages.
- Use `ChangeDetectionStrategy.OnPush` for every component unless an exception is documented.
- Prefer signal inputs and outputs for new or substantially refactored components.
- Use `@if`, `@for`, and `@switch` for new templates. Legacy structural directives remain supported but should be migrated when the surrounding component is refactored.
- Every `@for` must track a stable domain identity. Index tracking is acceptable only for immutable positional data without identity.
- Use external templates and styles for route pages and non-trivial components.
- Use `inject()` consistently in new code.
- Use `takeUntilDestroyed`, `toSignal`, or template async handling for observable lifecycles. Do not maintain manual subscription collections in components.
- Do not call `ChangeDetectorRef.detectChanges()` to compensate for state that should be signal-driven.

## State rules

- Signals hold source state; `computed` signals hold derived state.
- Do not store values that can be computed reliably from source state.
- Treat signal values and API DTOs as immutable.
- Copy every changed nested object during updates.
- Patch list entities by stable id. A row-level command must not clear or reload an entire collection unless the API provides no reliable alternative.
- Preserve filters, pagination, selection, and local UI context across targeted commands.
- Use `effect()` only for synchronization with non-reactive external systems, not for normal command flow or derived state.
- Do not introduce global state libraries without a demonstrated cross-feature requirement.

## Async command rules

- Stores and facades own loading flags, command state, retries, and user-facing errors.
- Data-access services return typed observables and do not subscribe internally for UI workflows.
- `firstValueFrom` is acceptable for command-oriented store methods where `async`/`await` improves control flow.
- Ignore or cancel stale route/data requests where concurrent navigation can produce incorrect state.
- Update optimistic state only when rollback or failure state is explicit.

## Styling rules

- Global styles contain design tokens, resets, layout primitives, and truly reusable utilities.
- `apps/web/src/design-system.css` owns the semantic visual foundation and compatibility aliases while older global selectors migrate incrementally.
- Feature-specific selectors remain colocated with their component.
- Large inline style blocks are not permitted in route pages.
- Components should use existing tokens rather than adding isolated colors, spacing values, or shadows without reason.
- Route-level `app-page-header` instances are flat by default; use the raised appearance only when the header itself is a meaningful contained surface.
- `app-panel` defaults to a subtle surface. Use raised for the primary elevated surface, flat for structural grouping, and compact density for dense tools.
- Shell command actions default to secondary. Primary and danger appearances must be explicit so pages retain one clear action hierarchy.
- Responsive viewport constants live in `apps/web/src/app/shared/ui/responsive/breakpoints.ts`; shared CSS visibility/alignment utilities live in `apps/web/src/responsive.css`. Numeric CSS media queries should include a nearby sync comment because CSS custom properties cannot be used as breakpoint thresholds.

## Validation

Run the narrowest relevant frontend validation when practical. Report commands run, skipped checks, and build warnings.

## Documenting exceptions

An exception must state the affected file, why the default is unsuitable, and what would trigger revisiting the decision. Convenience or avoiding a small feature-local file is not sufficient justification.
