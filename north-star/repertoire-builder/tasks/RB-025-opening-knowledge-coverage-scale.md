# RB-025 — Scale opening knowledge toward comprehensive coverage

Status: REVIEW

Priority: P1

Order: 185

Delivery class: Research and incremental implementation

Planning maturity: Review — complete generated-book strategic-knowledge coverage

GitHub issue: #290

Claimed by: ChatGPT agent session

Claim branch: `rb-025/issue-290-coverage-scale-research`

Foundation review branch: `rb-025/issue-290-audit-review`

Completion review branch: `rb-025/issue-290-knowledge-100`

Claimed at: 2026-08-06

Started at: 2026-08-06

Foundation review pull request: #302

Completion review pull request: #304

Coordination pull request: #300

Research report: `reports/RB-025-2026-08-06-opening-knowledge-coverage-scale.md`

First-batch report: `reports/RB-025-2026-08-07-opening-knowledge-batch-001.md`

Completion report: `reports/RB-025-2026-08-07-opening-knowledge-completion.md`

## Objective

Expand the reviewed side-aware opening-knowledge pilot into a maintainable corpus that can explain every theoretical opening represented by the pinned generated opening book without using a generic fallback or equating name matching with classification certainty.

For a resolved opening and selected side, the corpus provides:

- a concise and longer opening description;
- independent White and Black strategic summaries;
- stable plans with conditions and caveats;
- broad-family inheritance with narrow structural or tactical overrides;
- confidence, lifecycle, version and source provenance;
- measurable generated-entry, unique-name and imported-game-weighted coverage.

## Verified starting baseline

- Generated opening book: 3,733 entries and 3,167 unique names.
- Runtime knowledge corpus: 25 reviewed rules.
- Generated-entry coverage: 1,352 `AVAILABLE`, 299 `PARTIAL`, 2,082 `UNAVAILABLE`.
- Unique-name coverage: 1,109 `AVAILABLE`, 223 `PARTIAL`, 1,835 `UNAVAILABLE`.
- Builder already consumes selected-side summaries and plans through candidate-decision evidence.
- Opening knowledge remains explanatory and does not affect ranking, eligibility or course writes.

## Delivered scope

1. Added deterministic generated-book and imported-game-weighted audit models for overall knowledge, independent White/Black completeness and classification uncertainty.
2. Added a versioned deterministic family-priority backlog and validated source-controlled batch manifests.
3. Documented source, editorial, reviewer, stale-content and offline AI-assistance boundaries.
4. Applied the first 16-rule expansion for Ruy Lopez, Italian, Dutch, Semi-Slav, Benoni and Alekhine families and important exceptions.
5. Audited the remaining gaps and identified 119 root families.
6. Added an explicit completion layer for those 119 families:
   - 115 previously unavailable families receive project-original descriptions and independent White/Black strategic guidance;
   - Nimzo-Indian, Queen's Indian, Slav and Catalan receive only their missing long-description layer, preserving their established side plans.
7. Ordered the completion layer before existing base/expansion rules so narrower reviewed knowledge remains authoritative.
8. Advanced the corpus to `2026-08-knowledge-v3` with 160 reviewed rules.
9. Added hard all-book tests requiring every pinned generated entry to remain fully available.

## Final measured generated-book result

Exact audit on completion head `6acbcbe08797e059ca9d31b281de0425935c8e55`:

- generated entries `AVAILABLE`: 3,733 / 3,733 — **100%**;
- generated entries `PARTIAL`: 0;
- generated entries `UNAVAILABLE`: 0;
- unique names `AVAILABLE`: 3,167 / 3,167 — **100%**;
- White summary + plan: 3,733 / 3,733 — **100%**;
- Black summary + plan: 3,733 / 3,733 — **100%**;
- concise descriptions: 100%;
- long descriptions: 100%;
- reviewed runtime rules: 160;
- unused runtime rules: 0.

This is complete coverage of the pinned generated opening book. An arbitrary/invented opening name remains `UNAVAILABLE`; no catch-all fallback was introduced.

## Quality boundary

Coverage completeness is not a claim that every obscure named line has equal theoretical depth. Major and specifically reviewed openings retain detailed narrow rules. Rare/offbeat families intentionally use lower-confidence, robust strategic orientation rather than fabricated move-by-move theory. Future narrower rules can deepen individual families without changing the 100% coverage invariant.

## Architecture constraints preserved

- No Prisma model, migration, background job, queue, runtime LLM request or runtime web lookup.
- No opening-knowledge endpoint, Angular store or MCP tool.
- No candidate ranking, eligibility, target/profile fit, Builder reducer, course preview/apply or course-write change.
- No opening-classification judgment change.
- Generated-entry, unique-name and imported-game-weighted metrics remain separate.
- Runtime prose remains project-original and source-controlled.

## Validation gate

PR #302 passed exact-head CI #2192. PR #304 completion head `6acbcbe08797e059ca9d31b281de0425935c8e55` passed CI #2208, including:

- lint;
- complete monorepo build;
- generated classification and knowledge audits;
- imported-game classification and knowledge audit commands;
- architecture guardrails;
- migrations;
- complete repository test suite, including two independent all-3,733-entry knowledge gates.

The CI database contains zero imported games, so populated personal-game weighting remains owner-controlled evidence; it is not required to prove generated-book completion.

## Queue impact

RB-025 has reached its generated-book strategic-knowledge completion target and remains in `REVIEW` only because PRs #302 and #304 are unmerged. Further opening-knowledge work should be quality/depth refinement driven by real use, low-confidence classification, or specific line demand rather than coverage-gap filling. RB-016 remains independently blocked on real-use outcome evidence.
