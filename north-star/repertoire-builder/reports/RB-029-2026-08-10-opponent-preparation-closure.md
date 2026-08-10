# RB-029 Closure — Opponent Preparation and Computed Coverage V2

**Task:** RB-029  
**Issue:** #319  
**Runtime PR:** #331  
**Opponent preparation policy:** `2026-08-opponent-preparation-v1`  
**Candidate Decision contract retained:** `2026-08-v4`  
**Candidate Ranking policy retained:** `2026-08-empirical-persona-v2`  
**Closed:** 2026-08-10

## Delivered

RB-029 reframes `OPPONENT_RESPONSE` from persona-driven candidate ranking into explicit preparation priority: which realistic opponent replies are important enough that the repertoire should prepare for them.

The versioned domain policy recommends a reply when at least one independent preparation signal qualifies it:

- meaningful target-population frequency at the exact position;
- repeated exact-position personal encounters;
- objective danger to the repertoire side.

Existing-course state remains inspectable context and a deterministic ordering tie-breaker, but does not by itself turn a low-relevance reply into a recommendation. Masters remain available as secondary evidence without becoming an opponent persona filter.

## Versioned recommendation policy

`2026-08-opponent-preparation-v1` uses the following deterministic rules:

- target-population evidence must contain at least 20 games;
- a population reply is relevant when its frequency is at least the greater of 3% or 20% of the strongest observed reply at the position;
- at least 3 exact-position personal encounters independently qualify a reply;
- forced mate against the repertoire side or at least 100 cp objective challenge independently qualifies a reply as dangerous.

Recommended replies are ordered ahead of optional replies. Within those groups, deterministic population, personal, danger and course-state signals establish priority, with UCI move order as the final stable tie-breaker.

The policy does not consume `Balanced`, `Solid`, `Aggressive`, `Surprise`, target opening character, theory burden or Player Chess Profile fit. An uncommon reply promoted because it is dangerous or personally repeated keeps that factual reason and is not mislabeled `COMMON_AT_TARGET_LEVEL`.

## Candidate Decision integration

Candidate Decision continues to aggregate engine, population, Masters, personal, opening, course and profile evidence through the existing service. A narrow opponent-preparation projection then applies the RB-029 policy only to `OPPONENT_RESPONSE` results.

For opponent turns the projection:

- reorders candidates using the opponent-preparation domain policy;
- removes target/profile fit reason authority from the returned opponent decision;
- clears target/profile ranking components;
- removes target-soundness and theory-budget warnings that do not judge whether an opponent reply matters;
- preserves relevant course/source warnings and factual source evidence;
- exposes each reply's target-population contribution without inventing ranked cumulative coverage.

`USER_MOVE` responses remain on the RB-027 empirical persona ranking path unchanged.

## Builder presentation and selection

Opponent rows now present `Recommended` or `Optional` instead of Target Aligned/Conflict. Target-population frequency is labeled as target-population games rather than a generic play metric, and the focused brief presents preparation priority instead of repertoire fit.

The Builder keeps manual authority:

- every reply is independently selectable/removable;
- `Use recommended set` applies the deterministic recommended set without accepting it;
- the user can modify that set before acceptance;
- selected coverage is calculated from the population contributions of the replies actually selected;
- coverage copy explicitly states that this is target-population share, not theoretical completeness.

Acceptance still flows through the existing RB-009 session reducer. Each accepted opponent reply becomes its own continuation branch, preserving queue ordering, defer/reopen, ignore, stale/restart and transposition semantics.

## Setup compatibility boundary

The visible opponent-response percentage slider and persona-specific 70/80/85 coverage-default copy are removed from normal Builder setup. Coverage is no longer a setup decision for opponent preparation.

The current `RepertoireTarget.coverage` shape and route-local `RepertoireBuilderSetup.coveragePercent` field remain temporarily populated for compatibility with the existing target contract and profile-launch model. RB-029 does not read those percentages when ranking or recommending opponent replies. RB-030 owns removal or simplification of those residual compatibility fields.

## Review findings and validation

The implementation went through a dedicated PR review after the initial green integration runs.

The review found one material provenance issue: accepted opponent decisions retained the underlying Candidate Ranking policy version but did not explicitly snapshot which opponent-preparation policy had produced the recommended set. The fix keeps the two concepts separate and records `opponentPreparationPolicy=2026-08-opponent-preparation-v1` in the Builder evidence reference for opponent decisions. A focused web test now verifies that provenance.

Validation includes:

- domain tests for common, dangerous-uncommon, personally encountered, long-tail, selected-coverage and course-context behavior;
- Candidate Decision projection coverage for opponent ordering/reasons, target/profile semantic removal, warning cleanup and non-cumulative coverage;
- setup component coverage proving the percentage control/default copy is absent;
- existing RB-009 tests covering multi-response branch creation, queue, defer/reopen and ignore semantics;
- evidence-reference coverage for opponent preparation policy provenance.

CI #2421 validated the initial domain slice, CI #2431 the integrated API/web/setup slice, CI #2432 the opponent API projection, and CI #2435 the pre-review final implementation. PR #331 uses a final exact-head full CI run after the review fix and closure reconciliation as its squash-merge gate.

## Scope boundaries and residual work

RB-029 adds no Prisma schema or migration, MCP surface, persistence, job, queue, dependency or automatic course-write behavior. It does not replace the RB-009 reducer and does not change the RB-027 user-move persona ranking policy.

RB-030 owns residual target/setup coverage compatibility cleanup. RB-031 can consume the settled opponent preparation presentation. RB-016 remains the later real-usage validation task.
