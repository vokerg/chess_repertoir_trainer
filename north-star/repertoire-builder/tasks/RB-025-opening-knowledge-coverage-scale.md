# RB-025 — Scale opening knowledge toward comprehensive coverage

Status: REVIEW

Priority: P1

Order: 185

Delivery class: Research and incremental implementation

Planning maturity: Review — audit foundation plus first applied content batch

GitHub issue: #290

Claimed by: ChatGPT agent session

Claim branch: `rb-025/issue-290-coverage-scale-research`

Review branch: `rb-025/issue-290-audit-review`

Claimed at: 2026-08-06

Started at: 2026-08-06

Review pull request: #302

Coordination pull request: #300

Research report: `reports/RB-025-2026-08-06-opening-knowledge-coverage-scale.md`

Implementation report: `reports/RB-025-2026-08-07-opening-knowledge-batch-001.md`

## Objective

Expand the reviewed side-aware opening-knowledge pilot into a maintainable corpus that can explain theoretical openings represented by the generated opening book without equating name matches with semantic completeness.

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

1. Reconciled stale RB-022/RB-023/RB-024 program metadata and registered RB-025.
2. Added deterministic generated-book and imported-game-weighted audit models for:
   - overall knowledge status;
   - independent White and Black completeness;
   - missing description, summary and plan dimensions;
   - classification uncertainty by side, dimension and confidence.
3. Added a versioned deterministic family-priority backlog.
4. Added validated source-controlled bounded-batch manifests and fixture checks.
5. Documented source, editorial, reviewer, stale-content and offline AI-assistance boundaries.
6. Applied `rb-025-generated-priority-batch-001` as 16 new `REVIEWED` runtime rules.
7. Bumped the opening-knowledge corpus version to `2026-08-knowledge-v2`.
8. Added direct family/override regression tests and full-book coverage thresholds.

## Applied content batch

Broad family knowledge:

- Ruy Lopez;
- Italian Game;
- Dutch Defense;
- Semi-Slav Defense;
- Benoni Defense;
- Alekhine Defense.

Narrow overrides:

- Ruy Lopez Berlin, Exchange and Marshall;
- Italian Two Knights;
- Dutch Stonewall and Leningrad;
- Semi-Slav Meran and Botvinnik;
- Czech Benoni;
- Alekhine Four Pawns Attack.

Each rule contains project-original descriptions, side-specific summaries, at least one plan for each side, caveats and registered provenance. Narrow rules replace inherited plans where broad-family advice would be misleading.

## Measured result

Generated entries:

- `AVAILABLE`: 2,024 — 54.2%;
- `PARTIAL`: 248 — 6.6%;
- `UNAVAILABLE`: 1,461 — 39.1%;
- available gain: 672 entries.

Unique names:

- `AVAILABLE`: 1,671 — 52.8%;
- `PARTIAL`: 175 — 5.5%;
- `UNAVAILABLE`: 1,321 — 41.7%;
- available gain: 562 names.

Independent White and Black summary-plus-plan availability is 2,272 entries — 60.9% per side. All 41 runtime rules are exercised by the generated book; no rule is unused.

## Architecture constraints preserved

- No Prisma model, migration, background job, queue, runtime LLM request or runtime web lookup.
- No opening-knowledge endpoint, Angular store or MCP tool.
- No candidate ranking, eligibility, target/profile fit, Builder reducer, course preview/apply or course-write change.
- No opening-classification judgment change.
- Generated-entry, unique-name and imported-game-weighted metrics remain separate.
- Global completeness and selected-side usefulness remain separate.
- Runtime prose remains project-original and source-controlled.

## Validation gate

PR #302 must pass on its final exact head:

- lint;
- complete monorepo build;
- generated classification and knowledge audits;
- imported-game classification and knowledge audit commands;
- architecture guardrails;
- migrations;
- complete repository test suite.

The CI database contains zero imported games, so populated personal-game weighting remains owner-controlled evidence for choosing later batches; it is not required to prove the generated-book gain delivered here.

## Queue impact

RB-025 is in review with its audit foundation and first applied content batch. After acceptance, subsequent batches should use the same audit/manifest/rule workflow, beginning with the highest remaining generated and populated-game-weighted gaps. RB-016 remains independently blocked on real-use outcome evidence.
