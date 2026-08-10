# RB-029 — Opponent preparation and computed coverage V2

Status: IN_PROGRESS

Priority: P1

Order: 220

Delivery class: North-star decision policy and UX

Planning maturity: Runtime implementation on draft PR #331; exact-head validation pending

GitHub issue: #319

Claimed by: ChatGPT

Claim branch: `repertoire-builder/rb-029-opponent-preparation`

Claimed at: 2026-08-10

Claim scope: opponent preparation policy, computed selected coverage, Candidate Decision integration and Builder presentation while preserving RB-009 reducer/queue semantics

## Objective

Reframe `OPPONENT_RESPONSE` as preparation priority: which realistic replies should this repertoire cover? Persona, target opening character, theory burden and Player Chess Profile fit do not judge opponent moves.

## Priority evidence

Use separated evidence centered on:

- selected peer-population frequency/relevance;
- exact-position personal encounters;
- objective danger when an uncommon reply is materially challenging;
- existing course coverage/gaps where applicable;
- Masters as secondary context where useful.

## Coverage model

Coverage is an outcome of selected replies, not a persona/setup preference.

- remove the normal setup percentage slider and persona-specific 70/80/85 defaults;
- produce a deterministic recommended preparation set from response evidence;
- show the cumulative selected share of target-population games as feedback;
- keep every response manually addable/removable;
- preserve explicit defer/ignore and separate continuation branches;
- do not claim theoretical completeness.

The recommended-set stopping rule must be versioned and tested. It must not simply conceal the old fixed percentages under new copy.

## Implemented runtime semantics

Draft PR: #331

Policy: `2026-08-opponent-preparation-v1`

- opponent replies are ranked by an opponent-only domain policy rather than persona/target/profile fit;
- population relevance requires at least 20 target-population games and frequency at least the greater of 3% or 20% of the strongest observed reply at the exact position;
- at least three exact-position personal encounters independently qualify a reply for recommendation;
- mate against the repertoire side or at least 100 cp objective challenge independently qualifies a reply as dangerous;
- course coverage/transposition/conflict remains inspectable context and a deterministic tie-breaker, but does not by itself make a low-relevance reply recommended;
- uncommon dangerous or personally repeated replies are recommended with their factual reason and are not relabeled common;
- Candidate Decision removes target/profile fit reason authority and target/theory warnings from opponent decisions while preserving relevant course/source warnings;
- candidate coverage carries only each reply's target-population contribution; ranked cumulative coverage is deliberately absent;
- the Builder computes selected target-population share from the replies actually selected, with explicit non-theoretical-completeness copy;
- every reply remains independently selectable/removable, and `Use recommended set` applies the deterministic recommendation without automatic acceptance;
- accepting selections continues through the existing RB-009 reducer, producing independent continuation branches with unchanged queue/defer/ignore semantics;
- the normal setup no longer displays a coverage percentage or persona-specific coverage default.

## Compatibility boundary for RB-030

The current `RepertoireTarget.coverage` shape and route-local `RepertoireBuilderSetup.coveragePercent` field remain temporarily populated for contract compatibility. RB-029 does **not** read those percentages when ranking or recommending opponent replies, and they are no longer exposed as normal setup decisions. RB-030 owns removal/simplification of the residual setup/target compatibility fields after this policy is integrated.

## In scope

- opponent ranking/reasons and response-set recommendation;
- contract cleanup needed to remove irrelevant target/profile fit from opponent decisions;
- computed coverage presentation semantics;
- reuse of current RB-009 multi-selection/branch queue;
- focused domain/API/web tests.

## Out of scope

- user-move persona ranking;
- automatic response acceptance or full-tree generation;
- persistence, jobs, new queue model or course-write changes.

## Dependencies

Coordinate shared candidate-contract work with RB-027. RB-031 consumes the final opponent presentation. RB-030 removes setup controls after target-policy compatibility is settled.

## Acceptance criteria

- opponent candidates are not labeled Target/Profile Aligned or Conflict;
- frequency, personal encounter, danger and course-state reasons are independently inspectable;
- recommended responses are deterministic and editable;
- selected coverage is calculated from actual selected response contributions and clearly labeled as target-population share;
- uncommon but dangerous/personal responses can be promoted without being called common;
- accepting selected responses retains current branch creation, queue and reducer semantics;
- setup no longer requires a coverage percentage;
- tests cover common, dangerous-uncommon, personally encountered, sparse, defer, ignore and selection cases.

## Validation evidence

- initial domain-policy slice: CI #2421 (`31402443680`) passed on head `6fdd9184b011af69a9ee63cb9aae1a125d5a0df5`;
- exact-head full CI: pending for the final PR head.

## Completion

Report: none

Completed at: none
