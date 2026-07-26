# RB-008 — Prototype visual candidate and coverage choices

Status: REVIEW

Priority: P1

Order: 40

Delivery class: North-star

Planning maturity: Review-ready

Claimed by: ChatGPT session

Claim branch: `rb-008/issue-96-visual-candidate-prototype`

Claimed at: 2026-07-26

Claim scope: static discovery and visual proof only — two materially different responsive HTML/CSS/JavaScript interaction directions with realistic mock candidate and opponent-coverage evidence, desktop/mobile review artifacts, and a decision/contract-implication report. No production Angular, API, schema, database, ranking, or course-write changes.

Review PR: #110

## Outcome

Produce a reviewed visual interaction direction for:

- comparing user-move candidates and resulting positions;
- understanding evidence and tradeoffs;
- selecting opponent responses to cover;
- seeing branch progress and deferred work;
- distinguishing profile recommendations from the user's selected repertoire intent.

The result should reduce product and architecture uncertainty before production builder implementation.

## Delivered review artifacts

Directory: `prototypes/rb-008-visual-candidate-choice/`

- Direction A — board-first decision desk with one large shared board, keyboard-switchable candidates, focused evidence and response coverage queue;
- Direction B — candidate landscape with simultaneous mini-board cards and response coverage matrix;
- responsive desktop/mobile behavior;
- static interaction for candidate switching and cover/defer/ignore states;
- realistic mock sharp-versus-solid, profile-override, sparse-personal-data and peer-population scenarios;
- review guide and evidence-responsibility notes.

Report: `reports/RB-008-2026-07-26-visual-candidate-prototype-review.md`.

## Provisional recommendation

Pending user review, use Direction A as the default production workbench hypothesis because it preserves board readability and the existing analysis-workbench mental model. Borrow Direction B's candidate-attached target/profile labels and consider an explicit mini-board compare mode rather than showing three full candidate boards by default.

This recommendation is not locked until user review is recorded in `DECISIONS.md`.

## Why this task exists

The user explicitly requires move selection to be visual, not merely a list of lines. The repository contains boards, workbenches, engine widgets, course trees, finding cards, and a separate visual-transformation program, but no current pattern should be assumed sufficient without realistic proof.

## Current repo anchors inspected

- current visual-transformation branch decisions, tokens, shell and representative static prototype;
- shared analysis workbench and chessboard composition;
- opening-analysis page and widgets;
- line editor workbench and tree navigation;
- course review finding cards and board images;
- responsive/mobile CSS patterns;
- current RB-001/RB-002 population and factual player-level vocabulary;
- planned RB-006/RB-007 target and evidence responsibilities.

## Dependencies

No runtime dependency beyond this foundation.

The prototype uses explicitly documented mock responsibilities based on RB-006/RB-007 concepts and does not define their final contracts.

Production implementation remains blocked until the visual direction and relevant evidence contracts are reviewed.

## In scope

- define realistic scenarios for a user-move decision and an opponent-coverage decision;
- include at least one sharp-versus-solid comparison and one profile-override case;
- include multi-speed/rating target context without overwhelming the primary choice;
- prototype at least two materially different visual compositions before recommending one;
- show board positions or interactive position previews as primary evidence;
- show essential source evidence and expandable detail;
- represent selected, pending, deferred, and ignored branches;
- consider desktop and narrow/mobile layouts;
- identify reusable versus builder-specific visual primitives;
- record accessibility, keyboard, and information-density considerations;
- produce review artifacts and a decision report.

## Out of scope

- production Angular implementation unless separately approved after prototype review;
- final API contracts;
- real ranking calculations;
- LLM narrative;
- full visual-system redesign;
- traps-specific UI.

## Scenarios demonstrated

1. User move with three candidates: target-aligned structured choice, profile-aligned sharp choice, and practical/objectively costly alternative.
2. Opponent response coverage with frequency differences and cumulative first-pass coverage.
3. A player profile recommending sharp play while the selected repertoire persona is solid.
4. Sparse personal data but meaningful population/master evidence.
5. Mobile presentation where boards and evidence remain usable.

## Review questions

- Direction A, Direction B, or the proposed hybrid?
- Is one large board more important than simultaneous structural comparison?
- Should mini-board comparison be a default surface or an explicit mode?
- Does the response queue communicate selected, deferred and ignored work clearly enough?
- Is cumulative coverage useful at the decision point?
- Is target/profile disagreement prominent without becoming obstructive?
- Is Direction B's sticky mobile summary useful or intrusive?

## Acceptance assessment

- Two materially different interaction directions are reviewable with realistic data: met.
- Every candidate is visually connected to a position: met.
- Reasons and tradeoffs are visible: met.
- Profile recommendation and explicit persona choice are visibly separate: met.
- Opponent coverage, cumulative relevance and deferral are represented: met.
- Desktop and mobile behavior are demonstrated: met through local Chromium/Playwright review.
- Required data, component responsibilities and risks are documented without locking endpoints: met.
- User review outcome is recorded in `DECISIONS.md`: pending.

## Validation

Performed:

- local Chromium/Playwright rendering at 1440 × 1100 and 390 × 844;
- visual inspection of both directions at both widths;
- candidate board/evidence switching;
- arrow-key candidate navigation;
- cover/defer/ignore state and cumulative-coverage updates;
- relative asset-link validation;
- focus, status-text and color-independence review;
- repository CI through PR #110.

Skipped pending production work:

- authenticated application-shell integration;
- assistive-technology screen-reader testing;
- physical touch-device testing;
- real data/API integration;
- production Angular component tests.

## Completion updates

After user review:

- record the approved/rejected/hybrid direction in `DECISIONS.md`;
- update this task to `DONE` or revise the prototype scope;
- update issue #96 and PR #110 disposition;
- decide whether production UI needs a separate RB task;
- keep or adjust queue order with explicit rationale.

## Completion

Report: `reports/RB-008-2026-07-26-visual-candidate-prototype-review.md`

Completed at: pending user review
