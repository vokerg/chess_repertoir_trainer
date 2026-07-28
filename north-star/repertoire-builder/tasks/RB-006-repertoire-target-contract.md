# RB-006 — Define repertoire target contract

Status: REVIEW

Priority: P1

Order: 70

Delivery class: North-star

Planning maturity: Outlined

Claimed by: OpenAI ChatGPT

Claim branch: `rb-006/issue-94-repertoire-target-contract-v2`

Claimed at: 2026-07-28

Claim scope: Define the shared, versioned repertoire-target Zod contract and pure resolution/change-impact helpers; cover supported speed and population targets, starting position and side, reproducible peer/profile defaults, explicit manual overrides, persona/objective, risk/theory/coverage intent, mutability and recalculation semantics, canonical examples, invariant tests, and required North Star documentation. Excludes UI, persistence, candidate ranking, course writes, traps, and LLM work.

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

Consumes completed RB-001/RB-002 factual player-level evidence.

Consumes completed RB-003/RB-018 opening-classification vocabulary and accepted RB-008 setup/workbench direction.

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

## Resolved decisions

- Factual peer-resolution evidence is snapshotted inside peer-derived population targets for reproducibility.
- An explicit Lichess benchmark group can replace a peer-derived default without mutating factual player-level evidence.
- `MY_PEERS_PLUS_ONE` appends exactly one adjacent group above the highest selected peer group and caps at `2500+`.
- V1 requires the `LICHESS_GAMES` population source; future providers require a versioned contract extension.
- Persona is a transparent label plus explicit objective dimensions; the dimensions are authoritative for ranking.
- Deliberately dubious intent requires `minimumSoundness: DUBIOUS` and explicit opt-in. Factual `UNKNOWN` values are not valid target intent.
- One target applies to one builder target/session snapshot. Branch-specific policy is deferred.
- Draft/session persistence and completed-course target metadata remain owned by RB-009, RB-013 and RB-011.

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

The report includes canonical target examples, unresolved persistence questions, and direct impacts on RB-007, RB-009, RB-013 and RB-008 production planning.

## Completion

Report: `../reports/RB-006-2026-07-28-repertoire-target-contract.md`

Completed at: 2026-07-28
