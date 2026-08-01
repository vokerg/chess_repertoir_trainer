# RB-021 source appendix — Opening knowledge research

Date reviewed: 2026-07-31

Task: `RB-021`

Issue: `#240`

This appendix records external sources used to validate the source/licensing policy and representative strategic-plan model in `RB-021-2026-07-31-opening-knowledge-foundation.md`.

It does not authorize bulk copying. Each production knowledge statement still requires project-original wording, source binding and editorial review.

## Source classes

### Reusable opening identity data

#### `lichess-org/chess-openings`

- URL: https://github.com/lichess-org/chess-openings
- Source type: dataset
- Reuse classification: `CC0-1.0`
- Appropriate use: ECO, opening names, canonical move sequences, UCI/EPD identity and transposition-aware naming.
- Not supplied by this source: structured White/Black strategic plans or reviewed explanatory prose.

The repository describes the data as a collection of facts in the public domain and releases any qualifying copyright under CC0.

## Licensing-policy references

### Lichess Terms of Service

- URL: https://lichess.org/terms-of-service
- Source type: policy
- Reuse classification: `REFERENCE_ONLY` unless the exact component license is separately verified.

The terms state that different parts of the website and services can use different licenses. User-submitted content remains the user's content and is licensed to Lichess under the terms; this does not automatically establish a clean reusable license for copying a study or annotation into this project.

Operational rule:

- official opening pages and user studies may guide research;
- do not bulk import or closely paraphrase their prose;
- record the exact page as a reference and author reviewed project-original copy.

### Wikibooks copyright policy

- URL: https://en.wikibooks.org/wiki/Wikibooks:Copyrights
- Source type: policy
- Reuse classification: `CC-BY-SA-4.0` / GFDL according to page history and notices.

Wikibooks text generally requires attribution, indication of modifications and distribution under compatible share-alike terms. The project should not make direct Wikibooks adaptation the default editorial workflow without an explicit repository-wide licensing decision and attribution mechanism.

Operational rule:

- use as a research lead;
- prefer independent project-original synthesis;
- any direct adaptation requires exact attribution and compatibility review.

### Creative Commons Attribution-ShareAlike 4.0

- URL: https://creativecommons.org/licenses/by-sa/4.0/
- Source type: policy
- Reuse classification: license definition.

The share-alike obligation is why direct adaptation is not the recommended default for the first corpus.

### Project Gutenberg chess collection

- URLs:
  - https://www.gutenberg.org/ebooks/subject/1677
  - https://www.gutenberg.org/ebooks/33870
  - https://www.gutenberg.org/ebooks/5614
  - https://www.gutenberg.org/ebooks/16377
- Source type: historical books
- Reuse classification: public domain in the United States for the listed editions, subject to jurisdictional review.

Operational rule:

- useful for historical strategic concepts and terminology;
- insufficient as the sole source for modern opening theory;
- mark claims as potentially outdated and cross-check against modern references.

## Representative strategic references

The following pages were used to test whether broad-family knowledge and narrow overrides are necessary. Their prose is not intended for direct reuse.

### Sicilian Najdorf family

#### Najdorf overview

- URL: https://lichess.org/opening/Sicilian_Defense_Najdorf_Variation
- Reuse classification: `REFERENCE_ONLY`
- Research signal: broad Najdorf guidance distinguishes White's development/kingside attacking chances from Black's central flexibility and queenside counterplay.

#### English Attack

- URL: https://lichess.org/opening/Sicilian_Defense_Najdorf_Variation_English_Attack
- Reuse classification: `REFERENCE_ONLY`
- Research signal: castling side and pawn-storm setup make the plans more specific than the broad Najdorf rule.

#### Poisoned Pawn

- URL: https://lichess.org/opening/Sicilian_Defense_Najdorf_Variation_Poisoned_Pawn_Variation
- Reuse classification: `REFERENCE_ONLY`
- Research signal: White's sacrificed queenside pawn and immediate development/activity concerns materially change the generic attack/counterattack description.

#### Opocensky Variation

- URL: https://lichess.org/opening/Sicilian_Defense_Najdorf_Variation_Opocensky_Variation
- Reuse classification: `REFERENCE_ONLY`
- Research signal: same-side castling and more positional play demonstrate that one family plan cannot be applied to every Najdorf name.

### French Defense and Exchange exception

- URL: https://lichess.org/opening/French_Defense
- Reuse classification: `REFERENCE_ONLY`
- Research signal:
  - Black's central anchor, pressure against White's centre and light-squared-bishop problem;
  - White's space and kingside opportunities after an advanced e-pawn;
  - the Exchange variation neutralizes many closed-centre family plans.

This is the primary pilot case for `planMode: 'REPLACE'` rather than simple plan concatenation.

### English Opening and transpositions

- URL: https://lichess.org/opening/English_Opening
- Reuse classification: `REFERENCE_ONLY`
- Research signal: control of d5, delayed commitment and frequent transposition to queen-pawn structures.

This supports:

- family-level knowledge with explicit flexibility caveats;
- move/position-based identity rather than name-only assumptions;
- shared plan IDs or references for English/Réti transpositional cases.

### Benko Gambit coverage gap

- Official opening URL: https://lichess.org/opening/Benko_Gambit
- User-study example: https://lichess.org/study/IqAl4ymy/tOoePt6t
- Reuse classification: `REFERENCE_ONLY`

The official page currently has no explanatory description, while a user study discusses open queenside files and long-term pressure. This demonstrates why the project cannot rely on one runtime site or automatically treat user content as a reusable corpus.

### Evans Gambit coverage gap

- URL: https://lichess.org/opening/Italian_Game_Evans_Gambit_Accepted
- Reuse classification: `REFERENCE_ONLY`

The official page currently has no description. The project therefore needs multi-source research and original editorial synthesis rather than a scraper over opening pages.

## Research conclusions supported by the sources

1. **Identity and narrative are different datasets.** The CC0 opening-name dataset is suitable for lookup but does not solve plans.
2. **Source availability is uneven.** Some official opening pages contain useful descriptions; others contain none.
3. **Family prose is not enough.** Najdorf branches and the French Exchange show materially different strategic conditions.
4. **User studies are not a clean bulk source.** They can provide leads, but exact rights and factual quality vary.
5. **Direct copyleft adaptation has product consequences.** CC BY-SA text needs attribution and share-alike handling.
6. **Historical public-domain material needs modern cross-checking.** Copyright availability does not imply current theoretical accuracy.
7. **Project-original reviewed prose is the safest default.** AI may assist research and drafting, but runtime content should be deterministic, source-bound and editorially reviewed.

## Minimum editorial evidence rule proposed for RB-022

For a reviewed strategic statement or plan:

- bind at least one source supporting opening identity and applicability;
- where practical, bind at least two independent strategic references for material claims;
- mark a single-source or internally heterogeneous claim `LOW` or `MEDIUM` confidence;
- ensure no source paragraph is copied or closely paraphrased;
- record the retrieval date and source license classification;
- add conditions/caveats when the claim does not apply across every selected name or move order.

## Items intentionally not claimed

- no source is represented as a complete or grandmaster-reviewed strategic database;
- no numerical opening success claims were derived from these prose references;
- no engine result was used to validate a general strategic plan;
- no Lichess user study was treated as CC0 merely because it is publicly visible;
- no Wikibooks text was copied into the proposed project records;
- no historical public-domain book was treated as current theory authority.
