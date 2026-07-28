# RB-013 — Support repertoire personas and profile overrides

Status: PROPOSED

Priority: P1

Order: 80

Delivery class: Dual-use

Planning maturity: Outlined

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Allow a player to use profile-derived suggestions as a starting point while deliberately creating one or more repertoires with different intents.

Examples:

- a solid `1.d4` course;
- a sharp `1.d4` course;
- a dubious practical weapon;
- a low-theory blitz course;
- a classical course intended to scale upward;
- a future trap-oriented course.

## Why this task exists

A player profile is descriptive, not destiny. The product needs an explicit mechanism for turning profile conclusions into optional defaults, recording deliberate overrides, and maintaining multiple course intents without presenting them as contradictions or errors.

## Current repo anchors to inspect

- RB-004/RB-005 profile contracts and UI;
- RB-006 target contract;
- course/chapter/line metadata, tags, and notes;
- course list/overview and library presentation;
- course-copy and reintegration behavior;
- current filters and route-query patterns.

## Dependencies

Proposed until RB-005 and RB-006 establish actual profile and target shapes.

Parts may be absorbed into those tasks or split into course-metadata and setup-UX tasks after inspection.

## In scope

- define how profile suggestions initialize a target;
- define explicit override records and user-facing explanation;
- define named persona presets only when they map to transparent target dimensions;
- allow multiple courses/targets from the same opening without forcing replacement;
- determine whether course metadata stores target/persona identity and version;
- support changing target intent for a new variant while preserving the original course;
- distinguish optimization for current results from deliberate learning/development;
- define how candidate ranking reports profile fit versus target fit;
- add tests for override precedence and multiple-persona cases.

## Out of scope

- opening classification mechanics;
- trap data implementation;
- candidate ranking details beyond required inputs/reasons;
- automatic course duplication without review;
- one permanent user persona;
- LLM-generated persona labels as factual state.

## Open questions to resolve

- Are personas named presets, saved target templates, or course metadata?
- Can users define custom personas?
- Should course target metadata be immutable history or editable intent?
- How are profile changes handled after a course is created?
- How does a builder explain `not profile-aligned, but chosen intentionally`?
- Is a dubious repertoire permitted only after an explicit risk acknowledgement?
- How are multiple courses for the same opening distinguished in library and review views?

## Acceptance criteria

- A profile-derived default can be accepted, edited, or rejected.
- Manual target choices take precedence without altering the factual profile.
- Two courses for the same opening can retain distinct, inspectable intents.
- Persona labels do not hide their underlying dimensions.
- Candidate explanations can show both profile fit and selected-target fit.
- A future traps persona can be added without changing the basic override model.
- Tests cover default acceptance, partial override, complete override, and alternate-course creation.

## Required validation

Depends on final scope. At minimum:

- contract/helper tests;
- API tests if course metadata changes;
- web tests and responsive review if persona setup/presentation is implemented;
- migration validation if persistence is added.

## Completion updates

The report must state whether personas became target presets, course metadata, or both, and whether new tasks are required for course library presentation or migration.

## Completion

Report: none

Completed at: none
