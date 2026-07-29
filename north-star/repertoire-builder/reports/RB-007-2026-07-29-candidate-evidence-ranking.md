# RB-007 candidate evidence and ranking report

Date: 2026-07-29

Status: implemented for review

Task: RB-007

GitHub issue: #95

Branch: `rb-007/issue-95-candidate-evidence-ranking`

Claim pull request: #164

Implementation pull request: #166

## Purpose

Produce one bounded, deterministic and explainable candidate decision for a legal chess position and an RB-006 repertoire target without reducing engine, corpus, personal, profile and course evidence to one opaque recommendation.

The implementation supports two explicit decision roles:

- `USER_MOVE` — prefer one repertoire move for the target side;
- `OPPONENT_RESPONSE` — prioritize responses that require coverage because they are common, personally encountered or objectively dangerous.

## Delivered scope

### Shared contract

`@chess-trainer/contracts/candidate-decision` adds:

- contract version `2026-07-v1`;
- deterministic ranking policy version `2026-07-deterministic-v1`;
- a request containing FEN, decision role, complete RB-006 target, optional manual move and bounded candidate limit;
- canonical position and legal-move metadata;
- separate engine, Masters, selected-population, personal, opening, course and player-profile evidence;
- explicit `AVAILABLE`, `STALE`, `INSUFFICIENT` and `UNAVAILABLE` source states;
- eligibility, target fit, profile fit, stable reason codes and stable warning codes;
- inspectable ranking components without publishing one opaque aggregate score;
- bounded preview lines, course references and profile matches;
- opponent coverage contribution and cumulative coverage;
- typed invalid-FEN, role-mismatch and illegal-manual-move errors.

### Pure ranking policy

`chess-domain` now owns the pure deterministic policy. It has no Fastify, Prisma, provider or contract-package dependency.

The policy:

- orients engine evidence to the repertoire target side;
- handles mate evidence before centipawn evidence;
- treats user selection and opponent coverage as separate ranking problems;
- varies user-move weights by RB-001 speed preset;
- uses selected-population frequency/results, Masters practice, personal familiarity/results, target fit, profile fit and existing course coverage as separate components;
- keeps legal manual candidates visible even if excluded or outside the initial bounded seed set;
- applies stable UCI tie-breaking;
- emits stable reasons and warnings independently from ordering.

### API service and route

The transport-independent service is exposed through authenticated:

`POST /api/candidate-decisions`

The Fastify route performs authentication, schema validation and typed error mapping only. The service owns canonicalization, evidence orchestration, candidate assembly, ranking and response validation.

All evidence boundaries are injectable for focused tests. The default adapters reuse:

- stored position MultiPV analysis;
- cached Lichess Masters explorer;
- cached Lichess Games explorer;
- RB-006 peer-resolution snapshot injection for reproducible selected populations;
- personal opening-analysis next moves and results;
- side-aware opening lookup/classification;
- Player Chess Profile preference/performance evidence;
- owned course position suggestions.

No database migration, new persistence model, background job, live LLM call or course mutation was added.

## Candidate boundedness

V1 uses these hard bounds:

- stored engine lines: 3;
- selected-population move seeds: 8;
- Masters move seeds: 5;
- personal move seeds: 5;
- course move seeds: 8;
- public candidate limit: default 6, maximum 8;
- preview line: 8 UCI moves;
- course references per candidate: 3;
- profile matches per candidate: 5.

The candidate seed union is legal-move filtered before evidence assembly. When all evidence providers are unavailable, the service returns a deterministic legal fallback rather than fabricating evidence.

An optional legal `includeMoveUci` is always retained in the bounded response, replacing the last normal result when necessary. An illegal requested move returns a typed error.

## Source semantics

### Engine

V1 consumes existing stored MultiPV only. It does not synchronously launch unbounded engine work.

- minimum accepted depth: 12;
- shallower lines remain visible with `INSUFFICIENT` and `LOW_ENGINE_DEPTH`;
- scores and mates are oriented to the repertoire target side;
- user-move objective delta is measured from the best target-side stored line;
- opponent-response danger uses the same target-side baseline, so lower target outcomes receive a larger danger delta;
- a forced mate against the target is always an explicit exclusion for `USER_MOVE`.

### Masters and selected population

Both reuse existing cached explorer services and retain:

- sample size;
- move frequency;
- target-side score percentage;
- average rating;
- dataset/profile version;
- fetch timestamp;
- representative game ID where available.

The selected-population adapter reuses the immutable RB-006 peer snapshot through the explorer's injected resolver boundary. It does not recalculate or persist a second player-level formula.

Population sufficiency uses `target.coverage.minimumPopulationGames`. Masters candidate support uses a minimum of 10 games.

