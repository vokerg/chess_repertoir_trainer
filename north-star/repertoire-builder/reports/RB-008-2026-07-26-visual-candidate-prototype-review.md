# RB-008 visual candidate-choice prototype review report

Date: 2026-07-26

Status: review-ready; user visual decision pending

Task: RB-008

GitHub issue: #96

Branch: `rb-008/issue-96-visual-candidate-prototype`

Pull request: #110

## Purpose

Reduce product and architecture uncertainty around the core repertoire-builder decision before production Angular, API, ranking, or persistence work begins.

The prototype tests how the user can:

- compare candidate moves through resulting positions rather than SAN text alone;
- understand engine, master, selected-population, personal, theory-burden, target-fit and profile-fit evidence;
- see an explicit conflict between profile recommendation and chosen repertoire intent;
- select, defer or ignore opponent responses;
- understand cumulative first-pass coverage and current branch progress;
- use the interaction at desktop and narrow mobile widths.

## Delivered artifacts

Directory: `north-star/repertoire-builder/prototypes/rb-008-visual-candidate-choice/`

- `index.html` — comparison entry point;
- `direction-a.html` — board-first decision desk;
- `direction-b.html` — candidate landscape;
- `prototype.js` — FEN rendering, candidate switching and coverage-state interaction;
- `styles.css` — responsive visual treatment;
- `README.md` — review guide, scenario, accessibility and non-goals.

These are static review artifacts. They are not production code and define no endpoint.

## Repository evidence inspected

### Existing product composition

- `apps/web/src/app/shared/analysis/workbench/analysis-workbench.component.html`
- `apps/web/src/app/shared/analysis/workbench/analysis-workbench.component.css`
- `apps/web/src/app/features/analysis/components/free-analysis-workbench.component.html`
- `apps/web/src/app/features/lines/components/line-editor-workbench.component.html`
- `apps/web/src/app/features/opening-analysis/pages/opening-analysis-page.component.html`
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

Both alternatives use the same illustrative Najdorf position after `5...a6` and the same mock evidence:

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

Opponent responses demonstrate selected, deferred and ignored states plus cumulative coverage.

All numbers are explicitly illustrative.

## Alternative A — board-first decision desk

### Composition

- one large resulting-position board;
- compact candidate switcher beside the board;
- preview line below the board;
- evidence and target/profile conflict in a focused decision card;
- opponent-response coverage queue below it;
- horizontal branch-progress strip.

### Strengths

- preserves a readable board as the primary analytical object;
- closely matches the existing two-column analysis-workbench structure;
- supports deeper line preview and future board interaction without another navigation mode;
- candidate buttons work with mouse and arrow keys;
- responsive stacking is straightforward;
- coverage controls remain readable on mobile;
- likely reuses more existing Angular primitives.

### Weaknesses

- only one resulting structure is visible at a time;
- comparison relies on fast switching and short-term visual memory;
- evidence may feel secondary to the board;
- a large board plus full side stack creates a long mobile page.

## Alternative B — candidate landscape

### Composition

- three simultaneous candidate cards, each with a resulting-position mini-board;
- evidence bars and target/profile badges within each card;
- a response-coverage matrix below;
- horizontal scroll snapping and sticky summary on mobile.

### Strengths

- makes structural comparison immediate;
- tightly binds move, board, evidence, theory cost and recommendation role;
- clearly distinguishes target recommendation from profile alignment;
- gives objective warnings and sparse personal evidence equal visual footing;
- makes the candidate set feel finite and reviewable.

### Weaknesses

- mini-boards are materially smaller than the existing analytical board;
- desktop uses substantial vertical and horizontal space;
- mobile necessarily exposes one card at a time despite the simultaneous-comparison concept;
- sticky mobile summary overlays part of the visual workspace;
- the coverage matrix requires horizontal scrolling on narrow screens;
- production implementation risks card overload and duplicated board rendering.

## Provisional recommendation for user review

Use **Direction A as the default production workbench hypothesis**, while borrowing two ideas from Direction B:

1. provide a deliberate comparison mode or expandable candidate preview that can show two or three resulting mini-boards when structural comparison is needed;
2. keep the target-fit/profile-fit distinction attached to each candidate, not only in a global explanation.

Do not lock this recommendation until user review. Direction B remains a valid alternate if simultaneous structural comparison is judged more important than board size and workbench continuity.

## Reusable versus builder-specific primitives

### Likely reusable

