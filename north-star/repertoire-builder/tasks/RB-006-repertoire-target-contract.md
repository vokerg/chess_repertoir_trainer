# RB-006 — Define repertoire target contract

Status: IN_PROGRESS

Priority: P1

Order: 70

Delivery class: North-star

Planning maturity: Outlined

Claimed by: OpenAI ChatGPT

Claim branch: `rb-006/issue-94-repertoire-target-contract-claim`

Claimed at: 2026-07-28

Claim scope: Define the shared, versioned repertoire-target Zod contract and pure resolution helpers; cover supported speed and population targets, starting position and side, reproducible peer/profile-derived defaults, explicit manual overrides, persona/objective, risk/theory/coverage intent, mutability and recalculation semantics, canonical examples, invariant tests, and required North Star documentation. Excludes UI, persistence, candidate ranking, course writes, traps, and LLM work.

## Outcome

Define a versioned, explainable repertoire-target model that captures what one build is trying to optimize without confusing it with the player's factual profile.

The target must support the product speed presets and peer-rating targets established by RB-001, plus persona/objective, theory and risk tolerance, coverage policy, account context, profile-derived defaults and manual overrides.

## Why this task exists

Candidate ranking has no meaning without explicit target intent. A move suitable for slower play against stronger peers may not be the best practical bullet choice. A factual peer band or profile-derived preference should initialize the target without preventing the user from choosing another population or repertoire character.

The factual multi-account peer interval and distribution are already available from the completed RB-001/RB-002 boundary.

## Current repo anchors to inspect

- RB-001 speed-preset, rating-target, population-evidence and factual peer-resolution contracts;
- rating-normalization contracts and profile versions;
- opening-profile contract from RB-003;
- course, chapter, line and tag/notes models;
- game-filter models and account selectors;
- profile output from RB-004/RB-005;
- RB-008 prototype data needs;
- shared contract versioning conventions.

## Dependencies

Blocked on reliable contract direction from RB-003.

Should incorporate reviewed findings from RB-008.

Consumes the completed RB-001/RB-002 factual player-level boundary.

RB-007 and RB-009 depend on it.

## In scope

- define target identity and version;
- define source starting point and side;
- model one RB-001 speed preset: `ALL`, `BLITZ_AND_SLOWER`, `BLITZ` or `BULLET`;
- model one population target: all players, my peers, my peers plus one higher band, or one explicit Lichess-benchmark group;
- snapshot or reference completed factual peer-level evidence appropriately;
- record the normalization profile and peer-resolver policy versions used for derived defaults;
- model provider/population source selection;
- define persona/objective separately from profile suggestions;
- define objective soundness/risk tolerance without pretending classification details are already fixed;
- define theory/complexity tolerance and coverage goals;
- define personal-game inclusion rules such as always covering responses encountered N times;
- record profile-derived defaults, explicit overrides and manual choices separately;
- define forward-compatible optional fields without an unstructured JSON dumping ground;
- provide Zod schemas and pure helpers where appropriate;
- document which target fields are mutable during a draft and which require recalculation.

## Out of scope

- changing or mutating factual player-level evidence;
- arbitrary speed arrays or editable speed weights;
- candidate ranking implementation;
- builder-session persistence;
- course persistence of target metadata unless separately approved;
- final setup UI;
- opening-classification taxonomy;
- traps schema;
- LLM prompts.

## Open questions to resolve

- Is the factual peer-band evidence snapshotted to keep a draft reproducible?
- Can a user choose a different explicit benchmark group without changing the factual profile?
- Does “my peers plus one” remain exactly one adjacent group in all builder contexts?
- Is provider selection mandatory or can evidence combine providers later?
- Is persona a named preset, explicit dimensions, or both?
- How is deliberately dubious intent separated from accidental low soundness?
- Can target policy vary by branch?
- Which fields are persisted with a completed course for future maintenance?

## Acceptance criteria

- Every valid target contains one supported speed preset and one supported population target.
- Defaults can reference completed factual evidence, but a manual override is explicit and authoritative.
- The target records the effective normalization/profile policy versions required for reproducibility.
- An explicit benchmark group can replace a peer-derived default without mutating player-level evidence.
- Solid and dubious alternatives for the same opening can be represented as different targets.
- Coverage and theory/risk intent are machine-readable enough for ranking.
- Missing optional evidence does not make the target invalid unless genuinely required.
- Contract examples cover new course, existing-course adaptation and alternate persona.
- Tests validate invariants and invalid combinations.

## Required validation

- contracts build and tests;
- pure helper tests;
- API/web builds for any immediate consumers;
- architecture review for ownership of target schemas.

## Completion updates

The report must include canonical target examples, unresolved persistence questions, and direct impacts on RB-007, RB-009, RB-013 and RB-008 production planning.

## Completion

Report: none

Completed at: none
