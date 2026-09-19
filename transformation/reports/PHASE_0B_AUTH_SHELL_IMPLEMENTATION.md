# Phase 0B authentication shell implementation

Date: 2026-07-26

## Goal

Implement the next isolated visual-transformation slice after the public landing page: a shared authentication experience for `/login` and `/signup`.

## Implemented

- Added `AuthShellComponent` as the shared layout for sign-in and sign-up.
- Added the Node Branch brand treatment using controlled CSS geometry.
- Added a graphite story panel and focused light authentication workspace.
- Added responsive behavior that collapses to a compact mobile composition.
- Removed `/login` and `/signup` from the existing signed-in navigation shell.
- Preserved the existing Clerk mount/unmount lifecycle.
- Preserved `returnUrl` propagation and existing post-auth navigation.
- Preserved local development authentication behavior.
- Applied Clerk appearance variables through `Clerk.load()` for product-aligned colors, radius, inputs, and typography.
- Replaced vendor-oriented page copy with product-oriented access copy.

## Scope intentionally excluded

- signed-in `/home`;
- post-login destination changes;
- navigation rail redesign;
- global design-token migration;
- production SVG asset extraction;
- changes to API authentication or persistence;
- changes to authenticated feature pages.

## Files changed

- `apps/web/src/app/features/auth/auth-shell.component.ts`
- `apps/web/src/app/features/auth/auth-shell.component.css`
- `apps/web/src/app/features/auth/login-page.component.ts`
- `apps/web/src/app/features/auth/login-page.component.html`
- `apps/web/src/app/features/auth/login-page.component.css`
- `apps/web/src/app/features/auth/signup-page.component.ts`
- `apps/web/src/app/features/auth/signup-page.component.html`
- `apps/web/src/app/core/auth/auth.service.ts`
- `apps/web/src/app/app.component.ts`
- `apps/web/src/app/app.component.html`

## Validation required

Review both configured-Clerk and local-development-auth modes.

1. Open `/login` at desktop and mobile widths.
2. Open `/signup` at desktop and mobile widths.
3. Confirm the signed-in application navigation is absent on both routes.
4. Confirm links between sign-in and sign-up preserve `returnUrl`.
5. Confirm Clerk components mount, submit, and unmount normally.
6. Confirm successful authentication still navigates to the explicit return URL or `/library`.
7. Confirm authenticated routes retain the existing application shell.

## Validation not performed here

Local build, lint, tests, browser rendering, and Clerk interaction testing were not available through the connector-only execution environment. Pull-request CI and direct browser review remain required.

## Residual risks

- Clerk appearance-variable compatibility must be confirmed against the installed `@clerk/clerk-js` version during build and browser review.
- The Node Branch geometry is still embedded as CSS rather than a shared production asset.
- IBM Plex Sans remains a preferred stack entry rather than a bundled font.

## Next gate

Approve or revise the authentication composition before implementing the signed-in `/home` experience or navigation shell.
