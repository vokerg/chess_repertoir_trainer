# Phase 1B Navigation Shell Discovery

Date: 2026-07-26

Branch: `visual-transformation/phase-1b-navigation-discovery`

Target: `visual_transformation`

## Purpose

Define the next narrow visual-transformation checkpoint after the Phase 1A brand assets were squash-merged through PR #88.

This slice establishes a reviewable desktop navigation-rail contract and an explicit mobile-navigation boundary before production Angular changes begin.

It does not change application runtime behavior.

## Current repository state

The signed-in shell is currently owned by `AppComponent`:

- standalone public and authentication routes render directly through the root outlet;
- signed-in routes render inside `.page-shell.app-shell`;
- `MainNavigationComponent` renders before the signed-in content outlet;
- imported-game job status and confirmation overlays remain root-shell siblings.

`MainNavigationComponent` already owns one centralized navigation data model:

- Home;
- Study and its training children;
- Courses;
- Games;
- Openings and its children;
- Progress;
- Tools and its children;
- Settings and its children.

The same item definitions own labels, links, icons, child destinations, quiet treatment, and active route prefixes.

The current desktop presentation is a sticky floating header with wrapping pills and hover/focus dropdowns. The current mobile presentation is a branded header plus a grouped modal sheet below the shared 760px breakpoint.

The repository therefore does not need another navigation source or a route rewrite to introduce the rail.

## Discovery conclusion

Proceed with a separate production implementation slice using the existing `MainNavigationComponent` and its data model.

The initial implementation should replace the desktop floating pill header with an expanded/collapsed left rail while retaining the existing mobile grouped sheet structure.

Do not finalize bottom navigation yet. The exact mobile-primary-destination model remains open until Games, Study, and Opening Analysis have been modernized and reviewed on small screens.

## Desktop rail contract

### Expanded state

Use an approximately 236–244px persistent rail on signed-in desktop layouts.

The expanded rail contains:

1. shared Node Branch lockup and collapse control;
2. primary navigation destinations;
3. a quiet secondary workspace/system section;
4. account identity and Clerk account control at the bottom.

The rail should be visually graphite, restrained, and materially separate from the light analytical workspace.

### Collapsed state

Use an approximately 72–76px icon rail.

The collapsed rail contains:

- the shared Node Branch mark without the live-text wordmark;
- one existing `NavIconComponent` icon per top-level item;
- a visible active indicator;
- an account control at the bottom;
- accessible labels through tooltips or equivalent exposed names.

The first implementation should use an explicit user toggle. It should not add route-specific auto-collapse behavior or persistence until real use establishes that need.

### Navigation groups and children

Reuse `mainNavItems` as the only navigation source.

Top-level destinations keep their current default links and active-prefix semantics.

Items with children must not rely on hover-only access. The production implementation should provide keyboard-operable disclosure behavior:

- the parent destination remains an anchor to its existing default route;
- a distinct disclosure control opens child destinations;
- expanded mode may show a compact inline group or anchored flyout;
- collapsed mode uses an anchored flyout;
- Escape closes an open flyout;
- route navigation closes transient flyouts;
- focus remains predictable.

Do not duplicate child routes into a second hard-coded rail structure.

### Content frame

The signed-in shell becomes a two-column desktop grid:

- rail;
- `minmax(0, 1fr)` workspace.

The existing content pages remain responsible for their own headers, filters, actions, panels, boards, tables, and responsive behavior.

The rail must not become a dashboard or absorb page-specific controls.

The first implementation should preserve:

- `.page-shell` maximum-width behavior unless measured layout review proves it needs revision;
- imported-game job-panel behavior and bottom padding;
- confirmation-dialog ownership;
- all current routes;
- all return-URL behavior;
- current page state and query parameters.

### Account area

Keep the current authenticated identity behavior:

- display name remains available in expanded mode;
- Clerk user button remains the account interaction in configured-Clerk mode;
- development authentication remains supported;
- collapsed mode exposes an accessible account control without inventing a new account workflow.

## Mobile disposition

Phase 1B does not lock bottom navigation.

Below `VIEWPORT_BREAKPOINTS.mobileMaxPx` (`760px`):

