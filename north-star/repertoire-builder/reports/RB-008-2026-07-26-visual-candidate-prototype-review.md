# RB-008 visual candidate-choice prototype review report

Date: 2026-07-26

Accepted: 2026-07-27

Status: complete; accepted visual direction recorded

Task: RB-008

GitHub issue: #96

Branch: `rb-008/issue-96-visual-candidate-prototype`

Pull request: #110

## Purpose

Reduce product and architecture uncertainty around the core repertoire-builder interaction before production Angular, API, ranking, or persistence work begins.

The discovery tested how the user can:

- define target intent without being trapped in a long modal workflow;
- compare candidate moves through resulting positions rather than SAN text alone;
- understand engine, master, selected-population, personal, theory-burden, target-fit, and profile-fit evidence;
- see an explicit conflict between profile recommendation and chosen repertoire intent;
- select, defer, or ignore opponent responses;
- understand cumulative first-pass coverage and branch progress;
- use the interaction at desktop and narrow mobile widths.

## Delivered artifacts

Directory: `north-star/repertoire-builder/prototypes/rb-008-visual-candidate-choice/`

- `index.html` — accepted-flow overview;
- `setup-dialog.html` — focused setup modal;
- `direction-a.html` — routed board-first workbench;
- `direction-b.html` — retained candidate-landscape alternative;
- `prototype.js` — FEN rendering, candidate switching, and coverage-state interaction;
- `styles.css` — responsive visual treatment;
- `README.md` — accepted-flow guide and non-goals.

These are static review artifacts. They are not production code and define no endpoint.

## Repository evidence inspected

### Existing product composition

- `apps/web/src/app/shared/analysis/workbench/analysis-workbench.component.html`
- `apps/web/src/app/shared/analysis/workbench/analysis-workbench.component.css`
- `apps/web/src/app/features/analysis/components/free-analysis-workbench.component.html`
- `apps/web/src/app/features/lines/components/line-editor-workbench.component.html`
- `apps/web/src/app/features/opening-analysis/pages/opening-analysis-page.component.html`
- `apps/web/src/app/features/analysis/components/analysis-reintegration-dialog.component.ts`
- `apps/web/src/app/features/analysis/components/analysis-reintegration-dialog.component.html`
- `apps/web/src/app/features/analysis/components/analysis-reintegration-dialog.component.css`
- `apps/web/src/app/features/course-review/components/course-review-issue-card.component.ts`
- `apps/web/src/app/features/course-review/components/course-review-issue-card.component.html`
- `apps/web/src/app/features/course-review/components/course-review-issue-card.component.css`

### Visual-transformation evidence

- `transformation/STATUS.md` on `visual_transformation`;
- `transformation/DECISIONS.md` on `visual_transformation`;
- `transformation/prototypes/phase-0c-home/index.html`;
- `transformation/prototypes/phase-0c-home/styles.css`.

### North Star evidence

- current RB-001/RB-002 population and factual player-level decisions;
- RB-006 target concepts;
- RB-007 candidate and response-evidence concepts;
- RB-008 task and issue scope;
- GitHub claim and coordination protocol.

## Shared scenario

Both original decision alternatives used the same illustrative Najdorf position after `5...a6`:

- `6.Be3` — target-aligned structured main line;
- `6.Bg5` — player-profile-aligned sharp choice;
- `6.g4?!` — practical but objectively costly alternate.

Context:

- White repertoire;
- speed target: Blitz and slower;
- population target: My peers plus one;
- factual benchmark display: 1600–1999;
- selected repertoire persona: Solid;
- player profile suggestion: sharp play;
- sparse personal evidence but meaningful population/master evidence.

All numbers are explicitly illustrative.

## Alternatives reviewed

### Direction A — board-first decision desk

Composition:

- one large resulting-position board;
- compact candidate switcher beside the board;
- preview line below the board;
- evidence and target/profile conflict in a focused decision card;
- opponent-response coverage queue;
- branch-progress strip.

Strengths:

- preserves a readable board as the primary analytical object;
- closely matches the existing two-column analysis-workbench structure;
- supports deeper line preview and future board interaction;
- candidate buttons work with mouse and arrow keys;
- responsive stacking is straightforward;
- coverage controls remain readable on mobile;
- likely reuses more existing Angular primitives.

Weaknesses:

- only one resulting structure is visible at a time;
- comparison relies on fast switching and short-term visual memory;
- a large board plus full side stack creates a long mobile page.

### Direction B — candidate landscape

Composition:

- three simultaneous candidate cards with resulting-position mini-boards;
- evidence bars and target/profile badges within each card;
- response-coverage matrix;
- horizontal scroll snapping and sticky summary on mobile.

Strengths:

- makes structural comparison immediate;
- tightly binds move, board, evidence, theory cost, and recommendation role;
- clearly distinguishes target recommendation from profile alignment.

Weaknesses:

- mini-boards are materially smaller than the existing analytical board;
- desktop and mobile are visually heavy;
- mobile still shows one card at a time despite the simultaneous-comparison concept;
- sticky summary and coverage matrix add overlay and horizontal-scroll complexity;
- production implementation risks card overload and duplicated board rendering.

## User decision

The user accepted the following boundary on 2026-07-27:

1. **Setup belongs in a focused dialog.**
2. The dialog captures side, starting point, speed preset, rating target, persona, and coverage target.
3. Clicking **Start building** closes the modal and opens a routed workbench.
4. The routed workbench uses Direction A as the production hypothesis.
5. Direction B is rejected as the default because it is too heavy.
6. Candidate-attached target/profile roles are retained.
7. A deliberate mini-board comparison mode may be reconsidered later, but is not required for the first builder MVP.

