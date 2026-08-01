# Opening Book Lookup, Classification and Knowledge

`OpeningLookupService` provides reusable opening name lookups from local, generated data. Its first product use is `/api/opening-analysis`, where the response includes `bookOpening` for the current board position so the Opening analysis page can show `ECO · Opening Name` in its header subtitle.

`OpeningClassificationService` adds a separate deterministic intrinsic profile for a named opening. Lookup answers *which opening is this?* Classification answers *what kind of choice and position does this opening represent for White and for Black?*

`OpeningKnowledgeService` adds independently versioned reviewed descriptions and strategic plans. Knowledge answers *what is this opening generally about, what is each side trying to achieve, and when does a broad family plan stop applying?*

## Data source

The source data is [`lichess-org/chess-openings`](https://github.com/lichess-org/chess-openings), using `a.tsv`, `b.tsv`, `c.tsv`, `d.tsv`, and `e.tsv`. The upstream project marks the data as CC0/public domain.

The app vendors a generated TypeScript file instead of fetching at runtime. This keeps startup, build, test, and user traffic deterministic and offline-friendly, and avoids depending on GitHub or Lichess availability during normal use.

Regenerate the local data with:

```sh
npm run opening-book:update --workspace=apps/api
```

The update script fetches a pinned upstream commit, validates required TSV columns, replays source PGN with `chess.js` to derive UCI move strings, EPD positions, and ply counts, sorts deterministically, and writes `apps/api/src/services/opening-book/openingBook.generated.ts`.

The generated file remains upstream-derived data and must not contain application-authored classifications or strategic prose.

## Lookup matching strategy

ECO lookup is broad. Many positions can share one ECO code, so `lookupByEco()` returns the deepest deterministic entry for that ECO and should be treated as a fallback/helper.

FEN/EPD lookup is an exact normalized position lookup. The service accepts full FEN, `startpos`, normalized four-field FEN, or EPD-like first-four-fields, then matches against generated `epd` values.

Move lookup replays moves from the start position with `chess.js` and checks the opening book after every move. It returns the deepest matched position, which supports transpositions when the dataset includes the transposed position.

Lookup identity is deliberately not reused as a requirement for one classification or knowledge record per generated row. Thousands of deeply named rows often share the same meaningful family or subfamily traits.

## Opening classification

Classification is implemented under `apps/api/src/services/opening-book/` as:

- `openingClassification.types.ts` — versioned vocabulary and result types;
- `openingClassification.rules.ts` — RB-003 foundation families, modifiers and narrow overrides;
- `openingClassification.coverage.rules.ts` — RB-018 systematic family expansion and exceptions;
- `openingClassification.coverage.corrections.rules.ts` — stable-ID replacements for corrected regex boundaries;
- `openingClassificationService.ts` — transport-independent ordered matching and inheritance;
- `openingClassificationAudit.ts` — deterministic grouping and frequency-weighting helpers for unmatched opening families.

The active rule version is `2026-07-rules-v2`.

### Rule authorship and runtime boundary

The assessments are authored as reviewable source code. There is no runtime LLM call and no hidden generated assessment.

The classification workflow remains rule-based. Uncertain cases use `UNKNOWN`, lower confidence, or only safely inferable traits rather than introducing engine analysis or another classification subsystem.

### Matching and override order

Rules are evaluated in declaration order:

1. broad opening-family defaults;
2. safe lexical modifiers;
3. subfamily rules;
4. exact or narrow line overrides.

Later scalar values override earlier values. Character traits and roles are combined without duplicates.

A generic rule matching `Gambit` adds sharp/tactical character only. It never concludes that the opening is dubious, because sound gambits and principal pawn sacrifices exist.

### Side-aware result

Every classification contains independent `white` and `black` profiles with:

- objective soundness: `SOUND`, `PLAYABLE`, `RISKY`, `DUBIOUS`, or `UNKNOWN`;
- character traits: solid, balanced, positional, dynamic, sharp, tactical, or surprise-oriented;
- theoretical status: principal, mainline, sideline, surprise, or unknown;
- theory burden: low, medium, high, or unknown;
- roles such as initiator, responder, gambit offerer, acceptor, or decliner;
- confidence;
- matched rule IDs as provenance.

This distinction is mandatory for gambits. In the Evans Gambit, White chooses a playable but risk-bearing pawn sacrifice. Black may accept it as a sound principal response. Both sides enter a sharp tactical position, but they must not receive the same soundness or role label.

The same inversion appears in Black gambits such as the Benko, Blumenfeld, Colorado and Ponziani Countergambits: Black is the offerer and White may be the responder or acceptor.

### Unknowns and coverage meaning

The classifier always returns a structurally complete result. Dimensions without a reliable matching rule stay `UNKNOWN`; the service does not manufacture a generic positive or negative label merely to claim complete semantic certainty.

The pinned generated book currently has rule-match coverage for all 3,733 entries and all 3,167 unique names through 114 active ordered rules. This means every current generated name has extractable characteristics and provenance. It does **not** mean every dimension is asserted with high confidence: rare grouped systems deliberately retain `UNKNOWN` soundness and low confidence while still exposing safe traits such as surprise character, role and theory burden.

Consumer features should preserve unknown dimension and low-confidence counts rather than silently treating a matched rule as complete certainty.

## Static side-aware opening knowledge

Knowledge is implemented beside lookup and classification as:

- `openingKnowledge.types.ts` — independent version, lifecycle, source, statement, plan, selector and result contracts;
- `openingKnowledge.sources.ts` — source/license/retrieval provenance;
- `openingKnowledge.rules.ts` — ordered reviewed family, subfamily and line knowledge;
- `openingKnowledgeService.ts` — validation, matching, inheritance and runtime projection.

The active knowledge version is `2026-08-knowledge-v1`. The initial corpus contains 25 reviewed rules covering the required Sicilian/Najdorf, French, Caro-Kann, London, Queen’s Gambit, King’s Indian, Grünfeld, English/Réti, Evans and Benko pilot areas plus a bounded set of related high-value families.

### Selection and inheritance

`OpeningKnowledgeService.resolve()` consumes the resolved `OpeningBookEntry` and its current `OpeningClassificationResult`.

Knowledge rules primarily select through stable classification rule IDs. A narrow rule may additionally use opening-name, ECO or UCI-prefix selectors when the strategic distinction does not belong in the classification taxonomy. Rules remain explicitly ordered from broad families to narrow exceptions; specificity is never inferred from regex length.

Later reviewed scalar values replace earlier values for:

- concise description;
- longer description;
- White strategic summary;
- Black strategic summary.

Plans use stable IDs. The default `MERGE` mode preserves inherited plans, appends new IDs and replaces a same-ID plan in place. `removePlanIds` explicitly removes inherited plans. `REPLACE` clears all inherited plans for that side before applying the narrow rule. The French Exchange, Najdorf Poisoned Pawn and Benko Declined rules exercise full replacement where broad structural assumptions no longer apply.

### Lifecycle and provenance

Only `REVIEWED` rules appear in normal runtime results. `DRAFT` and `DEPRECATED` records remain valid editorial/audit data but are filtered out of the production projection.

Every reviewed statement and plan must:

- contain non-empty project-original text;
- reference at least one `PROJECT_ORIGINAL` authorship source;
- retain confidence and source IDs;
- use only registered source/license values;
- pass deterministic registry validation.

The validator also rejects duplicate rule/source/plan IDs, unknown classification references, missing sources, unsupported licenses, empty content, global/sticky selectors, malformed UCI prefixes and contradictory remove/add operations.

The service returns `AVAILABLE`, `PARTIAL` or `UNAVAILABLE`. `AVAILABLE` requires concise and longer descriptions, both side summaries and at least one plan for each side. Knowledge coverage is intentionally separate from classification rule-match coverage; consumers must not manufacture generic plans for partial or unavailable results.

There is no Prisma model, background job, runtime LLM call, runtime web lookup, public route or Angular contract in this foundation.

## Generated-book coverage audits

Run the deterministic classification audit with:

```sh
npm run opening-book:classification-audit --workspace=apps/api
```

Run the independent knowledge audit with:

```sh
npm run opening-book:knowledge-audit --workspace=apps/api
```

The knowledge audit processes every generated row and reports:

- `AVAILABLE`, `PARTIAL` and `UNAVAILABLE` entry and unique-name coverage;
- rule and source usage;
- unused rule IDs;
- a frequency-sorted unavailable-family backlog.

CI publishes classification and knowledge reports as separate artifacts so complete classification matching cannot be mistaken for complete strategic knowledge coverage.

## Imported-game-weighted coverage audits

Run the database-backed classification audit against an environment containing imported games:

```sh
npm run opening-book:classification-game-audit --workspace=apps/api
```

Run the game-weighted knowledge audit with:

```sh
npm run opening-book:knowledge-game-audit --workspace=apps/api
```

The knowledge command reads existing `ImportedGame.openingName` and `openingEco`, resolves the closest generated entry where available, and reports game-weighted availability plus an unavailable-family backlog. It adds no knowledge table, persistence, backfill, API or background job.

## Non-goals

- No classification or knowledge database and no one row per generated opening entry.
- No Stockfish or engine-assisted classification/knowledge audit.
- No runtime external API or runtime LLM call.
- No Player Chess Profile aggregation in the opening-book services.
- No public API or UI field until a concrete consumer requires it.
- No automatic imported-game backfill because both services derive results from existing opening metadata.
- No machine-actionable move recommendation or forced-plan field.
