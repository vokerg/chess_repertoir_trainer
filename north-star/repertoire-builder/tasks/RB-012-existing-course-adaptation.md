# RB-012 — Enter builder from existing-course findings

Status: BLOCKED

Priority: P2

Order: 130

Delivery class: Dual-use

Planning maturity: Outlined

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Use current course evidence to launch the same repertoire-builder workflow at a precise position and intent.

Initial entry points may include:

- uncovered opponent response;
- course ending with common continuation;
- repeated user deviation;
- weak or unsuitable repertoire choice;
- adaptation to another speed/rating target;
- creation of an alternate persona.

## Why this task exists

The application already detects several relationships between real games and courses. The north star should not abandon those features or build a second maintenance system. Findings should become actionable decisions inside the same visual, explainable builder.

## Current repo anchors to inspect

- unified course review modes and finding models;
- repertoire coverage service;
- course extension/endings service;
- opening struggles and course annotations;
- course position suggestions;
- route/query navigation from findings to analysis;
- RB-010 builder start contract and RB-011 application flow.

## Dependencies

Blocked on RB-010 and RB-011.

May be split by entry-point type after inspection.

## In scope

- select the smallest useful initial finding type or types;
- define a builder launch payload with course, position, line/node anchor, evidence filters, and suggested intent;
- preserve the user's ability to change target speed/rating/persona;
- show existing expected move and candidate alternatives where applicable;
- distinguish extend, replace, and create-alternative actions;
- maintain navigation back to the originating finding;
- preview course impact before apply;
- update finding/course review state after successful apply where current architecture supports it;
- add route/store/API tests for launch and completion.

## Out of scope

- migrating every lab and struggle feature at once;
- deleting existing reports before the new workflow proves equivalent value;
- automatic replacement of course moves;
- whole-course retargeting in the first slice;
- traps mode;
- LLM explanation requirement.

## Open questions to resolve

- Which entry point provides the highest value with least ambiguity?
- Does a user deviation suggest reinforcement or repertoire replacement?
- How is course-ending coverage threshold transferred into the target?
- How are original finding filters preserved?
- Should a completed apply resolve, suppress, or merely annotate a finding?
- How is an alternate persona linked to the source course?
- When should the action create a new line versus merge?

## Acceptance criteria

- At least one real existing-course finding launches the builder at the correct position and course context.
- The original finding evidence is visible.
- The user can modify suggested target intent.
- Extend, replace, and alternate-course consequences are not conflated.
- Course changes use RB-011 preview/apply.
- Existing feature behavior remains available until replacement is explicitly approved.
- Navigation and stale-course handling are tested.
- No duplicate recommendation engine is introduced.

## Required validation

- API and web focused tests;
- route/query and stale-context tests;
- course preview/apply integration tests;
- browser review of finding-to-builder-to-course loop;
- architecture checks.

## Completion updates

The report must recommend the next finding types to integrate, whether any existing lab should be retired, and whether queue priorities change based on observed maintenance value.

## Completion

Report: none

Completed at: none
