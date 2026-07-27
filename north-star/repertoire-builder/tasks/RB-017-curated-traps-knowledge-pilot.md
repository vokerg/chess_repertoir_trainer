# RB-017 — Validate curated traps knowledge pilot

Status: IN_PROGRESS

Priority: P2

Order: 145

Delivery class: Dual-use pilot

Planning maturity: Ready for execution

Claimed by: ChatGPT session

Claim branch: `rb-017/issue-114-traps-pilot-claim`

Implementation branch: `rb-017/issue-114-curated-traps-pilot`

Claimed at: 2026-07-27

GitHub issue: #114

Claim PR: #115

Implementation PR: #117, draft

## Outcome

Prove whether a curated trap corpus can be represented, validated, evidenced, versioned, and reviewed responsibly using existing chess-domain, Stockfish, Opening Explorer, provenance, test, and generated-data conventions.

The pilot is evidence for a future product decision. It is not a production traps capability.

## Dependency

RB-014 / #102 is complete through squash-merged PR #113. Its definition, source policy, identity model, and validation workflow are binding inputs.

## Current checkpoint

The implementation branch contains dataset `2026-07-pilot-v2` with 50 source-controlled `DRAFT` occurrences.

Implemented:

- pilot-only canonical record model;
- 50 grouped trap occurrences spanning open games, gambits, Sicilian/Caro-Kann/Pirc structures, queen-pawn openings, Indian openings, and flank examples;
- mating, material, decisive-evaluation, and positional-bind punishment classifications;
- distinct family occurrences for materially different trigger positions and move orders;
- deterministic legality, normalized-FEN, side-to-move, route-convergence, identity, duplicate, punishment, safe-defense, lifecycle, and provenance validation;
- separate source-controlled generated evidence bundle;
- stable evidence hashing and stale identity/version validation;
- deterministic engine target derivation;
- opt-in Stockfish refresh through the existing engine abstraction;
- opt-in Lichess Games Explorer refresh through existing speed and rating presets;
- deterministic review output;
- fixture-backed tests requiring neither live Stockfish nor network credentials;
- explicit validator execution and uploaded CI report artifact;
- operating documentation;
- complete repository CI passing for the 50-record corpus.

Every record remains `DRAFT`. Legal replay does not establish setup soundness, practical frequency, or publication suitability.

## In scope

- 20–50 manually selected trap occurrences spanning sound, playable-risk, dubious, refuted, mating, material, family, and transposition cases;
- versioned repository data rather than Prisma storage;
- deterministic validation of legal routes, normalized identities, temptation, punishment, defenses, and provenance;
- versioned Stockfish evidence using the existing engine abstraction;
- bounded Lichess Explorer population evidence using existing speed/rating presets;
- explicit insufficient-evidence states;
- human-readable accepted, downgraded, rejected, duplicate, conflicting, and unresolved review output;
- automated tests, operating documentation, and a final recommendation.

## Out of scope

- Prisma models, migrations, or production imports;
- REST, OpenAPI, MCP, or frontend contracts;
- Angular UI;
- course writes or automatic repertoire-builder integration;
- RB-006/RB-007 contract changes;
- automatic bulk publication from puzzles or games;
- copied unlicensed prose, annotations, studies, videos, books, commercial databases, or third-party collections;
- fabricated engine or population values;
- success-rate claims based only on final game results.

## Identity rules

An occurrence is anchored by normalized trigger FEN, side setting the trap, offer/tempting-response sequence, and punishment identity. Opening names and ECO codes are descriptive. Alternate setup routes can share an occurrence only when they converge on the same normalized legal trigger. Related ideas from non-identical triggers use a family reference.

## Evidence rules

### Engine

- use the existing `StockfishEngine` abstraction;
- preserve engine/package identity, profile version, depth, MultiPV, PVs, and white-centric scores;
- analyse trigger, tempting response, first punishment position, and declared defenses;
- hash evidence payloads;
- never overwrite shared `PositionAnalysis` rows.

### Population

- use existing product speed presets and Lichess rating groups;
- preserve requested/effective populations, counts, profile version, and fetch timestamp;
- compare tempting responses with safe alternatives;
- mark unavailable or undersized samples explicitly;
- do not infer trap success from final results alone.

### Editorial

- preserve title, aliases, family, explanation, warnings, source rationale, review state, and lifecycle;
- separate setup soundness from practical temptation and punishment severity;
- retain reasons for validation, downgrade, rejection, deprecation, or refutation;
- require a deliberate canonical marker update after generated evidence is reviewed.

## Acceptance criteria

- The pilot contains 50 reviewed occurrences.
- Every route and branch replays legally with `chess.js`.
- Every occurrence has a stable normalized identity and duplicate validation.
- Every occurrence has a tempting response, punishment, and safe defense or explicit refutation state.
- Every reusable source has verified license and provenance metadata.
- Engine and population evidence are reproducible from retained metadata.
- Missing and insufficient evidence remain explicit.
- Review output identifies unsupported claims and lifecycle changes.
- At least one famous trap is rejected or downgraded when evidence contradicts folklore.
- No production capability is claimed or exposed.
- Complete repository CI passes.

## Required validation

- targeted tests for legality, normalization, identity, duplicate detection, provenance, evidence hashing, and review classification;
- deterministic fixture tests without live network dependencies;
- explicit opt-in engine and population refresh commands;
- documented credential and rate-limit behavior;
- repository lint, build, opening audits, architecture guardrails, migrations, validator, and full tests.

## Remaining work

- execute and review Stockfish snapshots;
- execute and review bounded Lichess population snapshots;
- apply explicit minimum-sample and editorial classification policy;
- produce accepted, downgraded, rejected, duplicate, conflicting, and unresolved results;
- demonstrate at least one evidence-backed folklore downgrade or rejection;
- write the final pilot report and production/revision/deferral recommendation.

## Completion

Report: pending

Completed at: pending
