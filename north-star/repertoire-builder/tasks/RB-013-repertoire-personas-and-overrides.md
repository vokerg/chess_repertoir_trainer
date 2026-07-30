# RB-013 — Support repertoire personas and profile overrides

Status: IN_PROGRESS

Priority: P1

Order: 80

Delivery class: Dual-use

Planning maturity: Bounded profile-to-Builder composition underway

GitHub issue: `#101`

Claimed by: `vokerg` / ChatGPT agent session

Claim PR: `#231`

Claim branch: `rb-013/issue-101-profile-persona-claim`

Implementation branch: `rb-013/issue-101-profile-persona-launch`

Claimed at: 2026-07-30

Claim scope: Deliver a bounded profile-to-Builder v1 using the integrated RB-004/RB-005 profile response and the existing RB-006 target provenance/override algebra. Add an explicit Player Chess Profile launch into Builder, deterministic and inspectable profile-derived setup suggestions, immutable profile provenance, editable/rejectable defaults, exact `overriddenFields` behavior, focused Angular/contract tests, and North Star documentation. Excludes course/line persistence, automatic course duplication, hidden persona inference, profile recalculation inside Builder, ranking-policy changes, AI narrative, and trap data.

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

## Verified repo anchors

- RB-004/RB-005 profile contracts and `/progress/profile` UI are integrated on `main` through the merged RB-004/RB-005 claim stacks;
- RB-006 already defines `PLAYER_PROFILE` default provenance and exact `overriddenFields` validation;
- the Builder setup dialog already exposes editable persona, speed, population, theory, coverage, and side controls;
- route-query launch parsing already exists for exact Course review entry points;
- candidate evidence already keeps profile fit and target fit separate;
- RB-011 course apply remains authoritative and is not changed by this slice.

## Dependencies

Satisfied for the bounded v1:

- RB-004 profile calculation is present on `main` through PRs #136 and #135;
- RB-005 profile experience is present on `main` through PRs #139, #138, and #135;
- RB-006 target contract is complete through PR #157.

Repository and issue closure state for RB-004/RB-005 remains stale and must be reconciled separately; it does not block use of their integrated runtime contracts.

## In scope

- derive a deterministic setup suggestion from the loaded profile without assigning a permanent user persona;
- expose the suggestion from `/progress/profile` only when eligible profile evidence exists;
- allow the user to choose White or Black when both sides are present;
- launch Builder with bounded profile provenance and suggested setup values;
- show clearly that the profile is a starting point and every Builder control remains editable;
- allow rejecting the suggestion and returning to standard Builder defaults;
- record profile-derived `speedPreset`, `objective`, and `coverage` defaults through the existing RB-006 `PLAYER_PROFILE` source;
- preserve peer-resolution population provenance separately;
- make manual target choices take precedence and appear in exact `overriddenFields`;
- preserve profile fit and selected-target fit as separate concepts;
- add focused tests for default acceptance, partial override, complete rejection, malformed/stale launch input, and alternate persona selection.

## Out of scope

- opening classification mechanics;
- trap data implementation;
- candidate ranking policy changes;
- automatic course duplication without review;
- one permanent user persona;
- LLM-generated persona labels as factual state;
- Prisma migration or persisted course/line target metadata;
- automatic profile recalculation or background synchronization;
- changing RB-011 preview/apply or course-writer behavior.

## Decisions for this bounded v1

- Personas remain transparent Builder target presets, not factual player labels.
- The profile produces one deterministic suggested setup per selected side; it does not create a saved persona.
- Profile provenance is retained in the route-local target snapshot through RB-006 defaults.
- Manual Builder edits always win and are recorded as overrides against the immutable suggested values.
- Rejecting the profile suggestion restores the standard Builder setup and removes profile defaults from the target.
- Persistent course intent and library presentation are deferred until route-local usage demonstrates that retained post-apply intent is valuable.

## Acceptance criteria

- A profile-derived default can be accepted, edited, or rejected.
- Manual target choices take precedence without altering the factual profile.
- Persona labels expose their underlying preferred characters, soundness, risk, theory, complexity, and coverage values.
- Candidate explanations continue to show profile fit and selected-target fit separately.
- Different Builder launches from the same profile can choose different personas without mutating the profile or each other.
- A future traps persona can be added without changing the basic override model.
- Malformed, incomplete, unsupported, or stale profile launch data falls back safely to ordinary Builder setup.
- Tests cover default acceptance, partial override, complete rejection, and alternate-persona creation.

## Required validation

- profile-to-setup pure-helper tests;
- route launch serialization/parsing tests;
- Builder target provenance and override tests;
- profile page action/store tests;
- Builder store/setup presentation tests;
- responsive and keyboard-safe presentation review through existing component patterns;
- complete repository CI before review.

## Completion updates

The report must state whether personas became target presets, course metadata, or both, and whether new tasks are required for retained course intent or library presentation.

## Completion

Report: none

Completed at: none
