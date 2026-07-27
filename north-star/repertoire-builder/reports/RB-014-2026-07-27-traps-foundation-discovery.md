# RB-014 traps knowledge foundation discovery

Date: 2026-07-27

Status: review-ready recommendation; production implementation not approved

Task: RB-014

GitHub issue: #102

Branch: `rb-014/issue-102-traps-foundation-research`

Pull request: #113

## Executive recommendation

**Proceed with a bounded, curated trap-data pilot. Do not build a production traps database, API, or builder integration yet.**

A trustworthy trap capability cannot come from a static list of named lines or from an engine threshold alone. The viable foundation is a hybrid:

1. **position-and-move identity** using the repository's normalized FEN conventions;
2. **engine evidence** for setup soundness, the opponent mistake, punishment, and safe escapes;
3. **population evidence** for practical temptation by rating and speed target;
4. **editorial review** for names, explanations, variants, warnings, and deprecation;
5. **versioned provenance** for every source and derived conclusion.

The first implementation step, if approved, should be a documentation/data pilot of roughly 20–50 reviewed examples plus a deterministic validator. It should not introduce Prisma models or product endpoints.

## Proposed definition

A **chess trap** is a versioned conditional branch pattern in which:

1. one side reaches a reproducible trigger position;
2. that side offers or permits an apparently attractive opponent move or short sequence;
3. the tempting response is practically plausible, ideally demonstrated by population evidence;
4. a bounded forcing punishment creates a material, mating, or decisive evaluation consequence;
5. one or more safer defensive alternatives or refutations are represented explicitly;
6. the soundness of the trap-setting move or setup is recorded separately from the success of the punishment.

A trap is therefore not defined only by an objective evaluation swing. It combines **practical temptation** and **conditional tactical consequence**.

### Related concepts

| Concept | Distinction from a trap |
| --- | --- |
| Gambit | A voluntary material investment for compensation. It does not require the opponent to make a specific mistake and may be fully sound. |
| Tactical motif | A reusable pattern such as a fork, pin, deflection, or mating net. It is not an opening-branch identity. A trap may contain several motifs. |
| Opening mistake | An objectively bad move. It may have no deliberate bait, recognizable punishment sequence, or practical temptation. |
| Dubious line | A strategically or objectively risky setup. It may contain a trap, but the setup's weakness must remain visible. |
| Opening trick | Informal presentation term. It should map either to a validated trap or remain unstructured editorial copy. |

## Repository fit

### Position identity

The repository already has the correct identity boundary:

- `normalizeFenForPosition` preserves piece placement, active color, castling rights, and legal en-passant state while dropping counters;
- `Position.normalizedFen` and `Position.positionKey` identify reusable positions;
- `ImportedGamePly.positionId` represents the position before a move;
- course suggestions and opening lookup already match through normalized FEN;
- the opening book supports multiple move orders reaching the same named opening.

Trap identity should therefore **not** use opening name, ECO, or one canonical PGN line as its primary key.

### Engine evidence

The repository already has two relevant patterns:

- `PositionAnalysis` stores white-centric best move, evaluation, mate, and PV lines per normalized position;
- tactical detections preserve a versioned threshold profile, threshold hash, exact trigger ply, before/after evaluations, best move, run provenance, and feedback.

A future validator should reuse the Stockfish abstraction and white-centric evaluation conventions. Low-depth interactive checks must not silently overwrite shared `PositionAnalysis`, matching the current scenario-training rule.

### Population evidence

Opening Explorer already provides:

- explicit speed presets;
- explicit rating populations;
- normalized player-level targeting;
- move counts and result counts;
- cache/profile provenance;
- authenticated and rate-limited access to the Lichess Explorer.

Trap relevance should use the same population vocabulary rather than inventing separate rating or speed buckets.

### Course output

`Line.tags`, `Line.notes`, and `MoveNode.comment`, `annotation`, `branchLabel`, and `branchWeight` are potential presentation or materialization targets. They are not an adequate canonical trap knowledge store because they are course-owned, user-editable, and lack source/version/evidence structure.

## Source strategies

### Strategy A — Lichess puzzle database as candidate seed

Source: `https://database.lichess.org/#puzzles`

License: CC0.

Published fields include puzzle ID, source FEN, solution moves, puzzle rating/deviation, popularity, play count, themes, source-game URL, and opening tags. The dataset is generated from analysed games and deeper Stockfish re-analysis.

Strengths:

