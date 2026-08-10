# RB-029 Closure — Opponent Preparation and Computed Coverage V2

**Task:** RB-029  
**Issue:** #319  
**Original runtime PR:** #331  
**Original squash merge:** `591e26f833b4dd92286c6201856320155f06aa4c`  
**Corrective PR:** #333  
**Opponent preparation policy:** `2026-08-opponent-preparation-v1`  
**Candidate Decision contract:** `2026-08-v4`  
**USER_MOVE ranking policy:** `2026-08-empirical-persona-v2`  
**Corrective functional CI:** #2459 (`31416195815`) — green  
**Closed:** 2026-08-10 after corrective squash merge

## Delivered product semantics

RB-029 makes `OPPONENT_RESPONSE` answer one preparation question: which realistic opponent replies are important enough that the repertoire should prepare for them?

The policy deliberately separates opponent preparation from repertoire persona. `Balanced`, `Solid`, `Aggressive`, `Surprise`, target opening character, target/profile fit and theory burden do not decide whether an opponent reply matters.

A reply is recommended when at least one independent preparation signal qualifies it:

- meaningful target-population frequency at the exact position;
- repeated exact-position personal encounters;
- objective danger to the repertoire side.

Existing-course coverage/transposition remains inspectable context and ordering evidence without independently converting an irrelevant long-tail reply into a recommendation. Masters remains secondary evidence.

## Versioned recommendation policy

`2026-08-opponent-preparation-v1` uses deterministic thresholds:

- target-population evidence requires at least 20 games;
- population relevance requires frequency at least the greater of 3% or 20% of the strongest observed reply at the exact position;
- at least 3 exact-position personal encounters independently qualify a reply;
- forced mate against the repertoire side or at least 100 cp objective challenge independently qualifies a reply as dangerous.

Recommended replies precede optional replies. Within those groups, deterministic population, personal, danger and course-state signals establish priority, with UCI order as the stable final tie-breaker. An uncommon dangerous or personally repeated reply keeps that factual reason and is not mislabeled `COMMON_AT_TARGET_LEVEL`.

## Why the original closure was reopened

PR #331 initially passed its exact-head CI and was squash-merged. A later deeper audit found that green tests had missed several authority-boundary defects. Issue #319 and the repository task were therefore reopened rather than treating the first merge as valid closure.

The audit found six material gaps:

1. **Preparation ran after truncation.** Generic Candidate Decision first seeded/ranked/bounded candidates and only then passed them to the opponent policy. A qualifying personal or dangerous reply outside that earlier set was invisible and could never be promoted.
2. **AI bypassed RB-029.** Candidate explanation rebuilt evidence through the base `CandidateDecisionService`, so an opponent explanation could use a different ranking authority than the Builder UI/API.
3. **Course context was not real.** Candidate Decision used a disabled course provider even though `CoursePositionSuggestionService` existed, so RB-029's claimed course context was not actually supplied at runtime.
4. **Policy provenance was invented in Angular.** The API still returned the empirical USER_MOVE ranking version while the browser stamped an opponent-policy source-version merely from `decisionRole`.
5. **The recommended set was not the default checked set.** The V2 plan specified checked recommended opponent replies that the user could edit; the first implementation started empty and required a reset button click.
6. **Unknown coverage was shown as zero.** Selected replies with no usable target-population contribution produced `0%`, which falsely implied measured zero coverage rather than unavailable evidence.

A second review of corrective PR #333 caught another edge before merge: source-discovered moves are forced through the existing assembler using an internal `includeMoveUci`. Without correction that synthetic mechanism could mark a discovered personal/course reply as `MANUAL_CANDIDATE`. The final correction distinguishes internal discovery from the user's actual manual inclusion and normalizes the final bounded response ranks to `1..N`.

## Corrected Candidate Decision authority

Corrective PR #333 keeps the existing Candidate Decision evidence assembler and makes the canonical opponent-decision application path authoritative **before** final truncation.

For `OPPONENT_RESPONSE` it:

1. validates the position/role using the same base-service error boundary;
2. snapshots the existing bounded providers once: stored engine, Masters, selected target population, exact-position personal history, Player Chess Profile and real course-position suggestions;
3. builds a source-discovery move universe from engine lines, population moves, Masters moves, all returned personal `nextMoves`, opponent-side course suggestions and any explicit manual inclusion;
4. reuses `createCandidateDecisionService` with captured provider snapshots to assemble complete existing candidate evidence for each discovered legal move without repeatedly fetching external evidence;
5. projects real opponent-side course coverage/transposition evidence, ignoring user-move course suggestions as opponent coverage;
6. applies `2026-08-opponent-preparation-v1` to the expanded legal evidence universe;
7. only then applies the requested final candidate limit;
8. returns the opponent policy itself as the authoritative `rankingPolicyVersion`.

