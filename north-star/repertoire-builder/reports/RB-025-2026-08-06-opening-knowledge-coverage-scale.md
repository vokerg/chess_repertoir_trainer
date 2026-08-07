# RB-025 research and tooling report — Opening knowledge coverage scale

Date: 2026-08-06

Task: `RB-025`

GitHub issue: `#290`

Coordination pull request: `#300`

Review pull request: `#302`

Superseded implementation pull request: `#301`

Claim branch: `rb-025/issue-290-coverage-scale-research`

Review branch: `rb-025/issue-290-audit-review`

Delivery class: Research and deterministic editorial-tooling foundation

Status: Review; PR #302 owns the final exact-head validation and acceptance gate

## Purpose

The initial opening-knowledge corpus proved the ordered family/subfamily/line inheritance model with 25 reviewed rules, but it did not provide a scalable way to distinguish generated-book breadth, selected-side usefulness, global editorial completeness, classification uncertainty and imported-game-weighted demand.

RB-025 establishes those measurements and a repeatable bounded-batch workflow before bulk runtime prose is added.

## Delivered scope

The delivery adds:

- weighted per-side classification completeness and confidence audits;
- independent White and Black strategic-summary/plan completeness;
- description-field completeness separately from side usefulness;
- one generated/imported-game-compatible observation model;
- a versioned deterministic family-priority policy with inspectable factors;
- a validated source-controlled editorial batch-manifest format;
- generated-book validation for every checked-in manifest fixture;
- explicit coverage tiers and scale targets;
- source, review, stale-content and offline AI-drafting policy;
- a first `DRAFT` implementation manifest selected from generated-book evidence;
- synchronized RB-022/RB-023/RB-024 completion metadata and RB-025 execution ownership.

No runtime opening prose or classification judgment is added in this delivery.

## Current generated-book baseline

Audit source: CI run #2165 on implementation head `d782621a46b390084dac52dcd3cb2de9957c93c2`. PR #302 must validate the complete review head, including manifest, fixture, documentation and report commits.

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

The deterministic backlog groups opening names by root family and exposes unavailable/partial knowledge, missing descriptions and side fields, independent side gaps, unknown classification dimensions, low-confidence sides and unique-name breadth.

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
- generated-book regression fixtures validated against the pinned book;
- both White and Black covered by every planned rule;
- expected generated `AVAILABLE` gain: 671 entries;
- expected unique-name `AVAILABLE` gain: 561 names;
- minimum accepted gains: 600 entries and 500 unique names.

If the expected gain is achieved, global generated-entry availability would rise from 36.2% to approximately 54.2%, and unique-name availability from 35.0% to approximately 52.7%.

King's Gambit Accepted is deliberately excluded despite its high generated score because its concrete sacrificial branches need a dedicated evidence/reviewer batch. Queen's Pawn Game is deferred because it is a transpositional umbrella overlapping already reviewed structures.

The manifest remains `DRAFT`. It records baseline, expected gains, stable planned IDs, selector intent, sources, fixtures and authority guardrails; it does not create runtime knowledge.

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

The database-backed audits emit the same side completeness, classification uncertainty and family-priority shape using grouped `ImportedGame.openingName` / `openingEco` counts.

CI's migrated test database contains zero imported games. It therefore validates the command, schema and zero-row behavior but does not provide real weighted coverage. Before the first manifest advances from `DRAFT` to `READY_FOR_REVIEW`, the game-weighted audit should be run in a populated owner-controlled environment and compared with the generated backlog.

## Architecture decisions

### Overall and selected-side completeness remain separate

The public knowledge status is unchanged. Audits add White/Black usefulness rather than changing the candidate contract.

### Classification uncertainty remains a separate backlog

Knowledge enrichment does not silently revise soundness, theoretical status, burden, roles or confidence. Such changes require separate evidence because they may affect target/profile fit and ranking.

### Priority policy is versioned and inspectable

Every factor and weight is returned in audit JSON. The score cannot enter runtime ranking or Builder behavior.

### Batches are source-controlled and validated

A manifest records lifecycle, versions, baselines, expected gains, planned stable IDs, source references, fixtures, acceptance thresholds and reviewer identity. Reviewed/applied states require a reviewer, and checked-in fixtures must exist in the pinned generated opening book.

### Runtime remains local and deterministic

No Prisma model, migration, job, queue, endpoint, Angular store, MCP tool, runtime web request or runtime LLM request is introduced.

## Editorial and source policy

The complete workflow is documented in `docs/opening-knowledge-editorial-workflow.md`.

Key boundaries:

- generated opening data supplies identity and position metadata, not project strategic prose;
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

CI run #2165 passed the initial implementation head with:

- dependency installation;
- lint;
- complete monorepo build;
- generated opening classification and knowledge audits;
- architecture guardrails;
- complete database migration chain;
- imported-game classification and knowledge audits;
- complete repository test suite;
- audit/report artifact upload and cleanup.

PR #302 is the mandatory final exact-head validation gate for the complete review branch. The task must not be accepted or merged unless that head passes the same pipeline.

## Limitations and residual risks

- Populated imported-game-weighted results remain unavailable in CI.
- The first batch is `DRAFT`; its strategic claims and family-specific sources are not reviewed.
- Generated breadth can overvalue obscure named branches relative to real player demand.
- Broad Ruy Lopez and Italian inheritance needs careful narrow exceptions.
- Current side-availability symmetry reflects the pilot rule pattern, not a permanent guarantee.
- Priority weights may need a new version after evidence from applied batches.

## Standalone product and north-star impact

Builder already displays opening knowledge in focused evidence. Better coverage improves immediate explanatory value without changing candidate authority or course writes.

The audit and manifest model prevents the project from claiming complete opening knowledge merely because every name matched a classification regex. It provides measurable, reviewable progress while preserving the human-controlled Builder north star.

## Queue recommendation

Review PR #302. After acceptance, run the weighted audit in a populated owner-controlled environment and then implement `rb-025-generated-priority-batch-001` as a separate bounded content delivery. RB-016 remains blocked on real-use outcome evidence.
