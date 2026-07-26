# RB-010 — Implement bounded interactive builder MVP

Status: BLOCKED

Priority: P1

Order: 110

Delivery class: North-star

Planning maturity: Outlined

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

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
- RB-006/RB-007/RB-009 contracts and services;
- current Angular route, workbench, board, store, and data-access patterns;
- opening-analysis and line-editor composition;
- authentication and application-shell state, including visual-transformation changes;
- app route registration and feature navigation conventions.

## Dependencies

Blocked on RB-007, RB-008, and RB-009.

RB-011 depends on a stable draft preview output.

## In scope

- dedicated authenticated route and feature boundary;
- bounded setup using an existing target or minimal target form;
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

- generating an entire repertoire without interaction;
- every possible setup option;
- traps mode;
- LLM requirement;
- automatic course writing unless separately approved;
- advanced collaboration;
- final onboarding/marketing;
- broad redesign of opening analysis or courses.

## MVP bounding choices to resolve during claim

- one side and starting-point type;
- maximum candidates and branches;
- maximum build depth or number of decisions;
- whether persistence/resume is included based on RB-009;
- whether profile-derived setup is included or mocked;
- which population sources are mandatory;
- how preview tree and coverage are summarized.

## Acceptance criteria

- The workflow alternates correctly between user-choice and opponent-coverage decisions.
- Candidate positions are visual.
- Recommendation reasons and source evidence are inspectable.
- Arbitrary selected speed combinations are represented through the target.
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