- analysis board and board navigation;
- static board-image/mini-board presentation;
- panel and responsive workbench shells;
- compact target/population context chips;
- metric/evidence summary rows;
- warning and provenance presentation;
- visible focus and semantic button patterns.

### Builder-specific

- candidate role and target/profile tension;
- candidate selection state;
- opponent-response coverage state;
- cumulative coverage calculation;
- branch-progress/queue representation;
- explicit defer/ignore semantics;
- theory or branch-burden display;
- draft continuation action.

## Contract implications

These are data responsibilities, not final endpoint designs.

### RB-006 repertoire target

The visual layer needs:

- selected side and starting position;
- speed preset and rating target;
- persona/objective label;
- source of each default;
- explicit override state;
- factual peer evidence shown separately from target choice;
- target/profile disagreement that does not invalidate the target.

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

- move identity and resulting position reference;
- selected-population frequency;
- personal encounter count where available;
- relevance/reason inputs;
- coverage state: pending, selected, deferred, ignored or completed;
- cumulative coverage contribution;
- transposition/conflict indicators.

### RB-009 builder session

Session state must distinguish:

- user-move decision from opponent-response coverage;
- selected candidate from saved alternate;
- pending, selected, deferred, ignored and completed responses;
- current branch and overall queue progress;
- target snapshot or reference used for the decision;
- state changes that require candidate recalculation.

### RB-010 builder MVP

Production UI should begin with:

- one routed board-first workbench;
- candidate switcher/summary;
- evidence detail that can expand without hiding the board;
- response coverage queue;
- explicit branch progress;
- optional structural compare mode rather than three full boards by default.

No additional production task is proposed until user review determines whether compare mode belongs in the MVP or a later slice.

## Accessibility and responsive review

Implemented and inspected:

- semantic landmarks and controls;
- skip links;
- visible focus outlines;
- arrow-key switching between Direction A candidates;
- `aria-pressed` state for candidate and coverage controls;
- status text in addition to color;
- readable board sizes;
- one-column Direction A mobile composition;
- scroll-snapped candidate cards in Direction B;
- text-readable horizontally scrollable coverage matrix;
- 320px minimum layout assumption.

## Validation performed

Local Chromium/Playwright rendering and visual inspection at:

- 1440 × 1100 desktop;
- 390 × 844 mobile.

Interaction checks:

- all three Direction A candidates switch board position, line, metrics, reasons and warning;
- arrow keys move between candidate buttons;
- cover/defer/ignore controls update explicit status and cumulative coverage;
- Direction B candidate cards and coverage matrix remain usable at desktop and mobile widths;
- all relative asset links resolve in the local static directory.

Repository CI will run on PR #110 even though runtime code is unchanged.

## Validation skipped

- production Angular build-specific interaction testing beyond repository CI;
- real browser review inside the authenticated application shell;
- screen-reader testing with assistive technology;
- touch-device testing on physical hardware;
- real data or API integration;
- user acceptance of either visual direction.

## Limitations and residual risks

- Unicode chess pieces are prototype-only and do not represent the production board renderer.
- Evidence values and ranking are static mocks.
- Direction A may still require a stronger structural-comparison affordance.
- Direction B risks excessive board/card rendering and mobile overlay complexity.
- Theory burden does not yet have a production formula.
- Coverage percentage semantics need RB-007/RB-009 contract decisions.
- Target/profile copy must avoid presenting statistical profile evidence as authority.
- The visual-transformation branch may evolve before production implementation; approved tokens/components must be reinspected then.

## Standalone and North Star impact

No standalone product behavior changes in this prototype.

North Star uncertainty is reduced because the next contract tasks now have concrete evidence requirements and the builder has a plausible board-first default composition plus a tested comparison alternative.

## GitHub and queue impact

- Issue #96 remains open.
- Task state moves to `REVIEW`, not `DONE`.
- PR #110 is the review vehicle and must not use `Closes #96` before user acceptance.
- No new RB task or issue is proposed yet.
- Queue order and priorities should remain unchanged until review.
- RB-003 remains the unresolved P0 foundation; RB-014 remains an independent ready research stream.

## Review decision required

The user should choose one of:

- approve Direction A as the production default hypothesis;
- approve Direction B as the production default hypothesis;
- approve the proposed hybrid: Direction A default plus an explicit mini-board compare mode;
- request a revised third direction.

After that decision, update `DECISIONS.md`, complete or revise RB-008, synchronize issue #96 and determine whether a separate production UI task is needed.
