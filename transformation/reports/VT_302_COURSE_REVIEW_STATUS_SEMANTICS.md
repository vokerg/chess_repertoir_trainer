# VT-302 Course Review async-status accessibility semantics

Date: 2026-08-09  
Issue: #133  
Branch: `visual-transformation/vt-302-course-review-status-semantics`  
Review base: `main` `85688c392f937b67007d5404b9b088c99f259d69`

## Scope

This is a narrow VT-302 accessibility/state-consistency continuation for Course Review. It applies the integrated shared `app-state-message` presentation contract to the existing asynchronous Course Review error and long-running loading states without changing review behavior.

It does not complete VT-302 and does not implement functional onboarding.

## Implementation

Course Review now imports `StateMessageComponent` and uses it for:

- the store-owned review error via the shared `error` tone;
- Course Endings progress while indexed games are being checked via the shared `loading` tone;
- My Deviations / Opponent Gaps review progress via the shared `loading` tone.

The existing store conditions, filter behavior, active-mode switching, result rendering, conflict rendering, course-ending thresholds, API calls, and navigation remain unchanged.

The integrated shared component supplies the accessibility semantics: errors use an assertive alert and loading uses a polite status live region without a self-suppressing `aria-busy` state.

## Regression coverage

`check-web-accessibility-contract.mjs` now guards the Course Review boundary explicitly. It requires:

- the shared error state for the store error;
- the shared loading state for Course Endings progress;
- the shared loading state for ordinary review progress;
- no regression of those three asynchronous states back to local non-announcing `status-error` / `status-note` paragraphs.

Angular template compilation remains responsible for validating the standalone shared-component import. Existing focused `StateMessageComponent` tests continue to verify the underlying empty/loading/error role and live-region contract.

## Documentation reconciliation

`transformation/STATUS.md` records the current slice, the integrated PR #315 predecessor, validation limits, and the self-review correction. `docs/frontend/angular-migration.md` now records Course Review as a consumer of the proven shared loading/error semantics so the migration ledger does not remain stale after this adoption.

`docs/frontend/design-tokens.md` is intentionally unchanged: this slice reuses the existing state-message styling and production semantic roles and does not change the token contract, token ownership, or compatibility boundary.

## Explicit exclusions

This slice does not change:

- Course Review store, API, filter, result, conflict, or route behavior;
- Course Review empty-result ownership inside the existing issue-list component;
- backend routes, contracts, persistence, schemas, or migrations;
- ONB-010 onboarding behavior;
- other route-family state migrations;
- visual redesign, layout, spacing, typography, or motion;
- the shared `StateMessageComponent` contract itself.

## Validation boundary

The branch was refreshed onto current `main` `85688c392f937b67007d5404b9b088c99f259d69` after PR #315 integrated and the later disjoint landing-copy correction advanced `main`. No local checkout-based build/test result is claimed in this connector-driven session. GitHub Actions on the pull request is the executable validation source.

Direct authenticated browser or screen-reader review is not claimed unless separately observed and recorded.

## Residual VT-302 work

VT-302 remains open for broader state/recovery consistency, functional-onboarding-dependent visual polish, remaining accessibility/browser evidence, responsive/zoom/reduced-motion verification, compatibility disposition, and final program reconciliation.
