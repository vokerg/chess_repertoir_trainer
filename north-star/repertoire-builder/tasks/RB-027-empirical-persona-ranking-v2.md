# RB-027 — Empirical persona ranking V2

Status: READY

Priority: P0

Order: 200

Delivery class: North-star ranking policy

Planning maturity: Agreed product semantics; calibration required before final weights

GitHub issue: #317

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Objective

Rebuild `USER_MOVE` ranking around empirical target-population, Masters and engine evidence. Preserve four personas, but make them versioned ranking policies rather than aliases for static opening-classification traits.

## Locked product semantics

- **Balanced** — practical peer-tested choices; target-population evidence is primary, while Masters and engine evidence validate that practicality.
- **Solid** — established and dependable choices; Masters and objective quality carry more authority than in Balanced.
- **Aggressive** — active/imbalanced choices with strong practical results and meaningful Master justification; bounded extra objective cost is acceptable.
- **Surprise** — uncommon but viable choices that materially overperform the normal result from the same position in the selected population; rarity, sample sufficiency, low Master frequency and objective safety are explicit.

Persona applies only when the repertoire side is choosing a move. It does not rank opponent replies.

Opening classification and reviewed opening knowledge remain explanatory context. Player Chess Profile fit is not a V2 persona-ranking input.

## Required discovery before locking weights

1. Build representative deterministic benchmark positions with expected ordering for all four personas.
2. Define peer performance relative to the position baseline rather than a fixed 50% score.
3. Define sample-size treatment so tiny rare samples cannot dominate Surprise.
4. Inspect candidate seeding: an uncommon candidate must be discoverable without widening the public list into noise.
5. Inspect bounded engine evidence for uncommon candidates. Surprise must not call a move objectively acceptable when no suitable engine evidence exists.
6. Reinspect current candidate endpoint/contracts/domain ranking, Opening Explorer behavior and stored analysis before implementation.

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

RB-001/RB-007/RB-010 foundations are complete. Coordinate shared contract changes with RB-028 and RB-029. RB-031 depends on the final evidence semantics from this task.

## Acceptance criteria

- four personas produce meaningfully different, understandable orderings on benchmark positions;
- Balanced is peer-practical rather than engine-first;
- Solid is materially more Master/objective conservative;
- Aggressive is distinguishable from Surprise through stronger mainstream/Master justification and less dependence on rarity;
- Surprise is driven by rarity plus peer overperformance with sample and engine safeguards, not a static `SURPRISE` label;
- opening classification/knowledge are not the primary ranking mechanism;
- no Player Chess Profile fit component is required to rank V2 user moves;
- public explanations expose dominant evidence without publishing fake precision;
- manual legal candidates use the same policy;
- tests cover sparse, rare, common, Master-supported, engine-costly and missing-evidence cases;
- build/lint/architecture validation is recorded.

## Completion

Report: none

Completed at: none
