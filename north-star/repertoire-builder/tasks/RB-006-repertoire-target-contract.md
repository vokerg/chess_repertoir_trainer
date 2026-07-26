# RB-006 — Define repertoire target contract

Status: BLOCKED

Priority: P1

Order: 70

Delivery class: North-star

Planning maturity: Outlined

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Define a versioned, explainable repertoire-target model that captures what one build is trying to optimize without confusing it with the player's factual profile.

The target must support arbitrary speed combinations, rating goals, persona/objective, theory and risk tolerance, coverage policy, account context, profile-derived defaults, and manual overrides.

## Why this task exists

Candidate ranking has no meaning without explicit target intent. A move suitable for classical play against stronger opponents may not be the best practical bullet choice. A profile-derived sharp preference should not prevent a user from building a solid course.

## Current repo anchors to inspect

- rating-normalization contracts and RB-002 output;
- population evidence contract from RB-001;
- opening-profile contract from RB-003;
- course, chapter, line, and tag/notes models;
- game-filter models and account selectors;
- profile output from RB-004/RB-005;
- RB-008 prototype data needs;
- shared contract versioning conventions.

## Dependencies

Blocked on reliable contract direction from RB-001, RB-002, and RB-003.

Should incorporate reviewed findings from RB-008.

RB-007 and RB-009 depend on it.

## In scope

- define target identity and version;
- define source starting point and side;
- model `GENERAL` versus a non-empty weighted speed set;
- model provider/population source selection;
- model general, own-level, own-level-plus-grades, and custom rating targets;
- snapshot or reference player-level evidence appropriately;
- define persona/objective separately from profile suggestions;
- define objective soundness/risk tolerance without pretending classification details are already fixed;
- define theory/complexity tolerance and coverage goals;
- define personal-game inclusion rules such as always cover responses encountered N times;
- record profile-derived defaults, explicit overrides, and manual choices separately;
- define forward-compatible optional fields without an unstructured JSON dumping ground;
- provide Zod schemas and pure helpers where appropriate;
- document which target fields are mutable during a draft and which require recalculation.

## Out of scope

- candidate ranking implementation;
- builder-session persistence;
- course persistence of target metadata unless separately approved;
- final setup UI;
- opening-classification taxonomy;
- traps schema;
- LLM prompts.

## Open questions to resolve

- Are speed weights always required or derived when omitted?
- Does General mode have one versioned profile ID?
- Is provider selection mandatory or can evidence combine providers?
- Is player level snapshotted to keep a draft reproducible?
- How are one or several grades above represented?
- Is persona a named preset, explicit dimensions, or both?
- How is deliberately dubious intent separated from accidental low soundness?
- Can target policy vary by branch?
- Which fields are persisted with a completed course for future maintenance?

## Acceptance criteria

- Bullet plus blitz and blitz plus rapid are valid without special-case schema changes.
- General mode is distinct and carries or references controlled weighting.
- Own-level targets use RB-002 evidence and record the normalization version.
- A profile suggestion can initialize the target but manual override is explicit and authoritative.
- Solid and dubious alternatives for the same opening can be represented as different targets.
- Coverage and theory/risk intent are machine-readable enough for ranking.
- Missing optional evidence does not make the target invalid unless genuinely required.
- Contract examples cover new course, existing-course adaptation, and alternate persona.
- Tests validate invariants and invalid combinations.

## Required validation

- contracts build and tests;
- pure helper tests;
- API/web builds for any immediate consumers;
- architecture review for ownership of target schemas.

## Completion updates

The report must include canonical target examples, unresolved persistence questions, and direct impacts on RB-007, RB-009, RB-013, and RB-008 production planning.

## Completion

Report: none

Completed at: none
