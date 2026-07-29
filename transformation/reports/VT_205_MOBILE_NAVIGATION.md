# VT-205 Final Mobile-Primary Navigation

Date: 2026-07-29

Issue: #131

Branch: `visual-transformation/vt-205-mobile-navigation`

Target: `main`

Pull request: draft PR #191

Disposition: implementation and implementation-head automated validation complete; exact documentation-head validation and direct browser review pending

## Objective

Decide and implement the final authenticated mobile-primary navigation after Games, Study, Opening Analysis, and VT-204 supplied representative workflow and shared-boundary evidence.

The change must improve frequent route access without obscuring board, training, filter, pagination, job-panel, or account workflows and without introducing another route source.

## Evidence

### Product entry and route frequency

- `/home` is the signed-in default and product-wide next-action entry.
- Home orders its workspace shortcuts as Study, Games, Openings, Courses, Analysis, and Progress.
- Study, Games, and Opening Analysis are the three completed representative workflows.

### Representative mobile workflows

Games proves:

- dense filters and result navigation;
- responsive evidence cards and row/card actions;
- pagination;
- fixed imported-game job status that must remain visible.

Study proves:

- course-first mobile entry;
- a feature-owned full-screen training launcher;
- dense selection and training controls that must remain workflow-owned.

Opening Analysis proves:

- board-heavy composition;
- filters and analytical toggles;
- optional evidence panels and workbench stacking.

VT-204 proves that shared extraction must remain narrow. Mobile navigation must not absorb feature launchers, board behavior, filters, workflow state, or commands.

## Decision

Use a persistent five-slot mobile-primary navigation below the shared 760px breakpoint:

1. Home;
2. Study;
3. Games;
4. Openings;
5. More.

The first four routes are filtered by stable id from `MainNavigationComponent.mainNavItems`. They are not a second route list.

`More` opens the complete existing hierarchy, preserving access to:

- Courses;
- Builder;
- Progress and Chess profile;
- Analysis and Lab;
- Settings and all settings children;
- account identity and Clerk account actions;
- every Study and Openings child destination.

D-314 locks this contract and supersedes the interim D-313 model. D-304 is resolved.

## Implementation

### Navigation component

`MainNavigationComponent` remains the app-specific owner of:

- the single hierarchical route model;
- desktop expanded and collapsed rail rendering;
- mobile-primary destination derivation;
- complete mobile destination rendering;
- active-prefix matching;
- transient navigation state.

No routes, active prefixes, child definitions, descriptions, quiet state, or account ownership moved.

### Native destination dialog

The complete mobile navigation uses native `HTMLDialogElement.showModal()` behavior, following the repository's existing confirmation-dialog approach.

Behavior:

- opening More shows a modal dialog;
- the browser provides modal focus containment;
- Escape uses the dialog cancel event;
- close-button or Escape closure restores focus to More;
- navigation closes the dialog without restoring focus to a control on the previous route;
- the complete destination hierarchy remains in the DOM but closed dialogs are not displayed.

### Active state

- Home, Study, Games, and Openings use the established `activePrefixes` rules.
- Child routes such as line training, game review, and Opening struggles keep their parent activity.
- Courses, Builder, Progress, Tools, Settings, and other active secondary destinations mark More active.
- An unknown path does not make More active merely because it exists.

### Responsive and overlay clearance

The mobile-primary bar:

- uses the shared 760px breakpoint;
- uses five equal columns;
- keeps implemented targets at least 54px high;
- respects `env(safe-area-inset-bottom)`;
- uses production `--ui-*` roles;
- removes non-essential transitions for reduced-motion users;
- provides visible keyboard focus.

The authenticated app shell defines `--app-mobile-primary-nav-clearance` and reserves it below page content.

The fixed imported-game job panel is offset above the navigation on mobile. When jobs are visible, content reserves both the job panel and navigation clearances.

Feature-owned mobile launchers and bottom sheets are unchanged and remain separate review surfaces.

## Preserved boundaries

Unchanged:

- `app.routes.ts` route taxonomy and lazy loading;
- desktop rail geometry, collapse behavior, disclosures, flyouts, and account placement;
- authentication/public standalone experiences;
- Home, Games, Study, Opening Analysis, Courses, Builder, Progress, Tools, Settings, and Lab feature ownership;
- feature stores, typed APIs, commands, selection, filters, pagination, board/engine behavior, training eligibility, and navigation commands;
- imported-game job-store lifecycle and job-panel content;
- backend, API contracts, schemas, database, migrations, and dependencies.

## Focused tests

Updated `main-navigation.component.spec.ts` covers:

- complete top-level desktop destinations still come from the shared model;
- mobile primary order and route links are Home, Study, Games, Openings, More;
- More references the complete destination dialog;
- the dialog exposes the complete hierarchy, including Settings;
- route navigation closes the dialog;
- secondary routes delegate activity to More;
- primary route activity returns to its persistent item;
- existing desktop rail collapse, disclosure, flyout, Escape, route-cleanup, and child activity behavior remains covered.

## Automated validation

Implementation-head CI #1461 passed the complete repository workflow on commit `752cb8c137f58ea0baadff214e5ef1e5d682e90b`:

- dependency installation;
- lint;
- full repository build and Angular template/type compilation;
- opening classification audit;
- architecture guardrails;
- database migrations;
- imported-game opening classification audit;
- complete repository test suite, including the updated navigation tests.

The exact documentation head must pass the same workflow before review readiness is represented.

## Direct browser review required

Browser review cannot be represented as completed in this implementation session. Review PR #191 at representative mobile sizes, including approximately 760px, 640px, 390px, 360px, and a narrow safe-area device.

### Shell and primary navigation

- Home, Study, Games, Openings, and More order and labels;
- active state on direct and child routes;
- long/localized label pressure and ellipsis;
- touch targets, focus ring, hover/pressed state where applicable;
- safe-area bottom spacing;
- no overlap with page actions or final content;
- no desktop rail regression above 760px.

### More dialog and account access

- opening from More and initial close-button focus;
- Escape, close control, and route-link closure;
- focus return after user-initiated closure;
- complete route and account access;
- long descriptions and one-column layout at 420px and below;
- dialog scrolling at short viewport heights;
- Clerk user-button interaction where available.

### Representative routes

Home:

- Continue/recommendations/workspace shortcuts remain unobstructed.

Games:

- filters, responsive cards, pagination, action menus, and game-review navigation;
- active imported-game job panel sits above the primary navigation;
- expanded and collapsed job-panel states remain usable.

Study:

- course-first entry and full-screen launcher;
- selection, training modes, close/Escape/focus behavior;
- primary navigation does not intercept launcher actions.

Opening Analysis:

- board width and move interaction;
- filters, toggles, engine, and stacked evidence;
- primary navigation does not cover board/workbench controls.

Progress, Courses, Builder, Tools, Settings:

- More active state and complete navigation return path.

### Accessibility and motion

- keyboard navigation through persistent destinations and dialog;
- screen-reader labels/current state;
- native modal semantics;
- zoom and text scaling;
- reduced-motion behavior.

The earlier deferred Study, Opening Analysis, and VT-204 browser checklists remain separate consolidated product-review evidence. VT-205 does not retroactively represent them as observed validation.

## Review gate

PR #191 remains draft. Do not merge before:

- exact documentation-head CI passes;
- direct browser feedback is recorded or explicitly deferred by user approval;
- explicit approval to squash-merge into `main` is received.
