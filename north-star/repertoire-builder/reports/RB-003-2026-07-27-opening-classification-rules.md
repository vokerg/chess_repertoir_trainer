# RB-003 completion report — Side-aware opening classification rules

Date: 2026-07-27

Task: `RB-003`

GitHub issue: `#91`

Pull request: `#111`

Branch: `rb-003/issue-91-opening-classification-discovery`

Target branch: `main`

## Purpose

Provide a practical intrinsic opening-classification foundation that can support Player Chess Profile conclusions and repertoire-candidate explanation without requiring one manually maintained record for every generated opening-book row.

The delivered design answers the product question: whether a player tends to choose sound, solid, sharp, risky, or dubious opening play, separately as White and Black.

## Delivered

- Versioned classification vocabulary `2026-07-rules-v1`.
- Transport-independent `OpeningClassificationService` beside the existing opening lookup service.
- Independent White and Black profiles for the same named opening.
- Separate dimensions for objective soundness, character traits, theoretical status, theory burden, opening role and confidence.
- Stable matched rule IDs as direct provenance.
- Ordered broad-family regex rules followed by safe lexical modifiers, subfamily rules and narrow line overrides.
- Initial AI-authored assessments committed as readable source with rationales and no runtime LLM dependency.
- Explicit `UNKNOWN` values where no reliable rule exists.
- Side-asymmetric gambit handling, including:
  - Evans Gambit: White offers a playable but risk-bearing pawn sacrifice; Black can accept soundly as a principal response;
  - Queen's Gambit Accepted: both sides remain objectively sound;
  - Benko Gambit Accepted: Black is the offerer and White is the acceptor;
  - Englund, Latvian, Elephant and Stafford examples where the initiating side is classified as dubious;
  - Marshall Attack as a sound principal Black pawn sacrifice.
- Shared Mikenas-Carls subfamily classification across multiple English Opening name forms, with a narrower Nei Gambit override.
- Generic `Gambit` handling that adds sharp/tactical character but never infers dubiousness by name alone.
- Generated-book coverage and rule-usage audit command.
- Regression tests over representative synthetic names and every generated opening-book entry.
- Updated canonical opening-book documentation.
- RB-018 / issue #116 for systematic regex coverage completion and actual-game calibration.

## Intentionally excluded

- Systematic classification of every opening family and high-frequency unknown, owned by RB-018.
- Player Chess Profile aggregation, weighting, narrative conclusions or persistence.
- API response changes or Angular presentation.
- Database migrations or a classification table.
- One manually curated object per generated opening row.
- Runtime LLM calls.
- Stockfish or engine-assisted classification auditing.
- Modification of `openingBook.generated.ts`.
- Candidate ranking or repertoire-target policy.

## Files and architecture areas

### Inspected

- `AGENTS.md`
- `.github/instructions/api.instructions.md`
- `.github/instructions/docs.instructions.md`
- `north-star/repertoire-builder/AGENTS.md`
- `north-star/repertoire-builder/README.md`
- `north-star/repertoire-builder/FOUNDATION.md`
- `north-star/repertoire-builder/NORTH_STAR.md`
- `north-star/repertoire-builder/FEATURES.md`
- `north-star/repertoire-builder/ROADMAP.md`
- `north-star/repertoire-builder/TASKS.md`
- `north-star/repertoire-builder/GITHUB_ISSUES.md`
- `north-star/repertoire-builder/STATUS.md`
- `north-star/repertoire-builder/DECISIONS.md`
- `north-star/repertoire-builder/OPEN_QUESTIONS.md`
- `north-star/repertoire-builder/tasks/RB-003-opening-classification-foundation.md`
- `docs/opening-book.md`
- `docs/imported-game-tags.md`
- `apps/api/package.json`
- `apps/api/src/scripts/update-opening-book.ts`
- `apps/api/src/services/opening-book/openingBook.types.ts`
- `apps/api/src/services/opening-book/openingBook.generated.ts`
- `apps/api/src/services/opening-book/openingLookupService.ts`
- `apps/api/src/modules/imported-games/game-opening-assignment.service.ts`
- `apps/api/src/modules/imported-games/opening-analysis.service.ts`
- `apps/api/src/modules/imported-games/game-tagging.service.ts`
- `apps/api/test/opening-book/opening-lookup.test.mjs`
- upstream pinned `lichess-org/chess-openings` TSV source.

### Changed

- `apps/api/src/services/opening-book/openingClassification.types.ts`
- `apps/api/src/services/opening-book/openingClassification.rules.ts`
- `apps/api/src/services/opening-book/openingClassificationService.ts`
- `apps/api/src/scripts/audit-opening-classification.ts`
- `apps/api/test/opening-book/opening-classification.test.mjs`
- `apps/api/package.json`
- `docs/opening-book.md`
- `north-star/repertoire-builder/tasks/RB-003-opening-classification-foundation.md`
- `north-star/repertoire-builder/tasks/RB-018-opening-classification-coverage.md`
- `north-star/repertoire-builder/TASKS.md`
- `north-star/repertoire-builder/STATUS.md`
- `north-star/repertoire-builder/ROADMAP.md`
- `north-star/repertoire-builder/DECISIONS.md`
- `north-star/repertoire-builder/OPEN_QUESTIONS.md`
- this report.

