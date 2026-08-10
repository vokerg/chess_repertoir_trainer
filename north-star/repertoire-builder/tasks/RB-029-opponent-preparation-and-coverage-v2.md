# RB-029 — Opponent preparation and computed coverage V2

Status: IN_PROGRESS

Priority: P1

Order: 220

Delivery class: North-star decision policy and UX

Planning maturity: Corrective implementation after post-merge High-mode audit of PR #331

GitHub issue: #319

Claimed by: ChatGPT

Claim branch: `fix/rb-029-correctness-audit`

Claimed at: 2026-08-10

Claim scope: correct opponent candidate discovery/ranking authority, course evidence wiring, policy provenance, AI consistency, recommended default selection and nullable selected coverage while preserving RB-009 reducer/queue semantics and RB-027 USER_MOVE behavior

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

## Implemented policy semantics

Policy: `2026-08-opponent-preparation-v1`

- opponent replies are ranked by an opponent-only domain policy rather than persona/target/profile fit;
- population relevance requires at least 20 target-population games and frequency at least the greater of 3% or 20% of the strongest observed reply at the exact position;
- at least three exact-position personal encounters independently qualify a reply for recommendation;
- mate against the repertoire side or at least 100 cp objective challenge independently qualifies a reply as dangerous;
- course coverage/transposition remains inspectable context and deterministic ordering context, but does not by itself make a low-relevance reply recommended;
- uncommon dangerous or personally repeated replies are recommended with their factual reason and are not relabeled common;
- selected coverage is the sum of actual selected target-population contributions, not a hidden target percentage;
- normal setup no longer displays a coverage percentage or persona-specific coverage default.

## Correctness audit after PR #331

PR #331 was squash-merged as `591e26f833b4dd92286c6201856320155f06aa4c`, but a deeper post-merge audit found that the implementation did not satisfy the complete authority boundary:

1. the opponent policy was applied only after generic Candidate Decision seeding, ranking and candidate-limit truncation, so qualifying personal/dangerous replies outside that old bounded set could never be promoted;
2. AI candidate explanation rebuilt opponent decisions through `CandidateDecisionService` directly and therefore bypassed the route-only opponent post-processor;
3. Candidate Decision runtime hard-disabled course-position suggestions even though `CoursePositionSuggestionService` exists, so course context claimed by RB-029 was not actually available;
4. opponent policy provenance was stamped in the Angular evidence-reference layer from `decisionRole` instead of being returned authoritatively by Candidate Decision;
5. the recommended preparation set was exposed only through a reset button instead of being the initial checked selection described by the V2 plan;
6. selected replies with no usable population evidence were displayed as `0%` rather than unavailable coverage.

The corrective branch moves opponent preparation into the canonical Candidate Decision service before final truncation, keeps USER_MOVE behavior unchanged, uses real opponent-only course evidence, returns the actual role-specific policy version, makes every consumer use the same decision service, initializes opponent selections from the recommended set, and preserves `null` when selected coverage cannot be computed.

## Compatibility boundary for RB-030

The current `RepertoireTarget.coverage` shape and route-local `RepertoireBuilderSetup.coveragePercent` field remain temporarily populated for contract compatibility. RB-029 does **not** read those percentages when ranking or recommending opponent replies, and they are no longer exposed as normal setup decisions. RB-030 owns removal/simplification of the residual setup/target compatibility fields after this policy is integrated.

## In scope

- opponent ranking/reasons and response-set recommendation;
- contract cleanup needed to remove irrelevant target/profile fit from opponent decisions;
- computed coverage presentation semantics;
- reuse of current RB-009 multi-selection/branch queue;
- focused domain/API/web tests;
- correction of PR #331 authority/provenance gaps listed above.

## Out of scope

- user-move persona ranking;
- automatic response acceptance or full-tree generation;
- persistence, jobs, new queue model or course-write changes.

## Dependencies

RB-027 and RB-028 are complete. RB-031 consumes the final opponent presentation. RB-030 owns removal of residual setup/target coverage compatibility fields.

## Acceptance criteria

- [x] opponent candidates are not labeled Target/Profile Aligned or Conflict;
- [x] frequency, personal encounter and danger reasons are independently inspectable;
- [ ] qualifying opponent replies are discovered and ranked by the opponent policy before the final candidate limit is applied;
- [ ] real existing-course context is available on opponent turns without changing USER_MOVE course/ranking behavior;
- [ ] Candidate Decision returns the actual role-specific opponent-preparation policy version and all consumers use that canonical service;
- [ ] recommended responses are deterministic, initially selected and manually editable/resettable;
- [ ] selected coverage is calculated from actual selected response contributions, clearly labeled as target-population share, and remains unavailable when no selected coverage evidence exists;
- [x] uncommon but dangerous/personal responses can be represented without being called common;
- [x] accepting selected responses retains current branch creation, queue and reducer semantics;
- [x] setup no longer requires a coverage percentage;
- [ ] focused regression tests cover the post-merge correctness findings plus common, dangerous-uncommon, personal, sparse, defer, ignore and selection cases.

## Validation evidence

Historical PR #331 validation remains useful but is not accepted as closure evidence for the corrective task:

- CI #2421 (`31402443680`) passed the initial domain slice;
- CI #2431 (`31406321314`) passed the integrated API/web/setup slice;
- CI #2432 (`31406462746`) passed the route-level opponent projection test;
- CI #2435 (`31406955302`) passed the pre-review implementation;
- CI #2441 (`31412564060`) passed the merged PR head but did not cover the authority gaps found by the post-merge audit.

Corrective exact-head CI: pending.

## Completion

Report: `../reports/RB-029-2026-08-10-opponent-preparation-closure.md` requires corrective addendum before final closure.

Completed at: none
