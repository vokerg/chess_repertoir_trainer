# RB-025 — Scale opening knowledge toward comprehensive coverage

Status: CLAIMED

Priority: P1

Order: 185

Delivery class: Research followed by incremental implementation

Planning maturity: Claimed for coverage research and editorial-tooling foundation

GitHub issue: #290

Claimed by: ChatGPT agent session

Claim branch: `rb-025/issue-290-coverage-scale-research`

Claimed at: 2026-08-06

## Objective

Expand the reviewed side-aware opening-knowledge pilot into a maintainable corpus that can explain the theoretical openings represented by the local generated opening book without equating regex matches with semantic completeness.

The long-term capability should provide, for a resolved opening and selected side:

- trustworthy strategic orientation and typical plans;
- explicit conditions, caveats, transpositions and narrow exceptions;
- independent White and Black completeness;
- reviewable confidence, lifecycle, version and provenance;
- measurable coverage by generated entry, unique name and imported-game frequency;
- a repeatable bounded-batch editorial process.

## Verified baseline

- The generated opening book contains 3,733 entries and 3,167 unique names.
- Opening classification matches every generated entry, while some side-specific dimensions remain `UNKNOWN` or low-confidence.
- `OpeningKnowledgeService` contains 25 ordered reviewed rules.
- The RB-022 generated audit reported 1,352 `AVAILABLE`, 299 `PARTIAL` and 2,082 `UNAVAILABLE` entries.
- Builder consumes the selected side's bounded summary and plans through the existing candidate-decision response.
- Classification dimensions may affect target/profile fit and ranking; opening-knowledge prose and plans remain explanatory only.

## Claimed scope

This claim covers the first RB-025 delivery only:

1. reconcile stale RB-022/RB-023/RB-024 canonical program metadata and register RB-025;
2. define explicit coverage tiers and completion targets;
3. extend deterministic generated-book and imported-game-weighted audits with:
   - overall knowledge status;
   - independent White and Black completeness;
   - missing description, summary and plan dimensions;
   - independent classification uncertainty by soundness, character, theoretical status, theory burden, roles and confidence;
4. produce a deterministic prioritized backlog and bounded-batch manifest format;
5. document the editorial/reviewer workflow, source policy and initial delivery roadmap;
6. identify the first implementation batch, but do not add bulk runtime prose until the research report is reviewed.

## Dependencies and authority

- RB-021 / #240, RB-022 / #241, RB-023 / #242 and RB-024 / #243 are complete.
- Locked decision RB-D046 remains authoritative.
- Existing `OpeningLookupService`, `OpeningClassificationService`, `OpeningKnowledgeService`, ordered rules, stable plan IDs, validation and audits must be reused.
- Runtime remains deterministic and local.

## Architecture constraints

- Do not add a Prisma model, migration, background job, queue, runtime LLM request or runtime web lookup.
- Do not add an opening-knowledge HTTP endpoint, Angular store or MCP tool.
- Do not modify candidate ranking, eligibility, target/profile fit, coverage, Builder reducers, session state, course preview/apply or course writes.
- Do not modify opening-classification rules in the knowledge-coverage research delivery.
- Keep generated-entry, unique-name and imported-game-weighted metrics separate.
- Keep global completeness and selected-side usefulness separate.
- Preserve project-original runtime prose and reviewable source provenance.

## Expected research deliverables

- a current deterministic coverage and uncertainty report;
- explicit coverage tiers and target thresholds;
- a ranked family/subfamily backlog with inspectable scoring factors;
- a bounded batch-manifest format recording intended selectors, affected entries/names, expected weighted gain, sources, reviewer and regression fixtures;
- an editorial workflow and source-policy addendum;
- a recommended first implementation batch with measurable expected gains;
- a completion report and queue recommendation.

## Acceptance criteria

- Audits process every generated opening-book row.
- Database-backed audits use grouped imported-game opening metadata rather than loading unbounded games.
- White and Black knowledge completeness are reported independently.
- Classification uncertainty is reported per side and per dimension rather than through one coarse known/unknown boolean.
- Backlog ordering is deterministic and its factors are visible in JSON output.
- Nominal classification-rule matches cannot be reported as complete strategic knowledge.
- Existing audit commands remain valid JSON and CI-compatible.
- Existing candidate-decision contract and ranking-policy version remain unchanged.
- No runtime network/LLM dependency or new persistence subsystem is introduced.

## Explicit exclusions from this claim

- broad runtime corpus expansion;
- changes to soundness or other classification judgments;
- side-specific public contract redesign;
- Builder visual redesign;
- automatic course prose generation;
- production editorial CMS or reviewer database;
- RB-016 outcome claims.

## Validation plan

- focused API build and opening-book tests;
- generated classification and knowledge audits;
- imported-game audit command/schema validation against the test database;
- lint and architecture guardrails;
- complete repository build and test suite before review.

## Queue impact

RB-025 becomes the only dependency-satisfied active Repertoire Builder task. RB-016 remains independently blocked on real-use outcome evidence. The first content-expansion batch must be selected from the accepted RB-025 backlog rather than authored ad hoc.
