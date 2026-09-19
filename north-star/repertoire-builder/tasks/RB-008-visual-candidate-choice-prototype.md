# RB-008 — Prototype visual candidate and coverage choices

Status: DONE

Priority: P1

Order: 40

Delivery class: North-star

Planning maturity: Accepted

Claimed by: ChatGPT session

Claim branch: `rb-008/issue-96-visual-candidate-prototype`

Claimed at: 2026-07-26

Claim scope: static discovery and visual proof only — responsive HTML/CSS/JavaScript artifacts with realistic mock candidate and opponent-coverage evidence, plus decision and contract-implication documentation. No production Angular, API, schema, database, ranking, or course-write changes.

Review PR: #110

## Outcome

Produce and review a visual interaction direction for:

- capturing repertoire setup intent;
- comparing user-move candidates and resulting positions;
- understanding evidence and tradeoffs;
- selecting opponent responses to cover;
- seeing branch progress and deferred work;
- distinguishing factual evidence, profile recommendations, and selected repertoire intent.

## Accepted direction

User review on 2026-07-27 accepted this flow:

1. A focused setup dialog captures side, starting point, speed preset, rating target, repertoire persona, and coverage target.
2. Clicking **Start building** closes the dialog and opens a routed board-first workbench.
3. The routed workbench uses Direction A: one readable primary board, a candidate switcher, focused evidence, opponent-response coverage queue, and branch progress.
4. Direction B's simultaneous candidate landscape is rejected as the default because it is too heavy and reduces board readability, especially on mobile.
5. Candidate-attached target/profile roles are retained. An explicit mini-board comparison mode may be considered later but is not required for the first production workbench.

The recursive builder must not remain inside a modal.

## Delivered artifacts

Directory: `prototypes/rb-008-visual-candidate-choice/`

- `index.html` — accepted flow overview;
- `setup-dialog.html` — focused modal setup proof;
- `direction-a.html` — accepted routed board-first workbench proof;
- `direction-b.html` — retained rejected-default comparison evidence;
- `prototype.js` — candidate and coverage interactions;
- `styles.css` — responsive visual treatment;
- `README.md` — accepted-flow review guide.

Report: `reports/RB-008-2026-07-26-visual-candidate-prototype-review.md`.

## Why this task existed

The user required candidate choice to be visual rather than a list of SAN lines. The repository already contains boards, workbenches, dialogs, trees, and finding cards, but the correct composition and modal boundary needed realistic proof before production builder architecture was locked.

## Repository anchors inspected

- shared analysis workbench and chessboard composition;
- opening-analysis page and widgets;
- line editor workbench and tree navigation;
- analysis reintegration dialog;
- course review finding cards and board images;
- responsive/mobile CSS patterns;
- current visual-transformation decisions and static prototype conventions;
- RB-001/RB-002 population and factual player-level vocabulary;
- planned RB-006/RB-007 target and evidence responsibilities.

## Dependencies

No runtime dependency beyond the North Star foundation.

The artifacts use explicitly documented mock responsibilities based on RB-006/RB-007 concepts and do not define final contracts.

Production implementation remains owned by later target, candidate, session, and builder tasks.

## Acceptance assessment

- Two materially different decision compositions were reviewable with realistic data: met.
- Every candidate was visually connected to a position: met.
- Reasons and tradeoffs were visible: met.
- Profile recommendation and explicit persona choice were visibly separate: met.
- Opponent coverage, cumulative relevance, and deferral were represented: met.
- Desktop and mobile behavior were demonstrated: met.
- Required data, component responsibilities, and risks were documented without locking endpoints: met.
- User review outcome was recorded: met on 2026-07-27.
- Setup-dialog versus routed-workbench responsibility was resolved: met.

## Validation

Performed:

- local Chromium/Playwright rendering at 1440 × 1100 and 390 × 844 for the original alternatives;
- candidate board/evidence switching;
- arrow-key candidate navigation;
- cover/defer/ignore state and cumulative-coverage updates;
- relative asset-link validation;
- focus, status-text, and color-independence review;
- repository CI through PR #110.

Skipped because this is not production implementation:

- authenticated application-shell integration;
- assistive-technology screen-reader testing;
- physical touch-device testing;
- real data/API integration;
- production Angular component tests.

## Downstream implications

- RB-006 should define the setup values and the source/override state of defaults.
- RB-007 should provide candidate and response evidence without collapsing factual, profile, and target-fit inputs.
- RB-009 should define routed session, queue, draft, and resume semantics.
- RB-010 should implement the setup dialog plus routed Direction-A workbench.
- No separate production UI task is required before those existing tasks.

## Queue recommendation

Keep existing order and priorities. RB-003 remains the unresolved P0 foundation. RB-008 is complete. RB-014 remains an independent ready research stream.

## Completion

Report: `reports/RB-008-2026-07-26-visual-candidate-prototype-review.md`

Completed at: 2026-07-27
