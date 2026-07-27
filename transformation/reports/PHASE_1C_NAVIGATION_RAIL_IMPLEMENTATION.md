# Phase 1C Production Navigation Rail Implementation

Date: 2026-07-27

Branch: `visual-transformation/phase-1c-navigation-rail`

Target: `visual_transformation`

Pull request: #112

## Purpose

Implement the explicitly approved Phase 1B navigation-shell contract as a narrow Angular production slice.

The change replaces the signed-in desktop floating pill header with a collapsible graphite rail while preserving routes, navigation data, account behavior, mobile access, root overlays, APIs, schemas, database behavior, dependencies, and feature workflows.

## Repository implementation inspected

The implementation follows the current ownership boundaries:

- `AppComponent` owns the signed-in shell, routed workspace, imported-game job panel, and confirmation dialog;
- `MainNavigationComponent` owns the only navigation item array, active-prefix matching, authentication state, and mobile navigation state;
- `BrandLockupComponent`, `BrandMarkComponent`, and `NavIconComponent` provide the approved shared identity and icons;
- `VIEWPORT_BREAKPOINTS.mobileMaxPx` and the documented 760px CSS threshold define the desktop/mobile shell boundary.

No new route-layout component, navigation service, state store, persistence mechanism, dependency, or backend behavior was required.

## Implemented contract

### Desktop shell

`AppComponent` now uses:

```text
grid-template-columns: auto minmax(0, 1fr)
```

The navigation rail owns its current width, allowing the routed workspace to resize naturally without cross-component state or duplicated collapse state.

Initial widths:

- expanded: `240px`;
- collapsed: `74px`.

These values remain within the approved discovery ranges and may receive only focused optical adjustment after real browser review.

### Navigation source

`MainNavigationComponent.mainNavItems` remains the only destination definition.

The production rail derives:

- primary destinations: Home, Study, Courses, Games, Openings, Progress;
- quieter workspace destinations: Tools and Settings.

The derivation filters the existing item array. It does not duplicate route definitions.

Existing values remain authoritative:

- `link`;
- `children`;
- `icon`;
- `quiet`;
- `activePrefixes`;
- child descriptions.

### Collapse behavior

The component uses a local Angular signal for collapse state.

The first implementation intentionally has:

- an explicit user toggle;
- no local-storage or account persistence;
- no query-parameter state;
- no route-specific automatic collapse;
- no new service or global state.

Changing rail state closes any open child flyout.

### Parent and child destinations

Parent destinations remain anchors to their existing default routes.

Items with children receive a separate disclosure button with:

- an accessible label;
- `aria-haspopup="menu"`;
- `aria-expanded`;
- `aria-controls` tied to a stable flyout id.

Anchored flyouts are used in both expanded and collapsed modes. This keeps one interaction model and avoids hover-only child access.

Transient flyouts close through:

- disclosure reactivation;
- child or parent route selection;
- Escape;
- backdrop interaction;
- Angular `NavigationEnd`.

Lower Tools and Settings flyouts open upward to reduce bottom-edge pressure.

### Branding and account area

Expanded mode uses the shared inverse live-text lockup and plain Node Branch mark.

Collapsed mode uses the shared plain Node Branch mark without the wordmark.

The account area remains at the bottom of the rail:

- Clerk mode retains `ClerkUserButtonComponent`;
- development authentication retains a shared account icon and display name semantics;
- long display names remain constrained rather than changing account behavior.

### Mobile boundary

Below the documented 760px breakpoint:

- the desktop rail is hidden;
- the compact branded header remains;
- the complete grouped modal sheet remains;
- every destination is still generated from `mainNavItems`;
- route navigation and Escape close the sheet;
- no bottom navigation is selected or implemented.

## Tests added

`main-navigation.component.spec.ts` covers:

- all top-level destinations rendering from the shared model;
- expanded/collapsed transitions;
- shared mark/lockup state changes;
- parent route preservation;
- separate child disclosure behavior;
- Escape closure;
- route-navigation cleanup;
- active-route state after navigation;
- mobile-sheet cleanup after navigation.

## Files changed

Runtime and tests:

- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.ts`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.html`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.css`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.spec.ts`
- `apps/web/src/app/app.component.css`

Transformation records:

