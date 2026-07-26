# RB-008 visual candidate-choice prototype

This static prototype compares two materially different interaction directions for one repertoire-builder decision.

## Review order

1. Open `index.html`.
2. Review Direction A at desktop width, then below 760px.
3. Review Direction B at desktop width, then below 760px.
4. Compare the same scenario rather than the illustrative values.

## Direction A — board-first decision desk

- one large shared board;
- candidate buttons update the board and evidence;
- decision detail and opponent coverage form the side stack;
- closest to the current analysis-workbench composition;
- keyboard arrows switch candidate buttons.

## Direction B — candidate landscape

- all candidate positions are visible simultaneously;
- move, structure, evidence and burden stay in one card;
- opponent responses use a coverage matrix;
- mobile uses horizontal scroll snapping and a sticky decision summary.

## Scenario

Illustrative Najdorf decision after `5...a6`:

- `6.Be3` — target-aligned structured main line;
- `6.Bg5` — player-profile-aligned sharp choice;
- `6.g4?!` — practical but objectively costly alternative.

The selected repertoire persona is Solid while the mock player profile favours sharp play. This tests the locked rule that profile guidance is advisory and does not override explicit target intent.

## Evidence vocabulary

All values are static mocks. They demonstrate likely data responsibilities without defining an API:

- engine evaluation and warning;
- selected peer-population frequency;
- master frequency;
- sparse personal evidence;
- theory/branch burden;
- target fit versus profile fit;
- stable reason inputs;
- opponent-response frequency;
- selected, pending, deferred and ignored branch states;
- cumulative first-pass coverage.

## Accessibility and responsive behavior

- semantic buttons, landmarks, labels and skip links;
- visible focus treatment;
- arrow-key candidate switching in Direction A;
- no information conveyed by color alone;
- boards remain the primary evidence;
- Direction A stacks to one column;
- Direction B uses scroll-snapped candidate cards on narrow screens;
- opponent coverage remains text-readable when horizontally scrollable.

## Local visual validation

Rendered and inspected with Chromium/Playwright at:

- 1440 × 1100 desktop;
- 390 × 844 mobile.

The generated screenshots were used for review but are not committed as product assets. The HTML pages remain the canonical interactive artifacts.

## Non-goals

- production Angular implementation;
- endpoint or shared-contract definition;
- real ranking or engine calculation;
- course writes or builder-session persistence;
- final visual-system tokens.
