# VT-302 Home token compatibility

Date: 2026-08-10
Issue: #133
Pull request: #332
Branch: `visual-transformation/vt-302-home-token-compatibility`
Reviewed refresh base: `main` `f8c32b5ea19c3ff89c03866f39d9e8dadf83aa5c`

## Objective

Resolve the accepted Home visual-token compatibility boundary without changing Home workflow, state, routing, layout, copy, or responsive composition.

## Consumer proof

Repository inspection of the current Home feature found `--home-*` visual roles in exactly two runtime presentation files:

- `apps/web/src/app/features/home/home-page.component.css`
- `apps/web/src/app/features/home/components/today-activity-card.component.css`

`HomePageComponent` and `TodayActivityCardComponent` both use external stylesheet files; neither defines inline component styles. No TypeScript, store, template, route, API, or backend behavior owns these aliases. The child Today Activity component consumes the aliases through CSS custom-property inheritance from the Home host, so the two stylesheets form the complete current runtime consumer boundary.

## Implementation

The Home host no longer declares the local `--home-*` palette. Both Home stylesheets consume the existing production `--ui-*` roles directly for canvas, surfaces, graphite chrome, text, borders, mint actions, focus, and elevation.

The colour, surface and border aliases map exactly to existing production values. Two elevation aliases are not numerically identical:

- `--home-shadow-soft` used alpha `0.045`; `--ui-shadow-soft` uses `0.055`;
- `--home-shadow-raised` used alpha `0.085`; `--ui-shadow-raised` uses `0.09`.

Using the production elevation roles is therefore a deliberate, restrained visual normalization rather than an exact pixel-value preservation claim. Selectors, layout metrics, responsive breakpoints, reduced-motion rules, transitions, state classes, and interaction structure remain unchanged. Existing decorative and semantic hard-coded colours that are not part of the `--home-*` alias boundary are intentionally unchanged.

`today-activity-card.component.css` also drops the hard-coded fallback from the already-established `--ui-focus-outline` reference because the transformed signed-in application loads the production token contract.

## Regression boundary

`scripts/check-architecture-guardrails.mjs` recursively inspects Home HTML and CSS presentation files and rejects any `--home-*` declaration or use. This covers the current external-style Home presentation boundary, including descendant component styles and template style attributes, without prohibiting feature-local semantic colours that are not shared UI roles.

## Review corrections

Self-review corrected delivery-state problems without broadening runtime scope:

- the complete consumer boundary and production-token mappings were re-verified against live repository files;
- the small soft/raised shadow normalization is explicitly disclosed instead of being described as pixel-neutral;
- `docs/frontend/design-tokens.md` and `docs/frontend/angular-migration.md` are updated with the architecture/migration result;
- volatile branch, draft, and CI state is kept in issue #133 and PR #332 rather than committed into `transformation/STATUS.md`, whose own contract is to record integrated outcomes;
- concurrent `main` changes were collision-checked before refresh; the RB-029 authority correction and local-development orchestration fix are file-disjoint from this Home slice.

## Explicit exclusions

This slice does not implement functional onboarding, alter Home data loading or recommendation logic, change navigation, create new design tokens, redefine global tokens, touch `.library-*` compatibility, or change backend/contracts/schema/persistence.

## Validation

GitHub Actions is the validation authority because the execution runner cannot resolve `github.com` for a local checkout. PR #332 has passed full repository CI on reviewed predecessor heads, including lint, production build, architecture guardrails, migrations/audits, and the complete test step. Any refreshed head must also have green exact-head checks before merge.

No authenticated browser, screen-reader, zoom, or viewport pass is claimed by this source-level compatibility slice. In particular, the small elevation normalization remains source-reviewed but not visually observed in an authenticated browser.

## Residual VT-302 scope

Issue #133 remains open after this slice. Functional onboarding coordination, broader empty/loading/partial/error/recovery consistency, direct keyboard/screen-reader/zoom/responsive evidence, remaining Library compatibility disposition, and final program reconciliation are separate residual VT-302 work.