- `TRANSFORMATION.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `transformation/WORKING_RULES.md`
- `transformation/reports/PHASE_1C_NAVIGATION_RAIL_IMPLEMENTATION.md`

## Behavior deliberately preserved

- all URLs and router links;
- active route prefix semantics;
- authentication and explicit return-URL behavior;
- Clerk account mounting;
- development authentication;
- imported-game job panel ownership and bottom-padding behavior;
- confirmation dialog ownership;
- page filters, pagination, selected rows, query parameters, and local feature state;
- board, training, analysis, and course workflows;
- mobile access to every destination;
- APIs, contracts, schemas, database models, jobs, and dependencies.

## Explicit exclusions

This slice does not include:

- permanent bottom navigation;
- final mobile-primary-destination selection;
- persisted collapse preference;
- route-specific auto-collapse;
- route registration changes;
- public or authentication layout changes;
- global token migration;
- typography loading changes;
- page-header, panel, or button redesign;
- Games, Study, or Opening Analysis modernization;
- backend behavior;
- new dependencies.

## Validation

### Repository inspection

Performed:

- read the transformation entry point, master plan, decisions, status, and working rules;
- read `AGENTS.md`, the Angular frontend skill, and Angular architecture;
- inspected `AppComponent` shell ownership;
- inspected `MainNavigationComponent` TypeScript, template, and styles;
- inspected brand mark/lockup contracts and navigation icons;
- inspected shared breakpoint documentation;
- inspected imported-game job panel positioning;
- inspected existing Angular component-test conventions.

### Local executable validation

A direct repository checkout is unavailable in the execution environment.

Attempted:

```text
git ls-remote https://github.com/vokerg/chess_repertoir_trainer.git HEAD
```

Result:

```text
fatal: unable to access 'https://github.com/vokerg/chess_repertoir_trainer.git/': Could not resolve host: github.com
```

Therefore these commands were not run locally:

```text
npm run build:web
npm run test --workspace=apps/web
npm run lint
npm run check:architecture
```

GitHub Actions CI on PR #112 is the authoritative executable validation. Final-head results must be recorded before the PR is marked ready for review.

### Browser validation not performed

Direct browser review remains required for:

- expanded and collapsed widths;
- long labels and user names;
- actual icon alignment;
- flyout placement near viewport edges;
- keyboard order and visible focus;
- Clerk account controls;
- representative Home, Games, Study, Courses, Opening Analysis, free Analysis, Progress, Lab, and Settings pages;
- mobile grouped sheet;
- imported-game job panel and confirmation overlay coexistence.

## Residual risks

- the exact rail widths may require a small optical correction after real-page review;
- anchored flyouts may require horizontal or vertical collision handling on constrained desktop/tablet widths;
- CSS `:has()` support should be confirmed against the project's supported browser set;
- long translated labels may pressure collapsed disclosure geometry;
- mobile focus containment remains the existing sheet behavior rather than a new focus-trap implementation;
- current global content width may feel constrained on some pages once the rail consumes desktop width;
- prior authentication, home, favicon, and brand-rasterization validation gaps remain open.

## Review order

1. final-head PR #112 CI;
2. expanded rail on Home and Games;
3. collapsed rail on Opening Analysis and free Analysis;
4. Study, Openings, Tools, and Settings flyouts;
5. keyboard navigation and Escape;
6. Clerk and development-auth account area;
7. mobile grouped sheet at 760px and narrow-phone widths;
8. job panel and confirmation dialog behavior;
9. transformation decision and status updates.

## Stop condition

Do not merge PR #112 without explicit approval. When approved, squash merge it into `visual_transformation`.

Do not begin global token/typography migration or representative workflow modernization as part of this branch.

## Files inspected

- `TRANSFORMATION.md`
- `transformation/MASTER_PLAN.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `transformation/WORKING_RULES.md`
- `transformation/reports/PHASE_1B_NAVIGATION_DISCOVERY.md`
- `AGENTS.md`
- `.agents/skills/angular-frontend/SKILL.md`
- `docs/frontend/angular-architecture.md`
- `docs/frontend/responsive-layout.md`
- `apps/web/package.json`
- `apps/web/src/app/app.component.html`
- `apps/web/src/app/app.component.css`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.ts`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.html`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.css`
- `apps/web/src/app/core/auth/auth.service.ts`
- `apps/web/src/app/core/auth/clerk-user-button.component.ts`
- `apps/web/src/app/core/jobs/imported-game-job-panel.component.css`
- `apps/web/src/app/shared/ui/brand/brand-mark.component.ts`
- `apps/web/src/app/shared/ui/brand/brand-mark.component.html`
- `apps/web/src/app/shared/ui/brand/brand-mark.component.css`
- `apps/web/src/app/shared/ui/brand/brand-mark.component.spec.ts`
- `apps/web/src/app/shared/ui/brand/brand-lockup.component.ts`
- `apps/web/src/app/shared/ui/brand/brand-lockup.component.html`
- `apps/web/src/app/shared/ui/brand/brand-lockup.component.css`
- `apps/web/src/app/shared/ui/nav-icon/nav-icon.component.ts`