The recursive builder must not remain inside a modal.

## Accepted visual responsibility split

### Setup dialog

Owns:

- side and starting point;
- account/player evidence source where required;
- speed preset and rating target;
- repertoire persona/objective;
- coverage and theory tolerance;
- whether profile suggestions initialize defaults;
- visibility of factual peer evidence versus selected target.

Does not own:

- recursive candidate decisions;
- opponent-response coverage state;
- branch queue or progress;
- draft navigation;
- resume behavior;
- course preview or writes.

### Routed board-first workbench

Owns:

- one readable primary board and current line;
- candidate switcher and resulting-position preview;
- objective, population, master, personal, theory, target-fit, and profile-fit evidence;
- explicit target/profile disagreement;
- opponent-response coverage queue;
- selected, pending, deferred, ignored, and completed states;
- cumulative coverage where later contracts define stable semantics;
- branch progress, navigation, draft state, and eventual resume behavior;
- preview before course changes are written.

## Reusable versus builder-specific primitives

Likely reusable:

- analysis board and board navigation;
- static board-image/mini-board presentation;
- modal overlay and responsive dialog shell;
- panel and responsive workbench shells;
- compact target/population context chips;
- metric/evidence summary rows;
- warning and provenance presentation;
- visible focus and semantic button patterns.

Builder-specific:

- target setup and override state;
- candidate role and target/profile tension;
- candidate selection state;
- opponent-response coverage state;
- cumulative coverage calculation;
- branch-progress/queue representation;
- explicit defer/ignore semantics;
- theory or branch-burden display;
- draft continuation and resume actions.

## Contract implications

These are data responsibilities, not final endpoint designs.

### RB-006 repertoire target

The setup dialog needs:

- selected side and starting position;
- speed preset and rating target;
- persona/objective label;
- coverage and theory tolerance;
- source of each default;
- explicit override state;
- factual peer evidence shown separately from target choice;
- profile disagreement that does not invalidate the target.

### RB-007 candidate evidence and ranking

Each candidate needs:

- move identity and resulting FEN;
- bounded preview line;
- objective evaluation/warning;
- selected-population frequency and sample metadata;
- master frequency and sample metadata;
- personal frequency/result evidence or explicit absence;
- theory/branch burden estimate;
- target-fit and profile-fit as separate reason inputs;
- stable reason and warning codes;
- source availability/staleness.

Each opponent response needs:

- move identity and resulting-position reference;
- selected-population frequency;
- personal encounter count where available;
- relevance/reason inputs;
- coverage state;
- cumulative coverage contribution;
- transposition/conflict indicators.

### RB-009 builder session

Session state must distinguish:

- completed setup from active recursive work;
- user-move decision from opponent-response coverage;
- selected candidate from saved alternate;
- pending, selected, deferred, ignored, and completed responses;
- current branch and overall queue progress;
- target snapshot or reference used for the decision;
- state changes that require candidate recalculation.

### RB-010 builder MVP

Production UI should begin with:

- focused setup dialog;
- routed board-first workbench;
- candidate switcher/summary;
- evidence detail that expands without hiding the board;
- response coverage queue;
- explicit branch progress;
- no simultaneous three-board default;
- optional structural compare mode only if later evidence justifies it.

No additional production task is required before these existing tasks.

## Accessibility and responsive review

Implemented and inspected in the original alternatives:

- semantic landmarks and controls;
- skip links;
- visible focus outlines;
- arrow-key switching between Direction-A candidates;
- `aria-pressed` state for candidate and coverage controls;
- status text in addition to color;
- readable board sizes;
- one-column Direction-A mobile composition;
- scroll-snapped candidate cards in Direction B;
- text-readable horizontally scrollable coverage matrix;
- 320px minimum layout assumption.

The accepted setup proof adds an explicit modal landmark, labelled fields, and mobile stacking.

## Validation performed

Local Chromium/Playwright rendering and visual inspection of the original alternatives at:

- 1440 × 1100 desktop;
- 390 × 844 mobile.

Interaction checks:

- all three Direction-A candidates switch board position, line, metrics, reasons, and warning;
- arrow keys move between candidate buttons;
- cover/defer/ignore controls update explicit status and cumulative coverage;
- Direction B remains usable as retained comparison evidence;
- relative asset links resolve in the static directory;
- repository CI passes on PR #110.

## Validation skipped

- production Angular integration;
- real browser review inside the authenticated application shell;
- screen-reader testing with assistive technology;
- physical touch-device testing;
- real data or API integration.

## Limitations and residual risks

- Unicode chess pieces are prototype-only and do not represent the production board renderer.
- Evidence values and ranking are static mocks.
- Direction A may later need an explicit structural-comparison affordance.
- Theory burden does not yet have a production formula.
- Coverage percentage semantics need RB-007/RB-009 contract decisions.
- Target/profile copy must avoid presenting statistical profile evidence as authority.
- The visual-transformation branch must be reinspected when production work begins.

## Standalone and North Star impact

No standalone runtime behavior changes in this prototype.

North Star uncertainty is materially reduced:

- modal scope is limited to setup;
- recursive work is routed and resumable;
- one board-first composition is accepted;
- Direction B is rejected as the default;
- downstream contract responsibilities are explicit.

## GitHub and queue impact

- Issue #96 can close after PR #110 is accepted and squash-merged.
- Task state is `DONE`.
- No new RB task or issue is required.
- Queue order and priorities remain unchanged.
- RB-003 remains the unresolved P0 foundation.
- RB-014 remains an independent ready research stream.
