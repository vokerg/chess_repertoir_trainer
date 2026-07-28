# Opening Book Lookup and Classification

`OpeningLookupService` provides reusable opening name lookups from local, generated data. Its first product use is `/api/opening-analysis`, where the response includes `bookOpening` for the current board position so the Opening analysis page can show `ECO · Opening Name` in its header subtitle.

`OpeningClassificationService` adds a separate deterministic intrinsic profile for a named opening. Lookup answers *which opening is this?* Classification answers *what kind of choice and position does this opening represent for White and for Black?*

## Data source

The source data is [`lichess-org/chess-openings`](https://github.com/lichess-org/chess-openings), using `a.tsv`, `b.tsv`, `c.tsv`, `d.tsv`, and `e.tsv`. The upstream project marks the data as CC0/public domain.

The app vendors a generated TypeScript file instead of fetching at runtime. This keeps startup, build, test, and user traffic deterministic and offline-friendly, and avoids depending on GitHub or Lichess availability during normal use.

Regenerate the local data with:

```sh
npm run opening-book:update --workspace=apps/api
```

The update script fetches a pinned upstream commit, validates required TSV columns, replays source PGN with `chess.js` to derive UCI move strings, EPD positions, and ply counts, sorts deterministically, and writes `apps/api/src/services/opening-book/openingBook.generated.ts`.

The generated file remains upstream-derived data and must not contain application-authored classifications.

## Lookup matching strategy

ECO lookup is broad. Many positions can share one ECO code, so `lookupByEco()` returns the deepest deterministic entry for that ECO and should be treated as a fallback/helper.

FEN/EPD lookup is an exact normalized position lookup. The service accepts full FEN, `startpos`, normalized four-field FEN, or EPD-like first-four-fields, then matches against generated `epd` values.

Move lookup replays moves from the start position with `chess.js` and checks the opening book after every move. It returns the deepest matched position, which supports transpositions when the dataset includes the transposed position.

Lookup identity is deliberately not reused as a requirement for one classification record per generated row. Thousands of deeply named rows often share the same meaningful family or subfamily traits.

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

## Generated-book coverage audit

Run the deterministic generated-book audit with:

```sh
npm run opening-book:classification-audit --workspace=apps/api
```

The report includes:

- generated entry and unique-name totals;
- matched and unknown entry/name coverage percentages;
- entries with useful profiles for both sides;
- soundness and role asymmetry counts;
- gambit asymmetry counts;
- a frequency-sorted backlog grouped by unmatched root opening family, including affected entry counts, unique-name counts, and examples;
- rule usage and unused rule IDs.

The grouped backlog makes upstream naming changes actionable. The generated-book regression test also fails if a newly pinned entry has no matching rule, while the runtime service still preserves an explicit unknown fallback for names outside the pinned dataset.

## Imported-game-weighted coverage audit

Run the database-backed audit against an environment containing imported games:

```sh
npm run opening-book:classification-game-audit --workspace=apps/api
```

It reports:

- total imported games, games with opening metadata and games missing it;
- game-weighted matched and unknown coverage;
- game-weighted useful-profile coverage for both sides;
- a frequency-ranked unknown-family backlog based on actual games rather than generated-book row count.

The command reads existing `ImportedGame.openingName` and `openingEco` values and classifies them at runtime. It adds no classification table, persistence, backfill, API or background job. CI runs it against the migrated test database to validate the integration and publishes both audit outputs as workflow artifacts.

## Non-goals

- No classification database or one row per generated opening entry.
- No Stockfish or engine-assisted classification audit.
- No runtime external API or runtime LLM call.
- No Player Chess Profile aggregation in the opening-book service.
- No API or UI field is added until a concrete consumer requires it.
- No automatic imported-game backfill is required for classification because the service derives results from existing opening metadata.
