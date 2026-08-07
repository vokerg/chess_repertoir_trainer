# RB-025 implementation report — Opening knowledge batch 001

Date: 2026-08-07

Task: `RB-025`

Issue: `#290`

Pull request: `#302`

Branch: `rb-025/issue-290-audit-review`

Batch manifest: `rb-025-generated-priority-batch-001`

Status: Review

## Outcome

The first RB-025 content batch adds actual runtime opening knowledge rather than planning metadata only.

The corpus grows from 25 to 41 reviewed rules. `OpeningKnowledgeService` now resolves project-original descriptions, independent White/Black strategic summaries, plans and caveats for six major opening families plus ten narrower structural or tactical exceptions.

The knowledge version changes from `2026-08-knowledge-v1` to `2026-08-knowledge-v2` so evidence snapshots can distinguish the expanded corpus.

## Families added

Broad rules:

- Ruy Lopez;
- Italian Game;
- Dutch Defense;
- Semi-Slav Defense;
- Benoni Defense;
- Alekhine Defense.

Narrow overrides:

- Ruy Lopez: Berlin Defense;
- Ruy Lopez: Exchange Variation;
- Ruy Lopez: Marshall Attack;
- Italian Game: Two Knights Defense;
- Dutch Defense: Stonewall;
- Dutch Defense: Leningrad;
- Semi-Slav Defense: Meran;
- Semi-Slav Defense: Botvinnik;
- Benoni Defense: Czech Benoni;
- Alekhine Defense: Four Pawns Attack.

## What a rule means

A knowledge rule is a reusable opening explanation selected by stable classification IDs and, where necessary, a narrow opening-name pattern.

A broad family rule supplies the common description and plans for many generated opening rows. A narrower rule inherits that content and replaces only the parts that become misleading. For example, the Ruy Lopez family rule explains pressure on e5 and central development, while the Berlin rule replaces direct attacking assumptions with simplified-position and endgame guidance.

Rules do not choose moves, run an engine, modify candidate scores or write courses. They populate explanatory evidence already displayed by Builder and already available to game-review context.

## Content shape

Every new broad rule contains:

- concise description;
- longer description;
- White strategic summary;
- at least one White plan;
- Black strategic summary;
- at least one Black plan;
- conditions or caveats where generic advice may fail;
- confidence and registered source IDs.

Narrow rules use `REPLACE` where inherited plans would be materially wrong, notably Marshall, Botvinnik and closed Czech Benoni structures.

## Measured coverage

Before batch:

- generated entries: 1,352 available, 299 partial, 2,082 unavailable;
- unique names: 1,109 available, 223 partial, 1,835 unavailable;
- runtime rules: 25.

After batch:

- generated entries: 2,024 available, 248 partial, 1,461 unavailable;
- unique names: 1,671 available, 175 partial, 1,321 unavailable;
- runtime rules: 41.

Measured gain:

- 672 additional available generated entries;
- 562 additional available unique names;
- White side-useful coverage: 2,272 entries, 60.9%;
- Black side-useful coverage: 2,272 entries, 60.9%.

The manifest acceptance minimums were 600 entries and 500 unique names. Both are exceeded. All 41 rules are exercised by the generated book and the audit reports no unused rule IDs.

## Regression coverage

Tests verify:

- registry validation with 41 active rules;
- full-book status resolution;
- family inheritance completing existing Evans Gambit knowledge;
- Berlin, Two Knights, Leningrad, Botvinnik, Czech Benoni and Four Pawns narrow selection;
- stable side-specific plan IDs;
- knowledge-version propagation into candidate-decision and AI game-review contexts;
- minimum available-entry and used-rule thresholds.

Every manifest fixture is checked against the pinned generated opening book so invented or stale opening names fail CI.

## Authority boundaries

Unchanged:

- opening classification and its effect on target/profile fit;
- deterministic candidate ranking and eligibility;
- Builder state and reducer behavior;
- course preview/apply and writes;
- shared candidate contract shape;
- Prisma schema and migrations;
- API routes, Angular stores and MCP tools;
- runtime network or LLM behavior.

## Source and authorship

The opening identities and regression fixtures use the pinned public `lichess-org/chess-openings` dataset. Runtime explanations are project-original text and do not copy reference prose. The existing source registry records project authorship and the public opening dataset separately.

The repository lifecycle label `REVIEWED` means the rule is validated and eligible for runtime projection in this source-controlled delivery. It does not claim independent grandmaster review.

## Remaining backlog

The largest generated gaps after this batch begin with King's Gambit Accepted, Queen's Pawn Game, Indian Defense, King's Gambit Declined, Scotch Game and Petrov's Defense.

Future batch choice should combine the generated backlog with a populated imported-game audit so personal demand can override broad dataset frequency where appropriate.
