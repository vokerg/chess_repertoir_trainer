# Phase 1C Browser Review Feedback

Date: 2026-07-27

Branch: `visual-transformation/phase-1c-navigation-rail`

Target: `visual_transformation`

Pull request: #112

## Review result

The production navigation rail received a strongly positive direct browser review. The expanded and collapsed shell direction, primary item behavior, visual identity, and overall composition were accepted.

Two follow-up observations were recorded:

1. child destinations need a stronger and more conventional disclosure affordance;
2. the public unauthenticated landing page would benefit from restrained scroll-reveal motion.

These observations have different ownership and are intentionally handled separately.

## Correction included in PR #112

The child-destination control remains a split interaction:

- the main item area continues to navigate to its existing default route;
- the separate disclosure control opens the child submenu.

The browser review showed that the original small right-pointing glyph was too weak and could be mistaken for decoration. PR #112 therefore now uses:

- a larger rounded disclosure button;
- a conventional down chevron when closed and up chevron when open;
- stronger hover, active-parent, and open-state contrast;
- a larger target in both expanded and collapsed rail states;
- explicit `Show <group> submenu` and `Hide <group> submenu` accessible labels;
- matching native title text for pointer discovery;
- focused tests for the icon, label, title, and expanded state.

The route model, parent links, child links, collapse behavior, flyout behavior, and mobile navigation remain unchanged.

## Separate public-page motion slice

The unauthenticated landing page is currently static after initial render. It has no existing scroll-reveal directive or `IntersectionObserver` implementation to reuse.

Scroll-reveal motion is not added to PR #112 because that pull request is the signed-in shell/navigation slice. Mixing public-page animation into it would weaken reviewability and violate the documented scope boundary.

The next focused public-page slice should add restrained reveal behavior to selected landing-page sections only:

- workflow introduction and steps;
- capability copy and product demonstrations;
- progress composition;
- final call to action.

Recommended implementation contract:

- feature-local Angular directive or equally small landing-specific implementation;
- native `IntersectionObserver`, with content visible by default when unsupported;
- opacity plus a small vertical translation only;
- short duration and restrained stagger;
- animate each element once;
- no dependency addition;
- no animation requirement for the hero or critical first-screen content;
- full `prefers-reduced-motion: reduce` support;
- no layout shift and no delayed semantic availability.

This public-page motion slice should start from `visual_transformation` after PR #112 is reviewed and squash-merged, unless it is deliberately delivered as a separately reviewed stacked branch.

## Validation required for the menu correction

- final-head lint;
- full build and Angular template/type compilation;
- architecture guardrails;
- complete test suite;
- direct review of expanded and collapsed disclosure targets;
- keyboard focus, Enter/Space activation, Escape closure, and title/tooltip behavior.

## Stop condition

Do not merge PR #112 without explicit approval.

Do not add public landing-page motion to PR #112.
