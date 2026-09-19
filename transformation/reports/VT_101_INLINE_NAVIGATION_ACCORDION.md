# VT-101 Inline Navigation Accordion

Date: 2026-07-28  
Issue: #123  
Pull request: #137 — squash-merged  
Squash commit: `033d05ededc03e114a4b02655de91a6313c4d902`  
Implementation branch: `visual-transformation/vt-101-inline-navigation-accordion`

## Objective

Replace expanded desktop-rail child flyouts with inline disclosure regions so lower navigation destinations move down in normal rail flow. Preserve the anchored popup-menu flyout when the rail is collapsed.

## Implementation boundary

Changed only the existing navigation component presentation and focused tests:

- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.html`;
- `apps/web/src/app/core/layout/main-navigation/main-navigation-disclosure.css`;
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.spec.ts`.

The existing `MainNavigationComponent.mainNavItems` model, routes, active prefixes, single-open `openNavId` state, Escape handling, route cleanup, mobile sheet, account placement, and session-only collapse state remain unchanged.

## Expanded rail

- Child links stay inside the parent rail node and use normal link/disclosure semantics rather than popup-menu roles.
- The disclosure button exposes `aria-expanded` and `aria-controls` without `aria-haspopup`.
- Only one parent can be open because the existing `openNavId` signal remains the single source of transient child-navigation state.
- A CSS grid-row transition expands and collapses the child region with restrained opacity and four-pixel vertical motion.
- Closed regions use hidden visibility and disabled pointer interaction so their links are not interactive while collapsed.
- The expanded rail can scroll vertically when content exceeds the available desktop height.

## Collapsed rail

- Child destinations retain the existing anchored `.rail-flyout` presentation.
- The disclosure uses `aria-haspopup="menu"` only in this mode.
- Child anchors retain `role="menuitem"` inside the popup menu.
- The existing transparent backdrop remains available only while a collapsed-rail flyout is open.

## Accessibility and motion

- Existing visible focus behavior is preserved and extended to inline child links.
- Escape and route navigation close transient child-navigation state.
- `prefers-reduced-motion: reduce` removes disclosure and accordion transitions and vertical movement.
- Expanded-mode child links remain ordinary navigation links grouped under the controlling disclosure.

## Focused test coverage

The navigation component specification covers:

- parent-route preservation and expanded disclosure semantics;
- inline child rendering;
- single-open parent behavior;
- collapsed popup-menu behavior and backdrop;
- Escape cleanup;
- route cleanup and active-state updates;
- unchanged mobile-sheet route cleanup.

## Validation

Runtime/test head CI run #1112 passed:

- dependency installation;
- lint;
- the full repository build;
- architecture guardrails;
- database migrations;
- the complete test suite.

Final documentation-head CI run #1118 passed the same complete workflow before merge.

Local npm and browser validation could not be run because the execution container could not resolve `github.com` and therefore could not clone the repository. GitHub connector inspection and writes succeeded.

Direct browser validation remains explicitly assigned to issue #126 after issue #124 is integrated. Its navigation matrix includes:

- expanded and collapsed desktop states;
- Study, Openings, Tools, and Settings;
- one-open-at-a-time movement and restoration;
- representative short desktop heights and rail scrolling;
- long labels and account content;
- keyboard focus order and Escape;
- normal and reduced motion;
- collapsed flyout placement.

No direct browser-completion claim is made from CI or static inspection alone.

## Integration disposition

The user explicitly approved VT-101. PR #137 was squash-merged into `visual_transformation` on 2026-07-28 as `033d05ededc03e114a4b02655de91a6313c4d902`.

Issue #123 is complete after post-merge documentation and queue reconciliation. Issue #124 is the next deterministic `READY` task. Issue #126 remains blocked only by #124; its VT-101 dependency is satisfied.

## Explicit exclusions preserved

No route model, mobile-navigation design, rail width, collapse persistence, dependency, global motion abstraction, page workflow, API, schema, database, or backend behavior changed.