`USER_MOVE` delegates to the existing RB-027 `2026-08-empirical-persona-v2` Candidate Decision path unchanged.

The opponent projection clears target/profile fit authority and target/theory warnings from opponent decisions. Existing compatibility component fields remain schema-compatible, while deterministic opponent rank/reasons and raw evidence are authoritative.

## AI consistency

Builder candidate explanation now rebuilds deterministic evidence through the same role-aware candidate-decision application path as the Builder API. Its stale-identity check therefore compares against the actual role-specific policy version.

The AI fact projection was re-inspected during the corrective review. It does not expose generic ranking component scores; it exposes authoritative rank, reason codes and bounded raw evidence such as population, Masters, engine, personal, course and selected coverage facts. Generated text therefore cannot silently inherit the old opponent ranking components as ranking authority.

`docs/ai-widgets.md` is reconciled to describe this role-aware decision path.

## Builder selection and coverage

Opponent rows present `Recommended` or `Optional`, never Target/Profile Aligned/Conflict as opponent recommendation concepts.

When an opponent decision loads:

- all replies recommended by the shared domain policy are checked immediately;
- the user can independently add or remove any displayed reply;
- `Use recommended set` remains a reset convenience after edits rather than the only way to apply the recommendation;
- accepting replies still goes through the existing RB-009 reducer and creates independent continuation branches;
- defer/reopen, ignore, queue ordering, stale/restart and transposition semantics remain unchanged.

Selected coverage is computed from the usable target-population contributions of the replies actually selected. It is explicitly described as target-population share, not theoretical completeness. If selected replies have no usable population contribution, coverage remains unavailable (`null` / `—`) rather than being fabricated as `0%`.

## Course evidence boundary

The correction consumes `CoursePositionSuggestionService.listForFen` only on the opponent preparation path. Suggestions are filtered to `isUserMove === false` before they can count as opponent coverage or transposition context.

This intentionally does not re-enable the base Candidate Decision course provider for USER_MOVE and therefore does not alter RB-027 ranking/course semantics as part of RB-029.

## Contract and provenance

Candidate Decision remains contract `2026-08-v4`; the wire shape does not gain a new structural field. Its `rankingPolicyVersion` discriminator now accepts both role-specific authorities:

- `2026-08-empirical-persona-v2` for USER_MOVE;
- `2026-08-opponent-preparation-v1` for OPPONENT_RESPONSE.

Builder evidence snapshots the API's actual `rankingPolicyVersion` directly. Angular no longer manufactures an `opponentPreparationPolicy` source version from role.

## Regression coverage

The corrective test suite specifically covers failures the first green PR missed:

- a sixth exact-position personal reply outside the old `PERSONAL_SEED_LIMIT=5` and generic final top-six still enters the final opponent recommendation set when its personal encounter signal qualifies it;
- source-discovered personal/course replies do not become synthetic `MANUAL_CANDIDATE`s;
- a real explicit manual move remains included and is marked manual;
- bounded ranks remain contiguous after explicit manual inclusion replaces a lower-priority candidate;
- opponent-only course suggestions count as opponent coverage while user-move course suggestions do not;
- API returns the opponent preparation policy version;
- the policy-version contract accepts both USER_MOVE and opponent role-specific versions and rejects unknown versions;
- Builder recommended replies are initially selected;
- optional replies can still be manually added;
- selected coverage sums actual selected contributions;
- recommended replies with no population contribution produce unavailable coverage rather than zero;
- existing domain tests retain common, dangerous-uncommon, personal, long-tail and course-context policy coverage;
- existing RB-009 tests retain multi-response branch creation, queue, defer/reopen and ignore coverage.

## Validation

The first implementation's CI history is retained only as historical evidence: #2421, #2431, #2432, #2435 and the original merge-gate #2441 were green but did not exercise the authority defects above.

Corrective validation:

- corrective head `af201b56fbc6298798b55e64590abebdab31a074` passed full CI #2459 (`31416195815`): lint, TypeScript build, opening classification/knowledge audits, architecture guardrails, database migrations, imported-game audits, complete tests and trap validation all green;
- closure/documentation reconciliation intentionally creates a newer PR head, which must pass another full exact-head CI before PR #333 is squash-merged.

## Scope boundaries and residual work

RB-029 introduces no Prisma schema/migration, MCP surface, persistence, background job, queue model, dependency or automatic course-write behavior. A repository search found no MCP Candidate Decision consumer requiring corrective wiring.

RB-029 does not replace the RB-009 reducer and does not change RB-027 USER_MOVE ranking policy.

The current `RepertoireTarget.coverage` and route-local `RepertoireBuilderSetup.coveragePercent` compatibility fields remain populated but are not used by opponent recommendation policy and are no longer visible as normal opponent-coverage decisions. RB-030 owns their removal/simplification.

RB-031 can consume the now-corrected opponent presentation hierarchy. RB-016 remains the later real-usage validation task.