### Personal games

Personal next-move evidence retains occurrences, games and score percentage under target account, side, rated-status and speed filters.

A move requires at least three personal games or encounters before familiarity contributes to ranking. Smaller samples remain visible as `INSUFFICIENT` and do not produce a personal-fit conclusion.

### Opening and target fit

Candidate resulting positions are classified through the existing opening book. When an exact resulting-FEN entry is unavailable, the service may use the explorer's opening name/ECO hint and the same deterministic classification rules.

Target fit compares the candidate's classified side against explicit RB-006 objective fields:

- preferred opening characters;
- minimum soundness;
- maximum theory burden.

The persona label itself is not scored as a hidden rule. RB-006 already defines explicit objective fields as authoritative; a future persona change affects ranking only through changed explicit target values.

### Player-profile fit

Player-profile fit is independent from target fit.

A candidate matches profile dimensions by character, soundness, theoretical status, theory burden and role. Preference evidence requires at least five games. Performance support or warning requires at least five games, `MEDIUM` or `HIGH` evidence strength, and a score delta of at least positive or negative five percentage points.

A selected target can therefore remain aligned while the profile warns against the same candidate. Profile evidence never invalidates explicit user intent by itself.

### Course coverage

Owned course suggestions expose exact move coverage, conflict and bounded course/chapter/line references.

V1 transposition detection is intentionally narrow: it identifies another move suggestion from the same current position whose resulting normalized FEN matches the candidate. It does not yet traverse the complete repertoire graph to discover arbitrary downstream transpositions.

## Ranking policy

### Public versus internal score

The response exposes seven signed component contributions:

- objective;
- selected population;
- Masters;
- personal;
- target fit;
- profile fit;
- course.

The weighted aggregate is internal ordering machinery and is intentionally omitted from the public contract. This prevents the UI from presenting one synthetic precision number while retaining reproducibility through policy version, components, reasons and documented weights.

### User-move weights

| Speed preset | Objective | Population | Masters | Personal | Target fit | Profile fit | Course |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `ALL` | 35% | 20% | 15% | 10% | 12% | 3% | 5% |
| `BLITZ_AND_SLOWER` | 40% | 18% | 17% | 8% | 12% | 2% | 3% |
| `BLITZ` | 30% | 25% | 10% | 12% | 13% | 4% | 6% |
| `BULLET` | 20% | 35% | 5% | 18% | 12% | 5% | 5% |

This is deliberately simple and versioned. Slower targets emphasize objective and Masters evidence; faster targets emphasize selected-population and personal practical evidence.

### Opponent-response weights

Opponent coverage uses one separate policy:

- objective danger: 20%;
- selected-population relevance: 45%;
- Masters relevance: 5%;
- personal encounters: 20%;
- existing course coverage/gap: 10%.

Target-fit and profile-fit components remain visible facts but do not control opponent response priority.

### Objective eligibility thresholds

For normal user-move targets:

| Risk tolerance | Warning | Exclusion |
| --- | ---: | ---: |
| `LOW` | 80 cp | 180 cp |
| `MEDIUM` | 140 cp | 300 cp |
| `HIGH` | 220 cp | 450 cp |

When `allowDeliberatelyDubious` is explicitly enabled, the warning threshold becomes 250 cp and exclusion becomes 700 cp. Objective cost remains visible. Forced mate against the target remains excluded.

Opening soundness, theory mismatch and course conflict produce target/conflict warnings; they are not treated as mathematically certain hard exclusions.

## Reason taxonomy

### Objective

- `ENGINE_BEST`
- `ENGINE_CLOSE`
- `OBJECTIVE_COST`
- `DANGEROUS_RESPONSE`

### Corpus and personal relevance

- `POPULATION_COMMON`
- `POPULATION_STRONG_SCORE`
- `MASTER_SUPPORTED`
- `PERSONALLY_FAMILIAR`
- `PERSONAL_RESULTS_POSITIVE`
- `COMMON_AT_TARGET_LEVEL`
- `PERSONALLY_ENCOUNTERED`

### Target and profile

- `TARGET_CHARACTER_MATCH`
- `TARGET_THEORY_MATCH`
- `TARGET_SOUNDNESS_CONFLICT`
- `TARGET_THEORY_EXCEEDED`
- `PROFILE_PREFERENCE_MATCH`
- `PROFILE_PERFORMANCE_SUPPORT`
- `PROFILE_PERFORMANCE_WARNING`

### Course and evidence quality

- `COURSE_ALREADY_COVERS`
- `COURSE_CONFLICT`
- `TRANSPOSES_TO_COVERAGE`
- `LOW_EVIDENCE`
- `MANUAL_CANDIDATE`

