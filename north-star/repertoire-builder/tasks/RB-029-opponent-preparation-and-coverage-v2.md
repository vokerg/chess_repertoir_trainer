# RB-029 — Opponent preparation and computed coverage V2

Status: DONE

Priority: P1

Order: 220

Delivery class: North-star decision policy and UX

Planning maturity: Corrected after post-merge audit of PR #331; corrective PR #333 exact-head closure validation required before merge

GitHub issue: #319

Claimed by: ChatGPT

Claim branch: `fix/rb-029-correctness-audit`

Claimed at: 2026-08-10

Claim scope: opponent candidate discovery/ranking authority, real course evidence, policy provenance, AI consistency, recommended default selection and computed selected coverage while preserving RB-009 reducer/queue semantics and RB-027 USER_MOVE behavior

## Objective

Reframe `OPPONENT_RESPONSE` as preparation priority: which realistic replies should this repertoire cover? Persona, target opening character, theory burden and Player Chess Profile fit do not judge opponent moves.

## Priority evidence

Preparation priority uses separated evidence centered on:

- selected peer-population frequency/relevance;
- exact-position personal encounters;
- objective danger when an uncommon reply is materially challenging;
- existing course coverage/transposition context where applicable;
- Masters as secondary evidence.

## Coverage model

Coverage is an outcome of selected replies, not a persona/setup preference.

- the normal setup percentage slider and persona-specific 70/80/85 defaults are removed from the visible flow;
- a deterministic recommended preparation set is produced from response evidence;
- recommended replies are initially selected and remain manually addable/removable/resettable;
- selected coverage is the sum of usable target-population contributions for the replies actually selected;
- selected coverage remains unavailable when no selected reply has usable target-population evidence;
- defer/ignore and separate continuation branches remain explicit;
- the UI does not claim theoretical completeness.

## Versioned policy

Policy: `2026-08-opponent-preparation-v1`

- population evidence must contain at least 20 target-population games;
- population relevance requires frequency at least the greater of 3% or 20% of the strongest observed reply at the exact position;
- at least three exact-position personal encounters independently qualify a reply for recommendation;
- mate against the repertoire side or at least 100 cp objective challenge independently qualifies a reply as dangerous;
- course coverage/transposition remains inspectable ordering context but does not independently make a low-relevance reply recommended;
- uncommon dangerous or personally repeated replies retain their factual reason and are not relabeled common;
- persona, target/profile fit, opening character and theory burden do not rank opponent replies.

## Post-merge correctness audit

PR #331 was squash-merged as `591e26f833b4dd92286c6201856320155f06aa4c` after green CI, but a deeper audit found that the implementation did not satisfy the complete authority boundary:

1. the opponent policy ran only after generic Candidate Decision seeding/ranking/final truncation, so qualifying personal/dangerous replies outside the old bounded set could never be promoted;
2. AI candidate explanation rebuilt opponent decisions through the base Candidate Decision service and bypassed the route-only opponent projection;
3. Candidate Decision hard-disabled course-position suggestions even though `CoursePositionSuggestionService` exists;
4. opponent policy provenance was manufactured in Angular from `decisionRole` instead of being returned authoritatively by the API;
5. the recommended preparation set was not initially selected as specified by the V2 plan;
6. selected replies without usable population evidence were presented as `0%` instead of unavailable coverage.

A second review of corrective PR #333 also caught an internal-discovery edge: source-discovered replies were temporarily forced through the existing assembler via `includeMoveUci`, which could incorrectly label them `MANUAL_CANDIDATE`. The correction now clears that synthetic flag unless the move is the user's actual requested inclusion and normalizes final bounded ranks to `1..N`.

## Corrected runtime boundary

Corrective PR: #333

- the canonical Builder/API/AI opponent-decision path snapshots bounded evidence providers once for each opponent position;
- candidate discovery includes stored engine lines, target population, Masters, all exact-position personal `nextMoves`, opponent-side course suggestions and an explicit manual inclusion;
- the existing Candidate Decision assembler is reused for each discovered legal move, with the captured provider snapshots replayed so external evidence is not refetched per move;
- `2026-08-opponent-preparation-v1` is applied to that expanded legal evidence universe **before** the final candidate limit;
- the API returns the opponent policy as the authoritative `rankingPolicyVersion`;
- `USER_MOVE` continues to delegate to the unchanged RB-027 `2026-08-empirical-persona-v2` path;
- real opponent-side course coverage/transposition evidence is projected without treating user-move course suggestions as opponent coverage;
- AI candidate explanation rebuilds through the same role-aware candidate-decision application path;
- the Builder trusts the API policy version rather than inventing opponent provenance client-side;
- recommended opponent replies are initially selected, but all replies remain editable and `Use recommended set` remains a reset action;
- selected coverage remains `null` when no selected target-population contribution is available;
- acceptance still flows through the existing RB-009 reducer with unchanged continuation-branch, queue, defer/reopen, ignore, stale/restart and transposition semantics.

## Compatibility boundary for RB-030

The current `RepertoireTarget.coverage` shape and route-local `RepertoireBuilderSetup.coveragePercent` field remain temporarily populated for contract compatibility. RB-029 does **not** read those percentages when ranking or recommending opponent replies, and they are no longer exposed as normal setup decisions. RB-030 owns removal/simplification of those residual compatibility fields.

## Acceptance criteria

- [x] opponent candidates are not labeled Target/Profile Aligned or Conflict;
- [x] frequency, personal encounter, danger and course-state reasons are independently inspectable;
- [x] qualifying opponent replies are discovered and ranked by the opponent policy before the final candidate limit is applied;
- [x] real existing-course context is available on opponent turns without changing USER_MOVE course/ranking behavior;
- [x] Candidate Decision returns the actual role-specific opponent-preparation policy version and AI uses the same canonical decision authority;
- [x] recommended responses are deterministic, initially selected and manually editable/resettable;
- [x] selected coverage is calculated from actual selected response contributions, clearly labeled as target-population share, and remains unavailable when no selected coverage evidence exists;
- [x] uncommon but dangerous/personal responses can be promoted without being called common;
- [x] synthetic source discovery does not masquerade as manual inclusion and bounded response ranks remain contiguous;
- [x] accepting selected responses retains current branch creation, queue and reducer semantics;
- [x] setup no longer requires a visible coverage percentage;
- [x] focused regression tests cover common, dangerous-uncommon, personal-tail discovery, course-role filtering, manual inclusion, unknown coverage, defer, ignore and selection behavior.

## Validation evidence

Historical PR #331 validation remains useful but is not accepted as closure evidence for the authority gaps above:

- CI #2421 (`31402443680`) — initial domain slice;
- CI #2431 (`31406321314`) — integrated API/web/setup slice;
- CI #2432 (`31406462746`) — route-level opponent projection test;
- CI #2435 (`31406955302`) — pre-review implementation;
- CI #2441 (`31412564060`) — original merged head; green but missing the post-merge audit cases.

Corrective validation:

- CI #2459 (`31416195815`) on corrective head `af201b56fbc6298798b55e64590abebdab31a074` — lint, build, opening audits, architecture guardrails, migrations and full tests green, including the new authority regressions;
- final exact-head CI after closure/documentation reconciliation: required before squash merge.

## Completion

Report: `../reports/RB-029-2026-08-10-opponent-preparation-closure.md`

Completed at: 2026-08-10
