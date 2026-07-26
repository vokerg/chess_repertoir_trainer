# RB-008 — Prototype visual candidate and coverage choices

Status: CLAIMED

Priority: P1

Order: 40

Delivery class: North-star

Planning maturity: Outlined

Claimed by: ChatGPT session

Claim branch: `rb-008/issue-96-visual-candidate-prototype`

Claimed at: 2026-07-26

Claim scope: static discovery and visual proof only — two materially different responsive HTML/CSS/JavaScript interaction directions with realistic mock candidate and opponent-coverage evidence, desktop/mobile review artifacts, and a decision/contract-implication report. No production Angular, API, schema, database, ranking, or course-write changes.

## Outcome

Produce a reviewed visual interaction direction for:

- comparing user-move candidates and resulting positions;
- understanding evidence and tradeoffs;
- selecting opponent responses to cover;
- seeing branch progress and deferred work;
- distinguishing profile recommendations from the user's selected repertoire intent.

The result should reduce product and architecture uncertainty before production builder implementation.

## Why this task exists

The user explicitly requires move selection to be visual, not merely a list of lines. The repository contains boards, workbenches, engine widgets, course trees, finding cards, and a separate visual-transformation program, but no current pattern should be assumed sufficient without realistic proof.

## Current repo anchors to inspect

- current visual-transformation branch, decisions, tokens, shell, and representative workflow status;
- shared analysis workbench and chessboard components;
- opening-analysis page and widgets;
- line editor workbench and tree navigation;
- course review finding cards and board images;
- responsive/mobile CSS patterns;
- any Figma or prototype assets approved by the user.

## Dependencies

No runtime dependency beyond this foundation.

May use explicitly documented mock contracts based on RB-006/RB-007 concepts.

May run in parallel with RB-003 and early profile work. RB-001/RB-002 factual population and player-level evidence is complete and may inform realistic mock values.

Production implementation is blocked until relevant evidence contracts and visual direction are reviewed.

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

## Scenarios to demonstrate

1. User move with three candidates: objectively safest, profile-aligned sharp choice, and practical/dubious alternative.
2. Opponent response coverage with frequency differences across selected speeds and rating levels.
3. A player profile recommending sharp play while the selected repertoire persona is solid.
4. Sparse personal data but meaningful population/master evidence.
5. Mobile presentation where boards and evidence remain usable.

## Open questions to resolve

- multiple mini-boards versus one interactive board;
- how far ahead a candidate preview should show;
- which metrics are always visible;
- how to compare structures rather than only immediate moves;
- where target settings and profile context live;
- whether branch queue is a side panel, timeline, map, or separate view;
- how deferral and coverage percentage are communicated;
- how to avoid card overload.

## Acceptance criteria

- At least two interaction directions are reviewable with realistic data.
- Every candidate is visually connected to a position, not only text.
- The user can identify why a move is shown and what tradeoff it represents.
- Profile recommendation and explicit persona choice are visibly separate.
- Opponent coverage, cumulative relevance, and deferral are understandable.
- Desktop and mobile behavior are demonstrated.
- The recommended direction identifies required data, component responsibilities, and unresolved risks without prematurely locking endpoints.
- User review outcome is recorded in `DECISIONS.md`.

## Required validation

- visual review at representative desktop and mobile widths;
- keyboard/focus review for interactive prototypes where applicable;
- contrast and readable-board-size review;
- no application build unless production code is changed.

## Completion updates

The report must state:

- reviewed alternatives;
- approved/rejected visual decisions;
- contract implications for RB-006, RB-007, RB-009, and RB-010;
- whether production UI should be split into additional tasks;
- queue reprioritization recommendation.

## Completion

Report: none

Completed at: none
