# RB-027 — Empirical persona ranking V2

Status: DONE

Priority: P0

Order: 200

Delivery class: North-star ranking policy

Planning maturity: Implemented and validated; future calibration requires a new ranking-policy version

GitHub issue: #317

Claimed by: vokerg

Claim branch: `rb-027/empirical-persona-ranking-v2`

Claimed at: 2026-08-09

Claim scope: empirical `USER_MOVE` persona ranking V2 and required Candidate Decision V3 evidence semantics

## Objective

Rebuild `USER_MOVE` ranking around empirical target-population, Masters and engine evidence. Preserve four personas, but make them versioned ranking policies rather than aliases for static opening-classification traits.

## Locked product semantics

- **Balanced** — practical peer-tested choices; target-population evidence is primary, while Masters and engine evidence validate that practicality.
- **Solid** — established and dependable choices; Masters and objective quality carry more authority than in Balanced.
- **Aggressive** — active/imbalanced choices with strong practical results and meaningful Master justification; bounded extra objective cost is acceptable.
- **Surprise** — uncommon but viable choices that materially overperform the normal result from the same position in the selected population; rarity, sample sufficiency, low Master frequency and objective safety are explicit.

Persona applies only when the repertoire side is choosing a move. It does not rank opponent replies.

Opening classification and reviewed opening knowledge remain explanatory context. Player Chess Profile fit is not a V2 persona-ranking input.

## Implemented calibration

- target-population performance is measured against the exact-position target-side baseline rather than a fixed 50% score;
- empirical preset population evidence requires at least 20 games and Masters evidence requires at least 10 games;
- Surprise rarity contributes only when selected-population performance beats the position baseline by at least 3 percentage points;
- bounded candidate discovery keeps the public result compact while allowing a wider selected-population seed set for Surprise;
- objective evidence is limited to usable already-stored legal engine roots at depth at least 12, with no on-demand or unbounded engine workflow;
- contradictory explicit root/PV pairs and illegal/duplicate roots cannot poison objective authority.

The exact versioned weights and objective guardrails are recorded in the closure report and implementation tests.

## In scope

- versioned ranking-policy update;
- contract/reason/component updates needed to express peer baseline delta, rarity, Master support and objective guardrails;
- bounded candidate discovery adjustments required by Surprise;
- persona-specific deterministic ranking and eligibility semantics;
- benchmark fixtures and focused domain/API tests;
- migration of current `targetFit/profileFit` ranking authority where required.

## Out of scope

- UI redesign beyond contract-driven compatibility changes;
- opponent-response selection policy;
- personal-history presentation;
- new opening-knowledge content;
- LLM ranking;
- automatic course writes, persistence, jobs or unbounded engine work.

## Dependencies

RB-001/RB-007/RB-010 foundations are complete. RB-028 can consume the stabilized Candidate Decision V3 corpus semantics. RB-029 still owns opponent-response policy, and RB-031 depends on the final evidence semantics completed here.

## Acceptance criteria

- [x] four personas produce meaningfully different, understandable orderings on benchmark positions;
- [x] Balanced is peer-practical rather than engine-first;
- [x] Solid is materially more Master/objective conservative;
- [x] Aggressive is distinguishable from Surprise through stronger mainstream/Master justification and less dependence on rarity;
- [x] Surprise is driven by rarity plus peer overperformance with sample and engine safeguards, not a static `SURPRISE` label;
- [x] opening classification/knowledge are not the primary ranking mechanism;
- [x] no Player Chess Profile fit component is required to rank V2 user moves;
- [x] public explanations expose dominant evidence without publishing fake precision;
- [x] manual legal candidates use the same policy;
- [x] tests cover sparse, rare, common, Master-supported, engine-costly and missing-evidence cases;
- [x] build/lint/architecture validation is recorded.

## Completion

Runtime PR: #325

Runtime squash: `34dadd251d4310f427cc60b466158c132823e398`

Completion reconciliation PR: #330

Final runtime CI: #2392 (`31383710305`) — green

Report: `north-star/repertoire-builder/reports/RB-027-2026-08-10-empirical-persona-ranking-v2-closure.md`

Completed at: 2026-08-10