Warnings separately identify forced mate, objective loss, low engine depth, soundness/theory mismatch, sparse personal evidence, course conflict and unavailable primary sources.

## Validation performed

Implementation-head CI run `30420827852` / #1281 passed:

- root lint;
- root build;
- opening-classification audit and artifact upload;
- architecture guardrails;
- database migrations;
- imported-game opening-classification audit and artifact upload;
- complete repository tests.

Expanded acceptance-head CI run `30421167116` / #1284 passed the same workflow after adding missing-source, target/profile-disagreement and transposition/conflict tests.

Focused coverage includes:

- contract defaults, invalid UCI and bounded component validation;
- speed-dependent reproducible ordering;
- deliberately dubious/manual candidates with objective warnings;
- sparse personal evidence without fabricated familiarity;
- stable ties;
- opponent coverage ordering and cumulative contribution;
- provider degradation to explicit unavailable/insufficient states;
- selected-target alignment alongside profile disagreement;
- exact course coverage, conflict and narrow transposition evidence;
- decision-role mismatch.

## Validation skipped

- no live Stockfish analysis benchmark because V1 intentionally consumes stored bounded MultiPV;
- no live Lichess outage test; existing explorer clients/cache tests own upstream behavior and the new service tests injected degradation;
- no Angular consumer or hands-on builder review because RB-010 owns production UI;
- no persistence, migration or ownership-specific repository test because no new persistence is introduced;
- no full repertoire-graph transposition benchmark because V1 only exposes current-position course suggestion transpositions.

## Unresolved calibration and limitations

- Engine depth 12, three lines and centipawn thresholds are V1 policy choices requiring real-builder calibration.
- Mate-distance normalization is deterministic but intentionally coarse for ordering.
- Corpus popularity and score are combined with simple bounded arithmetic rather than a statistical confidence model.
- Multi-speed targets use one selected preset; no arbitrary blended speed weights are introduced.
- `complexityTolerance` has no independent measured branch-complexity feature yet. Current target fit uses classified character, soundness and theory burden.
- Learning burden is represented by opening theory burden only; branch count, forcing-move density and memory cost are not yet calculated.
- Engine, personal, course and player-profile providers do not currently expose a shared freshness timestamp; only explorer cache staleness is explicit.
- Opening classification from a name/ECO hint may be less specific than an exact resulting-FEN match and retains existing confidence/provenance.
- Profile evidence remains correlational and cannot prove that an opening characteristic caused results.
- Course conflict is current-position evidence, not a write plan.
- No traps source is consumed. RB-017 remains independent until it produces accepted production evidence semantics.

Any threshold or weighting change must increment `CANDIDATE_RANKING_POLICY_VERSION` and update focused tests and this report.

## RB-009 impact

RB-009 can now define session and history semantics against stable fields:

- target ID and versioned target input;
- decision role;
- policy version;
- ordered candidate identities and resulting FENs;
- reason/warning codes;
- selected, manual and eligibility state;
- opponent coverage contribution;
- source availability and evidence snapshots.

RB-009 still owns target snapshot persistence, candidate recalculation/invalidation, branch queue, selected/deferred/ignored/completed response state, draft lifecycle and resume behavior.

A source refresh or policy-version change must be treated as potential candidate staleness rather than silently rewriting prior decisions.

## RB-010 and visual impact

The accepted RB-008 board-first workbench can consume the response without additional ranking invention:

- candidate switcher: rank, move, resulting FEN and preview;
- evidence panel: objective, population, Masters, personal, theory/opening and course sections;
- explicit target/profile disagreement;
- source availability/staleness badges;
- objective and target warnings;
- opponent response queue with contribution and cumulative coverage;
- manual comparison that remains visible even when excluded.

The UI should not display or reconstruct the internal aggregate score. It should present components, reasons, warnings and source facts.

## Standalone and North Star impact

The authenticated endpoint has standalone analytical value, but no user-facing route is added in RB-007.

North Star uncertainty is materially reduced:

- candidate semantics are versioned and shared;
- legal boundedness is explicit;
- selected intent, factual profile and corpus evidence remain separate;
- risky choices remain inspectable rather than silently removed;
- opponent coverage is a first-class role;
- RB-009/RB-010 have concrete data responsibilities.

## Queue and GitHub impact

- Issue #95 and PR #166 remain open for user review and accepted integration.
- Claim PR #164 remains a coordination artifact and should close when the implementation path is accepted.
- RB-007 moves from `READY` to `REVIEW`.
- RB-009 remains `BLOCKED` until RB-007 is accepted; its implementation scope is now sufficiently concrete for detailed planning.
- RB-010 remains blocked on RB-009 and accepted RB-007 integration.
- No new RB task, issue, priority change or roadmap resequencing is required.