- do not render the desktop rail;
- retain a compact branded header;
- retain access to every existing navigation destination through a modal grouped sheet;
- continue to reuse `mainNavItems`;
- keep route changes closing the sheet;
- improve focus management, Escape handling, scroll containment, and close-button semantics during production implementation;
- preserve board and training workspace dominance.

A later checkpoint may introduce bottom navigation or a primary-destination subset after representative mobile workflows provide evidence.

## Visual proof

The interactive static prototype is under:

```text
transformation/prototypes/phase-1b-navigation/
```

Run it from the repository root:

```bash
python3 -m http.server 4173 --directory transformation/prototypes/phase-1b-navigation
```

Review:

- expanded desktop rail;
- collapsed desktop rail;
- retained mobile grouped sheet;
- workspace width and hierarchy;
- active-state contrast;
- brand treatment;
- account placement.

The prototype uses letter placeholders for navigation icons. Production must continue using the existing `NavIconComponent` icon set.

## Recommended production implementation scope

A separately approved Angular slice should be limited to:

- `apps/web/src/app/app.component.html`;
- `apps/web/src/app/app.component.css`;
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.ts`;
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.html`;
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.css`;
- focused navigation component tests;
- transformation documentation and implementation report.

Potentially touched shared files must be justified by an observed need. No new route-layout component is required for the first rail slice.

## Explicit exclusions

Do not include in the first production rail slice:

- bottom navigation;
- final mobile-primary-destination selection;
- route registration changes;
- public or authentication layout changes;
- page-header redesign;
- global token migration;
- typography loading changes;
- representative workflow redesigns;
- new navigation state service;
- new persistence or backend behavior;
- dependencies.

## Production acceptance criteria

1. Desktop signed-in routes use the graphite left rail.
2. Expanded and collapsed states are keyboard operable.
3. The existing navigation item array remains the only route/menu source.
4. Every existing destination remains reachable.
5. Active route semantics remain correct for parent and child routes.
6. Child destinations do not depend on hover.
7. Mobile retains full grouped navigation below 760px.
8. Opening a route closes transient navigation surfaces.
9. Focus is visible and Escape closes open flyouts or the mobile sheet.
10. Clerk and development-auth account controls remain functional.
11. The imported-game job panel and confirmation dialog remain functional.
12. Home, Games, Study, Courses, Opening Analysis, free Analysis, Progress, Lab, and Settings remain usable at representative widths.
13. No API, contract, schema, database, dependency, or workflow behavior changes.
14. Lint, web build, architecture checks, tests, and focused navigation tests pass.
15. Browser review covers desktop expanded/collapsed, tablet pressure, mobile sheet, keyboard navigation, and long labels.

## Validation performed for this discovery slice

- inspected the transformation entry point, master plan, decisions, status, and working rules on `visual_transformation`;
- confirmed PR #88 was squash-merged before creating this branch;
- inspected current signed-in shell ownership;
- inspected centralized navigation data, route-active behavior, desktop dropdowns, mobile sheet, account controls, and breakpoint usage;
- inspected global page-shell width and current shell spacing;
- inspected the repository responsive-layout contract;
- created a dependency-free HTML/CSS/JavaScript prototype with expanded, collapsed, and mobile views.

## Validation not performed

Because this slice changes documentation and static prototype files only:

- Angular build was not run;
- Angular tests were not run;
- lint was not run;
- architecture checks were not run;
- browser automation was not run;
- Clerk interaction was not tested.

Direct browser review of the static prototype remains required.

## Residual risks

- the collapsed width may require optical adjustment with real navigation icons;
- child flyout placement must be tested near viewport edges;
- long user names and translated labels may pressure the expanded rail;
- the existing `.page-shell` maximum width may feel overly constrained after the rail is introduced;
- the imported-game job panel may require spacing review beside the rail;
- current mobile sheet focus management may need more than visual restyling;
- exact mobile primary navigation remains intentionally unresolved.

## Files inspected

- `TRANSFORMATION.md`
- `transformation/MASTER_PLAN.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `transformation/WORKING_RULES.md`
- `apps/web/src/app/app.component.html`
- `apps/web/src/app/app.component.css`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.ts`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.html`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.css`
- `apps/web/src/styles.css`
- `docs/frontend/responsive-layout.md`
- `transformation/prototypes/phase-0c-home/index.html`
- `transformation/prototypes/phase-0c-home/styles.css`