- legally reusable and redistributable;
- millions of concrete tactical positions;
- exact move sequence and stable puzzle ID;
- puzzle difficulty, popularity, and play-count signals;
- opening and tactical tags;
- suitable for candidate mining and punishment-line verification.

Limitations:

- the puzzle FEN is before the opponent move that creates the challenge, not necessarily the earlier trap-setting position;
- puzzle generation optimizes for a tactical only-move challenge, not for identifying deliberate opening bait;
- no safe-defense set is supplied;
- no rating/speed-specific frequency of the tempting move is supplied;
- opening tags are limited to early puzzles and are labels, not identity;
- puzzle popularity measures solver feedback, not over-the-board temptation.

Conclusion: use as a **candidate and tactical-evidence source**, never as a complete trap record.

### Strategy B — derive candidates from games plus engine and population evidence

Sources:

- CC0 Lichess standard-game exports: `https://database.lichess.org/`;
- CC0 evaluated-position export: `https://database.lichess.org/#evals`;
- authenticated Lichess Opening Explorer through the repository's existing client;
- repository-owned imported games for personal evidence where appropriate.

Candidate derivation can search early-game positions for a pattern such as:

1. setup move has acceptable or explicitly classified soundness;
2. one opponent response is substantially worse than safe alternatives;
3. the response occurs often enough in a target population;
4. a short forcing line realizes the consequence;
5. the pattern repeats across games or a curated source.

Strengths:

- directly measures practical temptation;
- supports existing rating/speed presets;
- can distinguish general popularity from target-population relevance;
- can detect unnamed traps and transpositions;
- can quantify whether a famous trap is obsolete or still practical.

Limitations:

- full-game mining is computationally expensive;
- explorer data is an aggregate snapshot, not a stable permanent truth;
- move frequency alone can promote ordinary blunders or selection artifacts;
- evaluation thresholds are sensitive to engine/profile changes;
- result rate is confounded by player strength and later play;
- sparse positions need explicit insufficiency states;
- authenticated Explorer access and rate limits require bounded, cached runs.

Conclusion: use for **quantitative validation**, not unattended publication.

### Strategy C — curated editorial overlay

Curators review candidate records and provide:

- stable display name and aliases;
- setup route examples;
- explanation of the temptation;
- safe defenses and refutations;
- soundness warning;
- relationship to gambits/openings;
- variant/family grouping;
- acceptance, rejection, deprecation, or refutation state.

Strengths:

- provides understandable and responsible product copy;
- prevents a raw threshold from becoming a recommendation;
- handles known names, historical variants, and disputed move orders;
- supports explicit review and correction.

Limitations:

- requires sustained editorial labor;
- names and conventional lines are inconsistent across sources;
- copied prose or annotations may be copyrighted;
- reviewer disagreement requires recorded rationale.

Conclusion: curation is **required**, not optional.

## Licensing decision

### Suitable inputs

- Lichess database game, puzzle, and evaluation exports explicitly released under CC0;
- `lichess-org/chess-openings`, explicitly CC0/public domain;
- original analysis generated by this application using its existing engine integration;
- application-owned aggregate statistics and original editorial text.

### Discovery leads only

Public Lichess studies, videos, forum posts, blogs, books, commercial databases, and third-party trap sites may identify candidate names or lines for manual investigation. They must not be copied or bulk imported unless their specific license and attribution rights are verified.

Lichess Terms state that users retain rights in submitted content and grant a license to Lichess. That is not a blanket CC0 grant to this application. The Terms also warn that different services and components have different licenses.

### Provenance requirement

Every accepted source snapshot should preserve:

- source type;
- source identifier or URL;
- source version, date, or commit;
- file checksum where downloaded;
- license identifier;
- importer/validator version;
- retrieval and validation timestamps.

## Proposed conceptual model

This is a discovery model, not a Prisma proposal.

