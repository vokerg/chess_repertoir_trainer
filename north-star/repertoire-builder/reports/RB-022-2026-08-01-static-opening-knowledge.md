# RB-022 implementation report — Static side-aware opening knowledge

Date: 2026-08-01

Task: `RB-022`

GitHub issue: `#241`

Branch: `rb-022/issue-241-static-opening-knowledge`

Delivery class: Implementation foundation

Status: Review package

## Outcome

Implemented the RB-D046 architecture as a separate deterministic `OpeningKnowledgeService` beside opening lookup and classification.

The foundation now provides:

- an independently versioned opening-knowledge contract;
- a source/license/retrieval registry;
- ordered family, subfamily and line knowledge rules;
- independent White and Black strategic summaries and plans;
- stable plan IDs with merge, same-ID replacement, explicit removal and full side replacement;
- reviewed lifecycle filtering;
- explicit `AVAILABLE`, `PARTIAL` and `UNAVAILABLE` results;
- deterministic validation for selectors, references, content, sources and authorship;
- generated-book and imported-game-weighted audits;
- regression coverage over representative branches and every generated opening-book row.

No database, background job, runtime LLM/web call, public API, Angular/mobile UI, ranking change or course write was added.

## Runtime shape

`OpeningKnowledgeService.resolve(entry, classification)` consumes the resolved `OpeningBookEntry` and current `OpeningClassificationResult`.

The result preserves:

- knowledge and classification versions;
- concise and longer descriptions;
- independent White/Black summaries and plans;
- matched classification and knowledge rule IDs;
- final referenced sources;
- explicit availability status.

Only `REVIEWED` rules participate in normal runtime resolution. Draft and deprecated records remain valid registry data but do not leak into the result.

## Registry and validation

The validator rejects:

- duplicate source or knowledge-rule IDs;
- duplicate plan IDs within one side patch;
- empty IDs, prose, titles, summaries, conditions, caveats or rationales;
- unknown classification rule references;
- missing source references;
- reviewed text without project-original authorship provenance;
- unsupported licenses or lifecycle/confidence values;
- global or sticky regular expressions;
- malformed UCI prefixes;
- contradictory removal and addition of one plan ID in the same patch.

Reviewed statements and plans retain confidence and source IDs. Runtime sources are projected from the final merged content rather than every rule that happened to match.

## Merge semantics verified

- Later descriptions and side summaries replace earlier scalar values.
- `MERGE` preserves inherited plans, appends new IDs and replaces a same-ID plan in place.
- `removePlanIds` removes inherited plans explicitly.
- `REPLACE` clears inherited plans for one side before applying the narrow rule.

The corpus exercises:

- French Exchange full replacement of closed-chain plans;
- Najdorf Poisoned Pawn full replacement of generic Najdorf plans;
- Benko Declined replacement of accepted-gambit open-file assumptions;
- English/Réti shared transposition plans;
- Najdorf English Attack and Poisoned Pawn knowledge-only name selectors;
- Evans and Benko offerer/acceptor side asymmetry.

## Initial reviewed corpus

The first version contains 25 ordered reviewed rules covering:

- English and Réti, including shared transposition discipline;
- Sicilian, Najdorf, English Attack and Poisoned Pawn;
- French and French Exchange;
- Caro-Kann;
- London;
- Queen’s Gambit, QGD and QGA;
- King’s Indian;
- Grünfeld;
- Evans Gambit and Evans Gambit Accepted;
- Benko family, Accepted and Declined;
- Catalan, Slav, Nimzo-Indian and Queen’s Indian.

Coverage is intentionally partial. The service does not synthesize fallback plans from classification tags.

## Audits

New commands:

```sh
npm run opening-book:knowledge-audit --workspace=apps/api
npm run opening-book:knowledge-game-audit --workspace=apps/api
```

The generated audit processes all pinned opening-book rows and reports status coverage, unique-name coverage, rule/source usage, unused rules and an unavailable-family backlog.

The database-backed audit weights the same availability states by existing imported-game opening metadata and reports the highest-volume unavailable families separately from classification coverage.

CI publishes both reports as independent artifacts.

## Validation status

The branch includes build-time TypeScript validation, focused Node regression tests and all-row generated-book processing. Exact CI run and final audit counts are recorded on the pull request once GitHub Actions completes.

## Follow-on boundary

RB-023 may consume this reviewed knowledge as explanatory candidate evidence only. It must not alter ranking, eligibility, fit, coverage, session state or course writes.

RB-024 may use supplied user-side knowledge as optional game-review grounding. It must not research openings at runtime, invent authoritative plans or mutate deterministic analysis.
