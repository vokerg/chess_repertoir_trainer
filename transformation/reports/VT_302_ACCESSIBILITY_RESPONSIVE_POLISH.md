# VT-302 — Accessibility and responsive polish

Date: 2026-08-06

Issue: [#133](https://github.com/vokerg/chess_repertoir_trainer/issues/133)

Branch: `visual-transformation/vt-302-onboarding-accessibility-polish`

## Selection and dependency state

VT-301 is complete through PR #286 and issue #133 is the sole dependency-satisfied Visual Transformation task. ACT-004 is active in PR #296 and is intentionally excluded from this branch. ONB-022 completion work and ONB-025 planning are separate non-colliding tracks.

## Repository audit

The existing route inventory already classifies every guarded route family, so this task does not reopen page-family rollout. The shared production design system already provides graphite/mint tokens, form-control focus treatment, button focus treatment, bounded page shells, and a small reduced-motion rule.

The audit identified two cross-route defects in that shared boundary:

1. visible keyboard focus was guaranteed for buttons but not for links or custom focusable controls;
2. reduced-motion handling disabled transitions on only a few named classes, leaving feature-owned animations and transitions active.

A narrow mobile shell adjustment was also required because the desktop `24px`/Home `48px` gutters remained active at compact widths.

## Implementation

`apps/web/src/design-system.css` now:

- applies the production focus ring to links, ARIA button/link controls, and non-negative `tabindex` controls inside the signed-in shell;
- preserves the Clerk exclusion used by the existing button rule;
- reduces compact page-shell and Home gutters at widths up to 640px;
- disables effective animation, transition, and smooth scrolling throughout the signed-in shell when `prefers-reduced-motion: reduce` is active.

The change is deliberately shared and token-based. It introduces no second visual identity, feature state, navigation behavior, API, dependency, or backend logic.

## Validation contract

The pull-request CI run is authoritative for:

- Angular template/type compilation;
- web build and tests;
- lint and architecture checks;
- complete repository migration and audit gates.

Direct authenticated browser, screen-reader, zoom, contrast-tool, and representative-device observation is not available in this execution environment and is not claimed as passed. The CSS fixes address verified static contract gaps; any browser-specific defect discovered during review remains a follow-up blocker rather than being silently accepted.

## Residual risks

- Feature-local `outline: none` rules remain acceptable only where a replacement `:focus-visible` style exists; browser review should verify the computed cascade on representative routes.
- The repository still contains accepted Home, workbench, and training compatibility roles. This branch does not migrate those complete consumer sets without evidence.
- Functional onboarding remains owned by ONB-008 through ONB-010. VT-302 does not invent onboarding state before those server-owned contracts exist.
- ACT-004 owns the new Home Today widget in PR #296; this branch does not edit overlapping Home feature files.

## Completion assessment

The repository-wide static accessibility and compact-shell defects found in the final shared-system audit are corrected. Program completion still requires review of the exact pull-request head and explicit approval; no merge is performed by this task.