```ts
type TrapDefinition = {
  id: string;
  schemaVersion: number;
  revision: number;
  status: 'DRAFT' | 'VALIDATED' | 'DEPRECATED' | 'REFUTED';

  title: string;
  aliases: string[];
  trapFamilyId?: string;
  sideSettingTrap: 'WHITE' | 'BLACK';

  trigger: {
    normalizedFen: string;
    positionKey?: string;
    setupRoutes: Array<{
      movesUci: string[];
      movesSan?: string[];
      sourceRef?: string;
    }>;
  };

  offer?: {
    moveUci: string;
    role: 'BAIT' | 'SACRIFICE' | 'WAITING_MOVE' | 'TACTICAL_PERMISSION';
  };

  temptingResponses: Array<{
    moveUci: string;
    responseSequenceUci?: string[];
    explanation: string;
  }>;

  punishments: Array<{
    againstResponseKey: string;
    lineUci: string[];
    outcome: 'MATE' | 'MATERIAL' | 'DECISIVE_EVAL' | 'POSITIONAL_BIND';
    maxPlies: number;
  }>;

  safeDefenses: Array<{
    moveUci: string;
    lineUci?: string[];
    outcomeSummary: string;
  }>;

  soundness: {
    class: 'SOUND' | 'PLAYABLE_RISK' | 'DUBIOUS' | 'REFUTED';
    setupLossCp?: number;
    explanation: string;
  };

  engineEvidence: Array<{
    positionRole: 'BEFORE_SETUP' | 'TRIGGER' | 'AFTER_TEMPTATION' | 'AFTER_PUNISHMENT' | 'SAFE_DEFENSE';
    normalizedFen: string;
    engine: string;
    engineVersion: string;
    depth?: number;
    nodes?: number;
    multipv: number;
    scoreCpWhite?: number;
    mateWhite?: number;
    pvUci: string[];
    profileVersion: string;
  }>;

  populationEvidence: Array<{
    populationProfile: string;
    speedPreset: string;
    ratingTarget: string;
    snapshotAt: string;
    totalGames: number;
    temptingMoveGames: number;
    temptingMoveRate: number;
    safeMoveRates: Array<{ moveUci: string; games: number; rate: number }>;
    insufficientEvidence: boolean;
  }>;

  openingLabels: Array<{
    eco: string;
    name: string;
    matchedPly: number;
    source: string;
    sourceVersion: string;
  }>;

  themes: string[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  review: {
    reviewer: string;
    reviewedAt: string;
    rationale: string;
  };
  provenance: Array<{
    sourceType: string;
    sourceId: string;
    sourceVersion?: string;
    checksum?: string;
    license: string;
    retrievedAt: string;
  }>;
};
```

## Identity and transpositions

### Stable occurrence identity

The stable key should derive from chess facts, for example:

```text
hash(
  schemaVersion
  + normalizedTriggerFen
  + sideSettingTrap
  + ordered offer/tempting-response UCI sequence
  + canonical punishment key
)
```

Opening name, ECO, prose title, and one illustrative setup route must not participate in identity.

### Same trap occurrence

Treat two routes as the same occurrence when they reach the same normalized trigger FEN with the same side to move, legal state, offer/tempting response, and equivalent punishment branch.

The repository normalizer preserves castling and en-passant rights, so positions that look similar but have different legal rights are not incorrectly collapsed.

### Trap family

Different trigger positions or move orders that express the same tactical idea may share a `trapFamilyId`, but remain separate validated occurrences. This is important for patterns such as the Fishing Pole, which appears through more than one opening route.

## Practical and objective evidence must remain separate

A trap record should never collapse evidence into one opaque `trapScore`.

At minimum, show separately:

- setup soundness;
- opponent temptation rate;
- punishment severity;
- evidence sample size;
- speed/rating target;
- engine/profile version;
- safe-defense availability;
- editorial confidence.

A high temptation rate does not make a dubious setup sound. A sound setup does not make a rare opponent error practically important.

## Candidate validation workflow

1. **Ingest candidate reference** from a CC0 source or original application research.
2. **Replay legality** with `chess.js`; derive UCI moves and normalized FENs.
3. **Deduplicate by occurrence identity**; attach alternate setup routes.
4. **Attach opening labels** through `OpeningLookupService` as descriptive metadata.
5. **Run engine profile** at trigger, after tempting response, punishment, and safe defenses.
6. **Classify setup soundness** independently of punishment severity.
7. **Fetch bounded population snapshots** using existing speed/rating presets.
8. **Require minimum evidence or mark insufficient**; never infer zero popularity from unavailable data.
9. **Review safe defenses and refutations** manually.
10. **Approve, reject, deprecate, or mark refuted** with rationale.
11. **Version changes** when thresholds, engine profile, source snapshot, or interpretation changes.
12. **Retain prior revision provenance** so a once-valid trap is not silently rewritten.

## Representative examples

The following examples test the model. They are not imported product records and no numerical success rate is asserted.

### 1. Légal trap — sound punishment after a defensive mistake

Illustrative setup route:

