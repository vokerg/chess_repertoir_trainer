# VT-302 — Line-training / Library presentation compatibility cleanup

Date: 2026-08-09

Issue: #133

Branch: `visual-transformation/vt-302-training-library-compatibility`

Base at claim: `0571b387c601907ada1e901833d36560dbdf135b`

## Purpose

Close one explicitly documented VT-302 compatibility boundary without reopening route-family rollout: the Lines training presentation depended on the Study/library-owned global `.library-button-link` class for ordinary secondary router links.

The change is intentionally presentation-only. Training stores, session state, API calls, route ownership, board behavior, review logic and navigation targets remain unchanged.

## Consumer-boundary evidence

Current-main inspection before implementation established the complete non-Library consumer boundary:

- repository search for `library-button-link` returned the global definition in `apps/web/src/styles.css` plus two Lines templates;
- `line-training-session.component.html` contained two link instances using `library-button-link secondary`;
- `training-marathon-page.component.html` contained one fallback Back link using the same class;
- no other non-Library feature consumer was found;
- the Lines feature already used `<a class="compact-action secondary">` for the equivalent Edit-tree router action in `line-training-status-panel.component.html`;
- `apps/web/src/design-system.css` already maps `compact-action` and its secondary variant onto production `--ui-*` roles.

This evidence supports removing the cross-feature dependency without creating another shared abstraction.

## Delivered change

- replace all three Lines training link instances that used `library-button-link secondary` with the existing generic `compact-action secondary` presentation contract;
- keep every router link target, label, conditional branch and training command unchanged;
- add an architecture guard across all Lines `.html` and `.css` files that rejects `library-*` presentation classes, preventing the cross-feature dependency from returning through a different Lines component;
- update the Angular migration ledger and design-token compatibility record so `.library-*` is now described as a bounded Study/library compatibility layer rather than shared training presentation.

## Explicit exclusions

This slice does not:

- modify or delete the global `.library-*` block in `apps/web/src/styles.css`;
- redesign Study/library;
- change training state, stores, APIs, routes, session reducers, board behavior, persistence or backend code;
- add a new shared component or new visual token;
- change ONB-010 functional onboarding;
- complete VT-302 or close issue #133.

The remaining Library-owned global presentation can be relocated or reduced only after its own complete consumer boundary is inspected.

## Parallel-work coordination

The active `visual-transformation/vt-302-course-review-status-semantics` continuation owns Course Review and shared-state semantics. This slice is runtime-file-disjoint from it. `transformation/STATUS.md` is the only anticipated documentation collision and must be refreshed from current `main` before final review if the parallel slice integrates first.

PR #314 is Repertoire Builder completion documentation and does not overlap the runtime or transformation files in this slice.

## Validation

Planned validation for the final exact head:

- architecture guard, including the new Lines/Library presentation boundary;
- web lint/template compilation;
- web production build;
- web test suite;
- normal repository CI gates attached to the pull request.

Direct authenticated browser or assistive-technology validation is not claimed unless it is actually observed. The class substitution reuses an already-integrated Lines action pattern, but source-level equivalence is not represented as a browser pass.

## Residual risk and queue impact

- Study/library still owns global `.library-*` compatibility presentation in `styles.css`; this slice deliberately does not prove that the complete Library feature can move that CSS locally.
- VT-302 still owns broader recovery/state adoption, functional-onboarding coordination, direct accessibility/responsive evidence, Home alias disposition and final program reconciliation.
- No new product feature or separate task is implied by this compatibility cleanup.
