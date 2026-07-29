# RB-010 — Implement bounded interactive builder MVP

Status: CLAIMED

Priority: P1

Order: 110

Delivery class: North-star

Planning maturity: Outlined

Claimed by: OpenAI ChatGPT

Claim branch: `rb-010/issue-98-interactive-builder-claim`

Claimed at: 2026-07-29

Claim PR: `#182`

Claim scope: Implement the first authenticated `/builder` Angular feature as a page-scoped, non-persistent routed workbench using the accepted RB-008 board-first composition, integrated RB-006 repertoire targets, the existing authenticated `POST /api/candidate-decisions` endpoint, and the RB-009 pure session reducer. The MVP supports one active build at a time, one selected repertoire side, the initial position only, fixed RB-001 speed presets and rating targets, optional peer-resolution loading for peer targets, four transparent persona presets, 50–100% opponent coverage, at most 6 returned candidates, at most 24 accepted decisions and the existing RB-009 hard session/queue/preview bounds. It includes a focused setup dialog, primary board with candidate switching and board-move selection, inspectable evidence/source states, separate target/profile fit, opponent-response multi-selection, bounded branch queue navigation, defer/reopen/ignore/stop actions, branch/status progress, preview tree, stale/error/no-data handling, responsive and keyboard-accessible presentation, typed feature-local data access/store/helpers/components, route/navigation registration, and focused Angular tests. Refresh intentionally starts a new draft; no Prisma model, API session route, browser storage, course write, profile-derived defaults, traps, LLM behavior, full-tree generation, or broad analysis/courses redesign is included.

## Outcome

Deliver the first end-to-end interactive repertoire-building slice in which a user can:

1. start from a bounded position/line;
2. use an explicit repertoire target;
3. visually compare user-move candidates;
4. select opponent responses to cover;
5. continue through a bounded branch queue;
6. defer work;
7. inspect the resulting draft tree.

Course writing is handled by RB-011 and may remain preview-only in this task.

## Why this task exists

This is the first direct north-star delivery. It should prove that deterministic evidence, visual choices, target intent, and branch-state concepts form a coherent workflow before expanding to whole-opening generation.

## Current repo anchors to inspect

- approved RB-008 visual direction;
- integrated RB-006 target contract, RB-007 candidate decisions and RB-009 session/queue domain;
- RB-001 speed/rating presets and RB-002 factual player-level evidence;
- current Angular route, workbench, board, store, and data-access patterns;
- opening-analysis and line-editor composition;
- authentication and application-shell state, including visual-transformation changes;
- app route registration and feature navigation conventions.

## Dependencies

Completed: integrated RB-007 candidate decisions, accepted RB-008 routed visual direction, and integrated RB-009 builder-session model through squash-merged PR #177.

RB-011 depends on a stable draft preview output.

## In scope

- dedicated authenticated route and feature boundary;
- bounded setup using an existing target or minimal target form;
- RB-001 speed preset and rating target selection;
- factual peer evidence versus explicit target override presentation;
- visual candidate selection for user moves;
- opponent-response coverage selection;
- branch queue navigation;
- defer/reopen behavior;
- evidence detail and missing-data states;
- profile recommendation versus explicit target distinction;
- draft tree/coverage preview;
- loading, errors, stale decisions, and no-data behavior;
- responsive desktop/mobile implementation consistent with approved visual system;
- typed data access and feature store;
- focused API/web tests and accessibility review.

## Out of scope

- arbitrary speed arrays or editable speed weights;
- generating an entire repertoire without interaction;
- every possible setup option;
- traps mode;
- LLM requirement;
- automatic course writing unless separately approved;
- advanced collaboration;
- final onboarding/marketing;
- broad redesign of opening analysis or courses.

## MVP bounding choices resolved for this claim

- one active build and one selected side per route-local session;
- initial-position starts only;
- at most 6 candidate moves returned per decision;
- at most 24 accepted decisions in the MVP workflow, while retaining the RB-009 hard limits of 256 branches, 128 queued branches, 8 selected moves and 256 preview nodes;
- no persistence or durable resume; refresh explicitly starts a new draft;
- no profile-derived setup defaults; available candidate profile evidence remains visible and advisory;
- the existing candidate endpoint remains the sole candidate/evidence source; peer resolution is loaded only when a peer rating target is selected;
- preview is summarized through bounded branch nodes, queue order and status counts without course materialization.

## Acceptance criteria

- The workflow alternates correctly between user-choice and opponent-coverage decisions.
- Candidate positions are visual.
- Recommendation reasons and source evidence are inspectable.
- The target exposes one valid RB-001 speed preset and one valid rating target.
- Factual peer evidence and manual target override remain distinguishable.
- The user can choose against the profile recommendation.
- Deferred branches remain visible and reopenable.
- Draft output is bounded and previewable.
- Reload/resume behavior matches the RB-009 decision honestly.
- No course is changed without an explicit preview/apply action.
- Ownership and validation are enforced.
- Desktop and mobile workflows are usable.
- Tests cover the primary decision loop, stale requests, errors, deferral, override, and preview.

## Required validation

- contracts/domain/API builds and focused tests;
- web build, focused store/component tests, lint, architecture checks;
- browser review at desktop and mobile widths;
- keyboard navigation and accessible-label review;
- realistic data performance review.

## Completion updates

The report must record the proven and failed assumptions, actual MVP bounds, UX findings, and readiness/blockers for RB-011 and RB-012.

## Completion

Report: none

Completed at: none