```text
1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6? 5.Nxe5! Bxd1?? 6.Bxf7+ Ke7 7.Nd5#
```

Model implications:

- White's `Nxe5` is an offer/sacrifice, not the opponent's tempting move.
- Black's `Bxd1` is the tempting material capture.
- `Bxf7+`, `Ke7`, `Nd5#` is the bounded punishment.
- safe alternatives must include declining the queen capture and earlier bishop decisions;
- the opening label is Philidor-related metadata, not identity;
- the mating result makes punishment severity clear, but practical relevance still needs population evidence for the exact move order.

This validates the need for distinct `offer`, `temptingResponses`, and `safeDefenses` fields.

### 2. Blackburne–Shilling — effective trap with a dubious setup

Illustrative route:

```text
1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! 4.Nxe5? Qg5 5.Nxf7?? Qxg2 6.Rf1 Qxe4+ 7.Be2 Nf3#
```

Normalized trigger position after `3...Nd4`:

```text
r1bqkbnr/pppp1ppp/8/4p3/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq -
```

Model implications:

- `3...Nd4` is the bait-setting move;
- `4.Nxe5` begins the tempting response branch;
- White has safe alternatives such as resolving the d4 knight rather than taking e5;
- the punishment can end in a forced mating pattern after further cooperation;
- the setup is commonly described as objectively dubious, so it must not be recommended without a soundness warning even if it catches many opponents.

This is the strongest example for keeping setup soundness separate from practical temptation.

### 3. Fishing Pole — family and move-order complexity

Illustrative route:

```text
1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Ng4 5.h3 h5 6.hxg4? hxg4
```

Normalized trigger position after `5...h5`:

```text
r1bqkb1r/pppp1pp1/2n5/1B2p2p/4P1n1/5N1P/PPPP1PP1/RNBQ1RK1 w kq h6
```

Model implications:

- the trap may be reached from different Ruy Lopez or related move orders;
- the same kingside idea can occur from non-identical positions, so a family is broader than an occurrence;
- `6.hxg4` is the tempting capture;
- multiple defensive resources and continuations must be represented rather than publishing one forced line;
- population relevance is likely highly speed- and rating-sensitive;
- engine evidence must evaluate both the setup and each defensive resource.

This validates separate occurrence identity, family grouping, and multiple safe defenses.

## Reproducible evidence protocol

A future pilot validator should record exact inputs and outputs as follows.

### Engine protocol

For each example position:

1. replay the setup with `chess.js`;
2. normalize with `normalizeFenForPosition`;
3. call the existing `StockfishEngine.analyzePosition` abstraction;
4. use a versioned profile, initially proposed as depth 24 and MultiPV 3;
5. analyse trigger, each tempting response, the first punishment position, and safe defenses;
6. store engine package/version, depth, nodes when available, PVs, and white-centric scores;
7. hash the full evidence payload.

No discovery result in this report invents engine values. The connected research environment did not have a checked-out runtime with the repository's Stockfish dependency, so exact snapshots remain a mandatory pilot gate.

### Population protocol

For each trigger position:

1. use the existing Lichess games client with authenticated access;
2. run the four product speed presets separately where relevant;
3. run `MY_PEERS`, `MY_PEERS_PLUS_ONE`, and selected explicit groups where sample permits;
4. store total games, move counts, result counts, effective speeds/groups, profile version, and fetch time;
5. compare the tempting move against safe alternatives;
6. mark evidence insufficient below an approved sample threshold;
7. do not derive a success claim from final game result alone.

The repository connector used for this discovery has no Lichess access token, so no live named-trap frequency is claimed. This is intentional: the report defines a reproducible gate rather than fabricating statistics.

### Published-source mechanics validated

The source mechanics are independently reproducible from official published data:

- Lichess evaluation exports use four-field position FEN and provide depth, node count, and PVs;
- Lichess recommends choosing the highest-depth evaluation and first PV when one line is needed;
- puzzle records provide source FEN, solution moves, puzzle rating, popularity, play count, themes, source game, and opening tags;
- the puzzle challenge begins after applying the first move from the source FEN;
- game, puzzle, and evaluation exports are CC0.

## Confidence and review policy

Suggested initial confidence rules:

- **LOW** — legal line and source provenance only, or insufficient population/engine evidence;
- **MEDIUM** — engine-validated setup/punishment/escapes plus meaningful population sample;
- **HIGH** — medium criteria plus repeated evidence across populations or dates and editorial review by at least two reviewers.

