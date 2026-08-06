# VT-302 — Accessibility and responsive foundation slice

Date: 2026-08-06

Issue: [#133](https://github.com/vokerg/chess_repertoir_trainer/issues/133)

Branch: `visual-transformation/vt-302-onboarding-accessibility-polish`

## Self-review disposition

This branch is a partial accessibility and responsive foundation slice. It does not complete VT-302 and must not close issue #133.

The original pull-request wording overclaimed completion. A thorough self-review confirmed that the current application has no protected `/onboarding` route and that ONB-010 / issue #195 remains `PROPOSED` behind ONB-008 and ONB-009. The first-run, re-entry, partial-state, failure-state, and recovery flows required by VT-302 therefore do not yet exist for final visual and accessibility acceptance.

VT-301 is complete through PR #286. ACT-004 remains isolated in PR #296. This branch does not modify ACT-004 Home feature work or invent server-owned onboarding behavior.

## Repository audit

The existing route inventory classifies every currently guarded route family. The shared production design system already provides graphite/mint tokens, form-control focus treatment, bounded page shells, and limited reduced-motion handling.

The review found:

1. visible keyboard focus was not guaranteed for links and custom focusable controls;
2. the shared focus outline reused a translucent halo color whose computed contrast was insufficient as a standalone indicator;
3. the same low-contrast outline pattern had spread through the complete production web consumer set;
4. reduced-motion handling disabled transitions on only a few named classes;
5. desktop page-shell and Home gutters remained unnecessarily large at compact widths;
6. the evaluation graph removed focus outlines from keyboard-selectable SVG points without a replacement;
7. the Games table implemented Analyse actions as anchors with `role="button"`, which did not provide native Space-key button behavior;
8. the original pull request and report claimed complete VT-302 delivery despite missing functional onboarding and final browser evidence.

## Implemented foundation changes

The branch now:

- adds an opaque `--ui-focus-outline` role while retaining the translucent `--ui-focus-ring` halo role;
- applies the shared outline to links, ARIA controls, and explicit `tabindex="0"` controls inside the signed-in shell;
- excludes Clerk user-button descendants from the shared selector;
- replaces 59 standalone low-contrast outline declarations across 54 production CSS files with the opaque outline role;
- disables effective feature animation, transition, and smooth scrolling under `prefers-reduced-motion: reduce`;
- reduces shared page-shell and Home gutters at widths up to 640px;
- restores a visible non-scaling focus stroke for keyboard-selectable evaluation-graph points;
- replaces Analyse pseudo-buttons with native `<button type="button">` controls in desktop and mobile Games representations;
- adds focused component coverage for the native Analyse controls;
- adds `scripts/check-web-accessibility-contract.mjs` to the normal architecture gate.

The accessibility contract guard now fails when:

- production CSS uses the translucent halo token or the former rgba value as a standalone outline;
- an Angular template uses an anchor with `role="button"`;
- the design system loses its opaque focus-outline role;
- focus-outline contrast falls below 3:1 against the principal white, canvas, or graphite surfaces;
- the keyboard-selectable evaluation graph loses its visible focus stroke.

No API, backend, schema, dependency, authentication, provider, analysis, course, or training business logic is changed.

## Validation

- CI run 2122 passed on the original two-file draft head; that result is historical only.
- CI run 2128 passed dependency installation, lint, the full monorepo build, audits, architecture guardrails, the complete migration chain, the full test suite, artifact upload, and cleanup on corrected head `3106d607c7f88e30ca8967afb4bf580ea5001854`.
- the repository-wide focus replacement workflow reported 59 corrected declarations across 54 files and removed its temporary workflow file before committing;
- the final accessibility guard and record changes require their own exact-head CI result.

The repository CI remains authoritative for Angular template/type compilation, web build and tests, lint, architecture checks, migrations, and audits.

Direct authenticated browser, keyboard, screen-reader, zoom, contrast-tool, reduced-motion, and representative-device observation is unavailable in this execution environment and is not claimed as passed.

## Remaining VT-302 scope and blockers

- ONB-008, ONB-009, and ONB-010 must deliver the server-owned readiness/lifecycle contract and functional onboarding/Home re-entry before final onboarding polish can be accepted.
- Empty, loading, partial-data, error, and recovery states still require a complete cross-route inventory and focused corrections rather than a shared-CSS-only claim.
- Keyboard and screen-reader review remains incomplete across all primary workflows.
- Contrast-tool, 200%/400% zoom, desktop, tablet, compact, and narrow-phone browser evidence remains unobserved.
- `transformation/STATUS.md`, decisions, migration records, and final program-completion assessment must be reconciled only after the complete issue scope is delivered and approved.

## Completion assessment

All concrete accessibility defects identified in this branch's static review have been corrected and regression-guarded. The branch remains a draft foundation slice because the functional onboarding dependency, cross-route state review, manual assistive-technology/browser evidence, and final program reconciliation are outside the presently available implementation boundary.

PR #297 must reference issue #133 without closing it. It may be considered independently for integration only after exact-head CI and explicit approval; it must not be represented as completion of VT-302.
