# RB-008 visual candidate-choice prototype

This static prototype records the accepted interaction boundary for the repertoire builder.

## Accepted flow

1. `setup-dialog.html` captures side, starting point, speed preset, rating target, persona, and coverage target.
2. **Start building** closes the modal and opens the routed board-first workbench in `direction-a.html`.
3. The routed workbench owns candidate choice, opponent-response coverage, branch progress, navigation, draft state, and eventual resume behavior.

The dialog is not the recursive builder.

## Accepted composition

### Setup dialog

- focused setup only;
- editable defaults from factual peer evidence and profile advice;
- factual level, profile recommendation, and selected repertoire intent remain distinct;
- launches the routed workbench.

### Routed board-first workbench

- one large shared board;
- candidate buttons update board and evidence;
- decision detail and opponent coverage form the side stack;
- branch progress remains visible;
- closest to the current analysis-workbench composition;
- keyboard arrows switch candidate buttons.

## Retained but rejected default

`direction-b.html` preserves the candidate-landscape exploration:

- all candidate positions shown simultaneously;
- move, structure, evidence, and burden in one card;
- opponent responses shown as a matrix.

It is rejected as the default because it is visually heavy, reduces board size, and becomes awkward on mobile. Candidate-attached target/profile roles remain useful. A deliberate mini-board comparison mode may be considered later, but is not required for the initial workbench.

## Scenario

Illustrative Najdorf decision after `5...a6`:

- `6.Be3` — target-aligned structured main line;
- `6.Bg5` — player-profile-aligned sharp choice;
- `6.g4?!` — practical but objectively costly alternative.

The selected repertoire persona is Solid while the mock player profile favours sharp play. This demonstrates that profile guidance is advisory and does not override explicit target intent.

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
- selected, pending, deferred, and ignored branch states;
- cumulative first-pass coverage.

## Accessibility and responsive behavior

- semantic dialog, buttons, landmarks, labels, and skip links;
- visible focus treatment;
- arrow-key candidate switching in the routed workbench;
- no information conveyed by color alone;
- board remains the primary evidence;
- setup dialog and workbench stack cleanly on narrow screens;
- opponent coverage remains text-readable.

## Validation

The original alternatives were rendered and inspected with Chromium/Playwright at 1440 × 1100 and 390 × 844. Repository CI validates the final documentation branch. The HTML pages remain the canonical review artifacts.

## Non-goals

- production Angular implementation;
- endpoint or shared-contract definition;
- real ranking or engine calculation;
- course writes or builder-session persistence;
- final visual-system tokens.