Confidence is not a probability that the trap will work.

## Product implications

### RB-006 repertoire target

No contract change now.

A future trap-oriented persona may express a preference such as practical surprise, low-theory tactical pressure, or willingness to accept objective risk. It must not turn `trap` into an unrestricted boolean or silently alter factual target evidence.

### RB-007 candidate evidence

No contract change now.

A future extension could attach optional trap evidence to a candidate:

- occurrence/family reference;
- setup soundness;
- target-population temptation;
- punishment summary;
- safe-defense warning;
- source and confidence.

This evidence must remain separate from engine, population, master, personal, and theory-burden evidence.

### RB-003 opening classification

Trap identity must not block on RB-003. Opening references should be optional descriptive links. RB-003 may later improve hierarchy and labels without changing trap occurrence identity.

## Proposed pilot after approval

Create one follow-up implementation task, not several speculative tasks.

Pilot scope:

- 20–50 manually selected examples spanning sound, playable-risk, dubious, refuted, mating, material, and family/transposition cases;
- versioned repository data file, not Prisma;
- deterministic legality/FEN/identity validator;
- existing Stockfish abstraction for evidence snapshots;
- bounded Explorer snapshot script using current population presets;
- review output showing missing evidence and conflicts;
- no API, Angular surface, course writes, or production persistence.

Pilot acceptance should require:

- every line replays legally;
- every occurrence has trigger identity, temptation, punishment, and safe defense;
- every source has verified license/provenance;
- every published recommendation exposes setup soundness;
- numerical evidence is reproducible from stored profile metadata;
- at least one named trap is rejected or downgraded when evidence contradicts folklore.

## Risks

- trap names are inconsistent and sometimes historically disputed;
- user-created study content is not automatically reusable;
- famous lines may be objectively poor or practically obsolete;
- engine upgrades can alter soundness boundaries;
- aggregate game results overstate trap effectiveness;
- sparse deep positions create unstable percentages;
- transposition merging can be incorrect if legal rights differ;
- a trap persona can encourage misleading or unsound recommendations if warnings are hidden;
- a large imported catalogue can become unmaintainable without editorial ownership.

## Final recommendation

**Proceed to a bounded curated pilot after user approval.**

Do not create a production database or modify RB-006/RB-007 contracts now. The repository already has the necessary foundational primitives: normalized position identity, opening labels, cached engine analysis, population profiles, versioned detection conventions, provenance-friendly runs, and course annotations.

The missing capability is not infrastructure. It is a reviewed, versioned knowledge workflow that proves practical temptation and objective consequences can be represented responsibly.

## Roadmap impact

The existing roadmap remains valid.

RB-014 remains independent and non-blocking. A successful pilot could later inform RB-013 trap-oriented personas and optional RB-007 evidence, but no critical-path dependency should be added now.

## Sources

### Repository files

- `packages/chess-domain/src/position.ts`
- `apps/api/src/services/opening-book/openingLookupService.ts`
- `apps/api/src/services/opening-book/openingBook.types.ts`
- `apps/api/src/scripts/update-opening-book.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/modules/analysis/wasm-stockfish-engine.service.ts`
- `apps/api/src/modules/opening-explorer/opening-explorer.service.ts`
- `apps/api/src/modules/opening-explorer/lichess-opening-explorer.client.ts`
- `apps/api/src/modules/lab/tactical-detections/tactical-detection.constants.ts`
- `apps/api/src/modules/lab/tactical-detections/tactical-detection.service.ts`
- `apps/api/src/modules/lab/tactical-detections/tactical-detection.repository.prisma.ts`
- `apps/api/src/modules/scenario-training/scenario-training.schema.ts`
- `apps/api/src/modules/courses/courses.service.ts`
- `docs/tactical-detections.md`

### External sources verified on 2026-07-27

- Lichess open database and licenses: `https://database.lichess.org/`
- Lichess API cloud-evaluation specification: `https://github.com/lichess-org/api/blob/master/doc/specs/tags/analysis/api-cloud-eval.yaml`
- Lichess API specification and Opening Explorer documentation: `https://github.com/lichess-org/api`
- Lichess opening-name dataset and CC0 terms: `https://github.com/lichess-org/chess-openings`
- Lichess Terms of Service and user-content rights: `https://lichess.org/terms-of-service`
- Lichess puzzle themes and public-domain notice: `https://lichess.org/training/themes`

Community studies and videos were inspected only to test naming inconsistency and common example lines. They are not recommended data sources.