# RB-025 research and tooling report — Opening knowledge coverage scale

Date: 2026-08-06

Task: `RB-025`

GitHub issue: `#290`

Coordination pull request: `#300`

Implementation pull request: `#301`

Claim branch: `rb-025/issue-290-coverage-scale-research`

Implementation branch: `rb-025/issue-290-audit-foundation`

Delivery class: Research and deterministic editorial-tooling foundation

Status: In progress; implementation is reviewable after final exact-head validation

## Purpose

The initial opening-knowledge corpus proved the ordered family/subfamily/line inheritance model with 25 reviewed rules, but it did not provide a scalable way to distinguish broad generated-book coverage, selected-side usefulness, global editorial completeness, classification uncertainty and imported-game-weighted demand.

RB-025 establishes those measurements and a repeatable bounded-batch workflow before bulk runtime prose is added.

## Delivered scope

The delivery adds:

- weighted per-side classification completeness and confidence audits;
- independent White and Black strategic-summary/plan completeness;
- description-field completeness separately from side usefulness;
- one generated/imported-game-compatible observation model;
- a versioned deterministic family-priority policy with inspectable factors;
- a validated source-controlled editorial batch-manifest format;
- explicit coverage tiers and scale targets;
- source, review, stale-content and offline AI-drafting policy;
- a first `DRAFT` implementation manifest selected from generated-book evidence;
- synchronized RB-022/RB-023/RB-024 completion metadata and RB-025 execution ownership.

No runtime opening prose or classification judgment is added in this delivery.

## Current generated-book baseline

Audit source: CI run #2165, exact implementation head `d782621a46b390084dac52dcd3cb2de9957c93c2`.

Totals:

- generated entries: 3,733;
- unique names: 3,167;
- reviewed knowledge rules: 25;
- registered runtime knowledge sources: 10.

Global knowledge status by generated entry:

- `AVAILABLE`: 1,352 — 36.2%;
- `PARTIAL`: 299 — 8.0%;
- `UNAVAILABLE`: 2,082 — 55.8%.

Global knowledge status by unique name:

- `AVAILABLE`: 1,109 — 35.0%;
- `PARTIAL`: 223 — 7.0%;
- `UNAVAILABLE`: 1,835 — 57.9%.

Description availability:

- concise description: 1,651 entries — 44.2%;
- longer description: 1,352 entries — 36.2%.

Independent side usefulness:

- White summary plus at least one plan: 1,651 entries — 44.2%;
- Black summary plus at least one plan: 1,651 entries — 44.2%;
- side-partial entries: zero in the current corpus;
- no side summary or plan: 2,082 entries — 55.8% for each side.

The difference between 44.2% side-useful and 36.2% globally available is material. Builder consumes one target side, while global `AVAILABLE` also requires the longer description and complete knowledge for both sides. Future coverage reporting must preserve both measures.

## Classification uncertainty baseline

For both White and Black:

- all five semantic dimensions present: 3,697 entries — 99.0%;
- all dimensions present at high confidence: 2,526 entries — 67.7%;
- medium confidence: 1,131 entries — 30.3%;
- low confidence: 76 entries — 2.0%.

Unknown dimensions per side:

- soundness: 36 entries — 1.0%;
- theoretical status: 16 entries — 0.4%;
- theory burden: 16 entries — 0.4%;
- roles: 17 entries — 0.5%;
- character: zero entries.

Classification match coverage was already complete. These metrics show why match coverage must not be reported as high-confidence semantic completeness.

## Generated priority backlog

The deterministic backlog groups opening names by root family and exposes:

- unavailable and partial knowledge weight;
- missing description/summary/plan fields;
- White/Black side gaps;
- unknown classification dimensions;
- low-confidence sides;
- unique-name breadth.

Largest generated families by uncovered or partial entry weight:

