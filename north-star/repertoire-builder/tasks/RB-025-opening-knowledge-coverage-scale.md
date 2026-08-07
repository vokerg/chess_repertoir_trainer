# RB-025 — Scale opening knowledge toward comprehensive coverage

Status: REVIEW

Priority: P1

Order: 185

Delivery class: Research followed by incremental implementation

Planning maturity: Review — deterministic coverage, prioritization and editorial-tooling foundation

GitHub issue: #290

Claimed by: ChatGPT agent session

Claim branch: `rb-025/issue-290-coverage-scale-research`

Implementation branch: `rb-025/issue-290-audit-foundation`

Review branch: `rb-025/issue-290-audit-review`

Claimed at: 2026-08-06

Started at: 2026-08-06

Review pull request: #302

Coordination pull request: #300

Report: `reports/RB-025-2026-08-06-opening-knowledge-coverage-scale.md`

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
- Global generated-entry knowledge coverage is 1,352 `AVAILABLE`, 299 `PARTIAL` and 2,082 `UNAVAILABLE`.
- White and Black are independently side-useful for 1,651 entries each.
- Builder consumes the selected side's bounded summary and plans through the existing candidate-decision response.
- Classification dimensions may affect target/profile fit and ranking; opening-knowledge prose and plans remain explanatory only.

## Delivered first scope

1. Reconciled stale RB-022/RB-023/RB-024 canonical program metadata and registered RB-025.
2. Defined explicit coverage tiers and completion targets.
3. Extended deterministic generated-book and imported-game-weighted audits with:
   - overall knowledge status;
   - independent White and Black completeness;
   - missing description, summary and plan dimensions;
   - independent classification uncertainty by soundness, character, theoretical status, theory burden, roles and confidence.
4. Added a deterministic prioritized backlog with a versioned, inspectable scoring policy.
5. Added a validated bounded-batch manifest format.
6. Documented the editorial/reviewer workflow, source policy, stale-content handling and offline AI-assistance boundary.
7. Added a first six-family `DRAFT` batch proposal with stable planned rule IDs and generated-book fixtures.
8. Did not add bulk runtime strategic prose.

## Dependencies and authority

- RB-021 / #240, RB-022 / #241, RB-023 / #242 and RB-024 / #243 are complete.
- Locked decision RB-D046 remains authoritative.
- Existing `OpeningLookupService`, `OpeningClassificationService`, `OpeningKnowledgeService`, ordered rules, stable plan IDs, validation and audits are reused.
- Runtime remains deterministic and local.

## Architecture constraints preserved

- No Prisma model, migration, background job, queue, runtime LLM request or runtime web lookup.
- No opening-knowledge HTTP endpoint, Angular store or MCP tool.
- No candidate ranking, eligibility, target/profile fit, coverage, Builder reducer, session-state, course preview/apply or course-write change.
- No opening-classification rule change in this delivery.
- Generated-entry, unique-name and imported-game-weighted metrics remain separate.
- Global completeness and selected-side usefulness remain separate.
- Project-original runtime prose and reviewable source provenance remain required.

## Acceptance evidence

- Audits process every generated opening-book row.
- Database-backed audits retain grouped imported-game opening metadata rather than loading unbounded games.
- White and Black knowledge completeness are reported independently.
- Classification uncertainty is reported per side and per dimension.
- Backlog ordering is deterministic and every score factor is visible in JSON.
- Nominal classification-rule matches are not reported as complete strategic knowledge.
- Existing audit commands remain JSON and CI compatible.
- Existing candidate-decision contract and ranking-policy version are unchanged.
- Checked-in batch fixtures are validated against the pinned generated opening book.
- CI run #2165 passed the initial implementation head; PR #302 owns the final exact-head validation gate.

## Explicit exclusions

- broad runtime corpus expansion;
- changes to soundness or other classification judgments;
- side-specific public contract redesign;
- Builder visual redesign;
- automatic course prose generation;
- production editorial CMS or reviewer database;
- RB-016 outcome claims.

## Review gate

Do not accept or merge PR #302 unless its exact head passes lint, complete build, all four opening audits, architecture guardrails, migrations and the complete test suite. The populated imported-game-weighted audit remains a separate owner-controlled evidence requirement before the first content manifest advances from `DRAFT` to `READY_FOR_REVIEW`.

## Queue impact

RB-025 is in review for its research/tooling foundation. After acceptance, the first content-expansion delivery should implement `rb-025-generated-priority-batch-001` as a separate bounded change. RB-016 remains independently blocked on real-use outcome evidence.
