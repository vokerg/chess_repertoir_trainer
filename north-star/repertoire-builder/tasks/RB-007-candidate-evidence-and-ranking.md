# RB-007 — Aggregate and rank candidate evidence explainably

Status: DONE

Priority: P1

Order: 90

Delivery class: North-star

Planning maturity: Implemented

GitHub issue: `#95`

Claimed by: OpenAI ChatGPT

Claim branch: `rb-007/issue-95-candidate-evidence-ranking`

Claimed at: 2026-07-29

Claim scope: Define and implement the shared versioned candidate-decision contract and deterministic v1 ranking policy; add a transport-independent API service that aggregates bounded legal engine, Masters, selected-population, personal-game, opening-profile, and course-coverage evidence through explicit injectable provider boundaries; preserve missing/stale/insufficient source states, eligibility warnings, separate user-move and opponent-coverage roles, profile fit versus target fit, stable reason codes, reproducible ordering, focused tests, and required North Star documentation. Excludes final Angular builder UI, builder-session or candidate persistence, course writes, traps integration, LLM ranking, unbounded analysis, and changes to the completed peer-resolution formula.

Claim PR: `#164`

Implementation PR: `#166`

Squash commit: `25d37b44c273afe0b7e5838a4fb0a00cee89d88a`

Final implementation-head CI: run `30421735252` / CI #1295 — success

## Outcome

For one position and repertoire target, produce a bounded set of legal candidate moves with separated evidence, eligibility decisions, deterministic ordering, recommendation reasons, and explicit data-quality limitations.

The same domain distinguishes a user-move decision from opponent-response coverage.

## Why this task exists

The builder needs more than Stockfish's first move and more than corpus popularity. It must compare objective quality, master practice, selected population behavior, personal familiarity/results, opening character, course coverage, and target fit without hiding how the recommendation was made.

## Current repo anchors inspected

- position-analysis service, cache, normalization, and MultiPV support;
- Masters and Lichess Games explorer contracts, services, caches, and injected peer resolver;
- completed RB-001/RB-002 population and factual player-level evidence;
- personal opening-analysis next moves and performance;
- course position suggestions;
- RB-003/RB-018 opening profiles;
- RB-004 player-profile evidence;
- completed RB-006 target contract;
- accepted RB-008 visual data responsibilities;
- shared contracts, pure domain, Fastify/OpenAPI, authentication, and test conventions.

## Dependencies

Consumes completed RB-003, RB-006, RB-018, and RB-001/RB-002 evidence.

Consumes accepted RB-008 visual responsibilities.

RB-009/RB-010 depend on its response and reason semantics.

## Delivered scope

### Evidence aggregation

- canonicalizes the position and legal moves;
- consumes up to three stored MultiPV engine lines rather than launching unbounded analysis;
- joins Masters, selected-population, personal, opening-profile, player-profile, and owned-course evidence concurrently;
- retains source-specific sample sizes, versions, fetch metadata, and bounded examples;
- identifies exact course coverage, current-position conflicts, and narrow resulting-position transpositions;
- represents unavailable, stale, and insufficient sources explicitly;
- returns six candidates by default and at most eight;
- always preserves one explicitly requested legal manual candidate.

### Eligibility

- applies target-dependent objective warning and exclusion thresholds;
- distinguishes forced mate/objectively losing moves from deliberately risky but permitted moves;
- respects explicit risk tolerance and dubious opt-in;
- preserves objective cost and warnings for manual candidates instead of silently removing them.

### Ranking

- applies policy version `2026-07-deterministic-v1`;
- keeps objective, population, Masters, personal, target-fit, profile-fit, and course components inspectable;
- omits the internal weighted aggregate from the public response;
- separates profile fit from selected-target fit;
- varies user-move weights by the selected RB-001 speed preset;
- defines opponent-response priority separately from user-move preference;
- emits stable reasons such as common at target level, personally encountered, dangerous response, course coverage, and profile disagreement;
- uses stable UCI tie-breaking.

### API and contracts

- adds `@chess-trainer/contracts/candidate-decision` version `2026-07-v1`;
- adds authenticated `POST /api/candidate-decisions` with route-schema OpenAPI;
- keeps the service transport-independent and provider boundaries injectable;
- validates the complete response contract before return.

## Out of scope

- changing the completed factual player-level formula;
- final builder UI;
- builder-session state or persistence;
- candidate persistence;
- course writes;
- LLM-generated ranking;
- trap-specific evidence;
- live or unbounded engine analysis;
- arbitrary population traversal;
- claiming causal certainty from personal results.

## Policy decisions

- Stored engine evidence is bounded to three lines; depth below 12 is insufficient but visible.
- User-move objective warnings/exclusions vary by explicit risk tolerance; deliberate dubious opt-in raises but does not remove thresholds.
- Forced mate against the target is excluded.
- Scores and mates are oriented to the repertoire target side.
- Selected-population sufficiency uses the target's minimum-population-games setting; Masters support uses ten games.
- Personal familiarity contributes only from at least three games/encounters.
- Player-profile matches require at least five games; performance reasons require medium/high evidence and an absolute score delta of at least five percentage points.
- The public contract exposes component contributions, reasons, warnings, and policy version, not one synthetic aggregate score.
- Manual legal candidates are included through `includeMoveUci`; illegal requests return a typed error.
- Current-position course transposition evidence is implemented; arbitrary downstream graph traversal is deferred.

## Acceptance criteria

- User-move and opponent-coverage decisions have explicit roles. — Met.
- Candidate evidence sources remain separate in the response. — Met.
- Every recommendation has stable reason codes and human-readable inputs can be constructed without an LLM. — Met.
- Profile fit and target fit are distinct. — Met.
- A deliberately dubious target can permit a risky move while showing objective cost. — Met.
- Multi-speed target changes can alter ordering reproducibly. — Met.
- Sparse personal data does not fabricate a personal conclusion. — Met.
- Existing course coverage/conflict is visible. — Met.
- Service is transport-independent and testable with injected/fake evidence providers. — Met.
- Tests cover target variants, missing sources, objective warnings, profile disagreement, ties, transpositions, and opponent coverage. — Met.

## Required validation

Completed through CI #1281, expanded acceptance-head CI #1284, and final implementation-head CI #1295:

- contracts build and tests;
- pure domain ranking tests;
- API lint/build and focused service tests;
- missing/stale/insufficient provider-state tests;
- objective warning, manual candidate, target/profile disagreement, tie, transposition, course conflict, and opponent-coverage tests;
- boundedness review;
- opening-classification audits;
- architecture guardrails;
- migrations and complete repository tests.

No live engine, upstream Lichess, Angular, persistence, or course-write validation was required because those behaviors are outside this task's implementation boundary.

## Completion updates

The implementation report publishes policy version, weights, thresholds, reason taxonomy, evidence limits, unresolved calibration work, and direct impacts on RB-009/RB-010 and production visual components. The closure report records accepted integration, issue closure, queue impact, and unchanged roadmap sequencing.

## Completion

Implementation report: `../reports/RB-007-2026-07-29-candidate-evidence-ranking.md`

Closure report: `../reports/RB-007-2026-07-29-closure.md`

Completed at: 2026-07-29