1. Ruy Lopez — 234 entries, 200 unique names;
2. Italian Game — 184 entries, 156 unique names; 133 unavailable and 51 partial;
3. King's Gambit Accepted — 137 entries, 128 unique names;
4. Queen's Pawn Game — 70 entries, 48 unique names, of which 63 are unavailable;
5. Dutch Defense — 68 entries, 57 unique names;
6. Semi-Slav Defense — 68 entries, 48 unique names;
7. Benoni Defense — 61 entries, 47 unique names;
8. Alekhine Defense — 56 entries, 53 unique names;
9. Indian Defense — 53 entries, 52 unique names;
10. King's Gambit Declined and Scotch Game — 53 entries each.

The score is an editorial ordering aid only. It is not candidate ranking, opening strength, theoretical importance or a runtime recommendation.

## First draft batch

Manifest: `rb-025-generated-priority-batch-001`.

Selected broad families:

- Ruy Lopez;
- Italian Game;
- Dutch Defense;
- Semi-Slav Defense;
- Benoni Defense;
- Alekhine Defense.

Planned shape:

- six broad family rules;
- ten narrow structural or tactical overrides;
- 32 generated-book regression fixtures;
- both White and Black covered by every planned rule;
- expected generated `AVAILABLE` gain: 671 entries;
- expected unique-name `AVAILABLE` gain: 561 names;
- minimum accepted gains: 600 entries and 500 unique names.

If the expected gain is achieved, global generated-entry availability would rise from 36.2% to approximately 54.2%, and unique-name availability from 35.0% to approximately 52.7%.

King's Gambit Accepted is deliberately not included despite its high generated score. Its many concrete sacrificial branches require a dedicated evidence/reviewer batch rather than one broad generic inheritance rule. Queen's Pawn Game is also deferred because it is an umbrella/transpositional label overlapping already reviewed London and other structures; selector and replacement behavior require a separate review.

The draft manifest does not add runtime prose. It records baseline, expected gains, stable planned IDs, selector intent, sources, fixtures and authority guardrails.

## Coverage targets

Initial scale milestone:

- generated entries globally available: at least 60%;
- unique names globally available: at least 50%;
- generated side-useful entries: at least 70% for each side;
- populated imported-game weight globally available: at least 80%;
- populated imported-game weight side-useful: at least 85% for each side.

Scale exit target:

- generated entries globally available: at least 80%;
- unique names globally available: at least 75%;
- generated side-useful entries: at least 85% for each side;
- populated imported-game weight globally available: at least 90%;
- populated imported-game weight side-useful: at least 92% for each side;
- imported-game-weighted unknown soundness or theoretical status: no more than 10% per side;
- imported-game-weighted low-confidence classification: no more than 15% per side.

Targets must not be reached through generic fallback prose, unsafe selector broadening or suppression of explicit unknowns.

## Imported-game-weighted evidence

The database-backed audits now emit the same side completeness, classification uncertainty and family-priority shape using grouped `ImportedGame.openingName` / `openingEco` counts.

CI's migrated test database contains zero imported games. The exact-head artifact correctly reports zero total weight and an empty priority backlog. This validates command, schema and zero-row behavior but is not evidence of real imported-game coverage.

Before the first content manifest moves from `DRAFT` to `READY_FOR_REVIEW`, the game-weighted audit should be run in a populated owner-controlled environment and its top families compared with the generated backlog. No database credentials or production data were available in this execution environment.

## Architecture decisions

### Overall and selected-side completeness remain separate

The existing public knowledge status remains unchanged. Audits add White/Black usefulness rather than changing the candidate contract in a research task.

### Classification uncertainty remains a separate backlog

Knowledge enrichment must not silently revise soundness, theoretical status, burden, roles or confidence. Any such changes require separate evidence and review because they may affect target/profile fit and candidate ranking.

### Priority policy is versioned and inspectable

Every factor and weight is returned in audit JSON. The score may order editorial work but cannot enter runtime ranking or Builder behavior.

### Batches are source-controlled and validated