## Decisions and evidence

### Regex overlay instead of per-entry storage

The generated opening book contains thousands of deeply named entries, while many names share meaningful family or subfamily characteristics. Ordered regex rules provide a much smaller and more inspectable maintenance surface.

The classification layer remains separate from the generated upstream file, preserving licensing and regeneration boundaries.

### AI authorship without runtime AI

The repository does not need a grandmaster-maintained database to bootstrap useful classifications. ChatGPT authored the initial assessments, but the delivered artifact is deterministic reviewed source code. Consumers do not depend on model availability or untraceable generated output.

### Side-specific profiles

One opening name may encode different decisions by each side. A gambit offer, acceptance or decline cannot be collapsed into one label. The Evans Gambit and Benko Gambit demonstrate both color directions.

### Independent dimensions

- `SHARP` does not mean `DUBIOUS`.
- `PRINCIPAL` does not mean `SOLID`.
- A player can choose an objectively sound move that intentionally accepts tactical complications.
- A named main line can still belong to an objectively dubious opening family.

### Explicit unknowns

The classifier does not assign a generic positive label merely to claim 100% semantic coverage. Unknown samples remain measurable for later rule expansion based on actual consumer and game frequency.

### No Stockfish classification workflow

The user explicitly rejected engine auditing as unnecessary complexity for this qualitative classification process. RB-003 and RB-018 therefore remain regex-only. Uncertain assessments use explicit unknowns or lower confidence instead of a parallel engine subsystem.

## Validation

### Performed

- Rule-registry validation rejects duplicate IDs, stateful regex flags and rules with no side output.
- Focused tests cover Evans Gambit asymmetry, Queen's Gambit Accepted, reversed Benko roles, generic gambit safety, Mikenas-Carls inheritance, Nei Gambit override, dubious Englund classification, unknown fallback and successful processing of every generated opening-book row.
- Generated-book coverage test emits matched entry and side-asymmetry metrics.
- GitHub Actions run `30239257847` passed on implementation head `d547fa689ea44c69f2abee31158f68299bc81a2f`:
  - TypeScript lint;
  - complete workspace build;
  - architecture guardrails;
  - PostgreSQL migrations;
  - complete repository test suite.
- Audit command:

```sh
npm run opening-book:classification-audit --workspace=apps/api
```

### Skipped

- Direct manual execution of the audit command was unavailable in the connector-only environment; its source compiled and the tests exercised the classifier over every generated row.
- Browser review: no UI change.
- Engine audit: explicitly excluded.

## Limitations and residual risks

- Initial assessments are broad chess judgments and can contain controversial boundary choices.
- Regex rules depend on upstream naming stability; the audit exposes unused rules and unmatched names after an opening-book update.
- Coverage by generated names is less important than coverage weighted by actual games.
- A single family rule can be too coarse for a deep exception. Ordered overrides support corrections without changing the contract.
- Confidence is profile-level in v1 rather than per dimension.
- The service classifies existing opening metadata; it does not solve missing opening assignment outside current lookup coverage.

## Standalone product impact

The application now has a reusable intrinsic description of named openings that can be consumed by opening browsing, analysis, reports and future filters without waiting for the full repertoire builder.

## North-star impact

RB-003 provides the opening-character input required by RB-004 Player Chess Profile calculation, RB-006 repertoire-target definition and RB-007 explainable candidate evidence and ranking.

The result preserves the four evidence-layer boundary: intrinsic opening profile remains distinct from target-population behavior, player performance and repertoire intent.

## New tasks proposed

RB-018 / issue #116 — Complete opening classification coverage.

It owns:

- modular family organization where useful;
- grouped unknown backlogs;
- systematic family, subfamily and exception rules;
- generated-name and actual-game coverage;
- rule expansion based on high-frequency personal unknowns.

It explicitly excludes Stockfish, runtime AI, database storage, API, UI and Player Chess Profile aggregation.

## Queue assessment

No priority changes are required.

RB-003 is complete. RB-004 and RB-006 become ready. RB-018 is ready and may run in parallel with RB-004. RB-007 remains blocked on RB-006.

## Planning documents updated

- `STATUS.md` — records the delivered foundation, RB-018 and newly unblocked work.
- `TASKS.md` — moves RB-003 to done, adds RB-018 and updates dependency states.
- `ROADMAP.md` — closes Stage 1 and adds the parallel coverage track.
- `DECISIONS.md` — locks the regex-based classification method and explicit exclusions.
- `OPEN_QUESTIONS.md` — resolves foundational questions and transfers coverage calibration to RB-018.
- RB-003 and RB-018 task files.
- GitHub issues #91, #105 and #116.

## Recommended next checkpoint

Begin RB-004 and RB-018 independently: RB-004 should preserve unknown counts while RB-018 expands rule coverage according to actual-game value.
