# RB-007 — Aggregate and rank candidate evidence explainably

Status: IN_PROGRESS

Priority: P1

Order: 90

Delivery class: North-star

Planning maturity: Outlined

Claimed by: OpenAI ChatGPT

Claim branch: `rb-007/issue-95-candidate-evidence-ranking`

Claimed at: 2026-07-29

Claim scope: Define and implement the shared versioned candidate-decision contract and deterministic v1 ranking policy; add a transport-independent API service that aggregates bounded legal engine, Masters, selected-population, personal-game, opening-profile, and course-coverage evidence through explicit injectable provider boundaries; preserve missing/stale/insufficient source states, eligibility warnings, separate user-move and opponent-coverage roles, profile fit versus target fit, stable reason codes, reproducible ordering, focused tests, and required North Star documentation. Excludes final Angular builder UI, builder-session or candidate persistence, course writes, traps integration, LLM ranking, unbounded analysis, and changes to the completed peer-resolution formula.

## Outcome

For one position and repertoire target, produce a bounded set of legal candidate moves with separated evidence, eligibility decisions, deterministic ordering, recommendation reasons, and explicit data-quality limitations.

The same domain should distinguish a user-move decision from opponent-response coverage.

## Why this task exists

The builder needs more than Stockfish's first move and more than corpus popularity. It must compare objective quality, master practice, selected population behavior, personal familiarity/results, opening character, course coverage, and target fit without hiding how the recommendation was made.

## Current repo anchors to inspect

- position-analysis service, cache, normalization, and multipv support;
- masters explorer contracts/service/cache;
- completed RB-001/RB-002 population and factual player-level evidence;
- personal opening-analysis next moves and performance;
- course position suggestions and repertoire graphs;
- RB-003 opening profiles;
- RB-004 profile evidence;
- completed RB-006 target contract;
- pure domain package conventions and tests.

## Dependencies

Consumes completed RB-003 and RB-006.

Consumes completed RB-001/RB-002 population and factual player-level evidence.

Should incorporate RB-008 visual data requirements.

RB-009/RB-010 depend on its response and reason semantics.

## In scope

### Evidence aggregation

- canonicalize the position and legal moves;
- collect engine candidate lines at an approved bounded quality;
- join master, target-population, personal, opening-profile, and course evidence;
- retain source-specific sample sizes and metadata;
- identify existing coverage, transpositions, and conflicts;
- represent unavailable, stale, or insufficient sources explicitly;
- produce bounded candidate count and bounded supporting examples.

### Eligibility

- define target-dependent hard exclusions and warnings;
- distinguish objectively losing/invalid moves from deliberately risky but permitted moves;
- respect explicit dubious/risk tolerance;
- avoid silently excluding manual candidates the UI may request for comparison.

### Ranking

- apply deterministic versioned policy;
- keep component contributions and reason codes inspectable;
- separate profile fit from selected-target fit;
- vary policy by selected speed set, rating target, objective, and persona;
- define opponent-response priority separately from user-move preference;
- support coverage-relevance reasons such as common at own level or personally encountered.

## Out of scope

- changing the completed factual player-level formula;
- final builder UI;
- builder-session state;
- course writes;
- LLM-generated ranking;
- trap-specific evidence until RB-014 creates a verified source;
- unbounded engine analysis or population traversal;
- claiming causal certainty from personal results.

## Open questions to resolve

- engine multipv count, depth, and cache requirements;
- evaluation-loss thresholds by target;
- score orientation and mate normalization;
- treatment of popularity versus score;
- general and multi-speed weighting;
- learning-burden estimate;
- transposition value;
- minimum evidence for profile-fit reasons;
- whether numeric aggregate score is public, internal, or omitted;
- versioning and reproducibility of policy;
- how users request a candidate omitted from the initial bounded set.

## Acceptance criteria

- User-move and opponent-coverage decisions have explicit roles.
- Candidate evidence sources remain separate in the response.
- Every recommendation has stable reason codes and human-readable inputs can be constructed without an LLM.
- Profile fit and target fit are distinct.
- A deliberately dubious target can permit a risky move while showing objective cost.
- Multi-speed/rating target changes can alter ordering reproducibly.
- Sparse personal data does not fabricate a personal conclusion.
- Existing course coverage/conflict is visible.
- Service is transport-independent and testable with injected/fake evidence providers where appropriate.
- Tests cover target variants, missing sources, objective warnings, profile override, ties, transpositions, and opponent coverage.

## Required validation

- contracts and domain tests;
- API build and focused service tests;
- engine/cache integration tests where applicable;
- boundedness/performance review;
- architecture checks.

## Completion updates

The report must publish policy version, reason taxonomy, evidence limits, unresolved calibration work, and direct impacts on RB-009/RB-010 and production visual components.

## Completion

Report: none

Completed at: none