A manifest records lifecycle, versions, baselines, expected gains, planned stable IDs, source references, fixtures, acceptance thresholds and reviewer identity. `REVIEWED` and `APPLIED` states require a reviewer. Fixtures in checked-in manifests must exist in the pinned generated opening book.

### Runtime remains local and deterministic

No Prisma model, migration, job, queue, endpoint, Angular store, MCP tool, runtime web request or runtime LLM request is introduced.

## Editorial and source policy

The complete workflow is documented in `docs/opening-knowledge-editorial-workflow.md`.

Key boundaries:

- the generated opening dataset supplies identity and move/position metadata, not project strategic prose;
- references support fact checking but their prose is not copied;
- reviewed runtime wording requires project-original authorship provenance;
- engine, masters and population evidence may inform separately reviewed judgments but do not generate runtime prose;
- offline AI assistance may organize notes or draft `DRAFT` wording only and is never a source or automatic publishing path;
- stale selectors, sources or contradicted plans move to `DRAFT`/`DEPRECATED` rather than remaining silently active.

## Files and architecture areas changed

Planning and program coordination:

- `north-star/repertoire-builder/README.md`;
- `north-star/repertoire-builder/TASKS.md`;
- `north-star/repertoire-builder/STATUS.md`;
- `north-star/repertoire-builder/ROADMAP.md`;
- `north-star/repertoire-builder/GITHUB_ISSUES.md`;
- `north-star/repertoire-builder/tasks/RB-025-opening-knowledge-coverage-scale.md`.

Opening-book services and tooling:

- `openingClassificationCoverageAudit.ts`;
- `openingKnowledgeCoverageAudit.ts`;
- `openingKnowledgeBatchManifest.ts`;
- `openingKnowledgeBatch.manifests.ts`;
- all four generated/imported classification and knowledge audit scripts.

Tests and documentation:

- `opening-coverage-audit.test.mjs`;
- `opening-knowledge-batch-manifest.test.mjs`;
- `docs/opening-book.md`;
- `docs/opening-knowledge-editorial-workflow.md`.

No route, shared HTTP contract, Angular component/store, MCP module, Prisma schema/migration, candidate ranking or course-write path is changed.

## Validation

First implementation head `d782621a46b390084dac52dcd3cb2de9957c93c2` passed CI run #2165:

- dependency installation;
- lint;
- complete monorepo build;
- generated opening classification audit;
- generated opening knowledge audit;
- architecture guardrails;
- complete database migration chain;
- imported-game classification audit;
- imported-game knowledge audit;
- complete repository test suite;
- audit/report artifact upload and cleanup.

Final exact-head validation is required after the editorial manifest, fixture validation, documentation and report commits.

## Limitations and residual risks

- Populated imported-game-weighted results remain unavailable in CI.
- The first batch is `DRAFT`; its strategic claims and family-specific sources are not yet reviewed.
- Generated-family breadth can overvalue many obscure named branches relative to real player demand, which is why populated weighting is required before review promotion.
- Broad Ruy Lopez and Italian inheritance needs careful narrow exceptions to avoid flattening materially different structures.
- The current side-availability symmetry reflects the initial rule-writing pattern, not a guarantee that future White/Black gaps remain equal.
- Priority weights are editorial policy and may need revision after two or three applied batches; changes require a new policy version.

## Standalone product and north-star impact

The Builder already displays opening knowledge in focused evidence. Better coverage therefore improves immediate explanatory value without changing candidate authority or course writes.

The audit and manifest model also prevents the project from claiming “complete opening knowledge” because every generated name matched a classification regex. It provides measurable, reviewable progress toward broad opening education while preserving the human-controlled Builder north star.

## Queue recommendation

Keep RB-025 active through review of the research/tooling PR and populated game-weighted evidence. After acceptance, execute `rb-025-generated-priority-batch-001` as the first separate content expansion delivery.

RB-016 remains blocked on real Builder/course usage and should not be started or conflated with knowledge coverage.
