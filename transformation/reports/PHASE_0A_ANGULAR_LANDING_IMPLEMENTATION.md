# Phase 0A Angular landing implementation

Date: 2026-07-26

Branch: `visual-transformation/phase-0a-angular-landing`

Target branch: `visual_transformation`

## Purpose

Make the approved Phase 0A public landing direction reviewable in the real Angular application without beginning the authentication, signed-in home, navigation-rail, or representative-workflow transformation phases.

## Implemented

- Added `LandingPageComponent` as a standalone Angular component under `apps/web/src/app/features/public/`.
- Added component-scoped responsive styling based on the Phase 0A prototype.
- Applied the approved `#1F7865` strong-mint text token.
- Added a controlled inline Node Branch-inspired vector mark and wordmark treatment.
- Connected public calls to action to the existing `/login` and `/signup` routes.
- Changed `/` from an authenticated `/library` redirect to the public landing page.
- Kept all existing authenticated routes and guards.
- Rendered `/` outside the current application shell so the signed-in navigation and job UI are not shown on the public page.
- Changed the wildcard fallback to `/`, making unknown public URLs return to the landing page rather than an authenticated route.

## Scope intentionally excluded

- No authentication-page redesign.
- No Clerk theming changes.
- No `/home` route or signed-in dashboard.
- No post-login redirect changes.
- No global design-token migration.
- No production shared brand component or asset package.
- No changes to APIs, contracts, database models, jobs, or feature behavior.
- No changes to authenticated page layouts.

## Architecture notes

The landing page is a lazy-loaded standalone route, matching the existing route-loading convention. Its design tokens and page-specific composition remain component-scoped to prevent an early global visual migration. The root component only distinguishes `/` from the existing application shell; it does not introduce a new generalized layout abstraction in this slice.

This is deliberately a review implementation rather than the final public-layout architecture. Shared public/auth/app layouts and reusable brand assets should be decided after the browser review.

## Validation

Performed through repository inspection:

- verified the route continues to use lazy standalone components;
- verified all previous authenticated route definitions remain present;
- verified existing guards remain attached to authenticated routes;
- verified public calls to action use Angular `RouterLink` and existing route names;
- verified the landing page uses component-scoped CSS and adds no dependency.

Not performed in this session:

- local Angular build;
- unit tests;
- lint;
- browser screenshots;
- automated accessibility audit.

The execution environment could not resolve `github.com` for a local clone, so validation is expected to continue through pull-request CI and a branch deployment or local checkout by the reviewer.

## Review checklist

- Open `/` at desktop, tablet, and mobile widths.
- Confirm the header, wordmark, mark geometry, typography hierarchy, mint usage, and overall density.
- Confirm the illustrative product workspace is legible and not mistaken for live data.
- Confirm `Sign in` opens `/login`.
- Confirm each primary call to action opens `/signup`.
- Navigate to authenticated routes and confirm the existing application shell remains unchanged.
- Confirm whether this page is acceptable as the basis for extracting a shared public layout and production brand assets.

## Residual risks

- The inline mark is an implementation-local interpretation; production shared SVG assets remain a later task.
- IBM Plex Sans is specified as the preferred font but is not bundled or externally loaded in this slice, so system fallback may render during review.
- The root-component route check is intentionally narrow and should be replaced by explicit public/auth/app layouts when that architecture is approved.
- Browser behavior and responsive rendering still require direct review.

## Recommended next checkpoint

Review and approve or revise this landing page in the browser. Do not merge without explicit approval. After approval and squash merge into `visual_transformation`, decide whether the next slice is shared production brand/public layout extraction or the planned authentication and signed-in home visualizations.
