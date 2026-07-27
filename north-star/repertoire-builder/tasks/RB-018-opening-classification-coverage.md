# RB-018 — Complete opening classification coverage

Status: IN_PROGRESS

Priority: P1

Order: 35

Delivery class: Dual-use

Planning maturity: Agreed

GitHub issue: `#116`

Claimed by: ChatGPT session

Claim branch: `rb-018/issue-116-opening-classification-coverage-claim`

Implementation branch: `rb-018/issue-116-opening-classification-coverage`

Claimed at: 2026-07-27

Started at: 2026-07-27

Claim scope: complete the deterministic opening-classification coverage track without changing the RB-003 contract. The work covers maintainable family-rule organization, a grouped and prioritized unknown-name audit, representative family/subfamily/exception rules and tests, generated-entry and unique-name coverage reporting, and actual imported-game-weighted coverage where the current assignment data makes that possible. It excludes Stockfish, runtime AI, persistence, API/UI work, background jobs, generated-book edits, and Player Chess Profile aggregation.

## Outcome

Expand the RB-003 regex-based opening classification foundation until it provides useful, side-aware coverage across the opening families that occur in the generated opening book and in imported user games.

The result should support reliable conclusions such as whether a player tends to choose solid, positional, dynamic, sharp, risky, or dubious openings as White and as Black, while preserving explicit unknowns.

## Why this task exists

RB-003 establishes the deterministic vocabulary, rule ordering, side-aware output, provenance, confidence, and audit boundary. It intentionally does not attempt to classify every generated opening variation.

The generated book contains thousands of deeply named entries that can usually inherit from a much smaller number of family and subfamily regex rules. This task owns the systematic expansion and maintenance process without introducing per-entry storage or runtime AI.

## Current repo anchors to inspect

Reinspect before implementation:

- `apps/api/src/services/opening-book/openingClassification.types.ts`;
- `apps/api/src/services/opening-book/openingClassification.rules.ts` and any family modules introduced later;
- `apps/api/src/services/opening-book/openingClassificationService.ts`;
- `apps/api/src/scripts/audit-opening-classification.ts`;
- `apps/api/src/services/opening-book/openingBook.generated.ts`;
- imported-game opening assignment and Player Chess Profile consumers;
- focused opening-classification tests and canonical opening-book documentation.

## Dependencies

- RB-003 / issue #91 must be merged.
- May run in parallel with RB-004, provided RB-004 preserves unknown coverage and does not assume classification completeness.
- RB-005 profile presentation should not claim comprehensive conclusions until actual-game coverage is measured.

## In scope

- Keep the implementation regex-based and deterministic.
- Split the rule registry into maintainable opening-family modules when useful.
- Group unmatched generated names by root family and frequency.
- Add broad family rules, meaningful subfamily rules, and narrow exceptions where inheritance is misleading.
- Preserve independent White and Black assessments, especially gambit offer/accept/decline asymmetry.
- Prioritize rule additions using actual imported-game frequency once a consumer exists.
- Report generated-entry coverage, unique-name coverage, actual-game coverage, unknowns, rule usage, and unused rules.
- Add representative tests for every new family or exception group.
- Keep rule IDs, rationales, confidence, and versioning reviewable in source.

## Out of scope

- Stockfish or engine-assisted auditing.
- Runtime LLM calls.
- Database persistence or one classification row per generated opening.
- Editing `openingBook.generated.ts` manually.
- API or Angular presentation unless separately required by a concrete consumer task.
- Player Chess Profile aggregation itself, owned by RB-004.
- Repertoire candidate ranking, owned by RB-007.

## Open questions to resolve

- What generated-name and actual-game coverage thresholds are sufficient for useful profile conclusions?
- Which opening families should be processed first based on real game frequency?
- When does a deep named line justify an exception instead of family inheritance?
- Should confidence remain profile-level or become dimension-specific after real consumer feedback?
- How should upstream opening-book updates surface naming changes and unused rules?

## Acceptance criteria

- The classifier remains ordered, regex-based, deterministic, and versioned.
- Major opening families in actual imported games have useful White/Black assessments.
- Generic words such as `Gambit` never determine soundness by themselves.
- Family inheritance and exact exceptions are covered by focused tests.
- The audit produces a prioritized grouped backlog rather than only alphabetic unknown examples.
- Actual-game classification coverage is measured when imported-game integration is available.
- Unknown and low-confidence results remain visible; no fabricated 100% semantic coverage.
- No Stockfish, runtime AI, database, queue, or background job is added.

## Required validation

- `npm run build:api`
- focused opening-classification tests;
- `npm run opening-book:classification-audit --workspace=apps/api`;
- complete repository CI for production code changes.

## Completion updates

- Create `reports/RB-018-YYYY-MM-DD-opening-classification-coverage.md`.
- Update `STATUS.md`, `TASKS.md`, `ROADMAP.md`, `DECISIONS.md`, and `OPEN_QUESTIONS.md` according to measured coverage and consumer impact.
- Reassess RB-004/RB-005 profile claims and RB-006/RB-007 dependencies.

## Completion

Report: none

Completed at: none
