# Curated trap knowledge pilot

RB-017 is a bounded evidence and validation pilot. It is not a production traps database or product feature.

## Current state

The canonical source-controlled dataset is `2026-07-pilot-v2` and contains 50 `DRAFT` trap occurrences.

The corpus deliberately spans:

- mating and material punishments;
- positional and initiative-based consequences;
- sound, playable-risk, dubious, and currently unassessed setups;
- repeated named families with distinct trigger positions and move orders;
- open games, gambits, Sicilian/Caro-Kann/Pirc structures, queen-pawn openings, Indian openings, and flank examples.

All records remain evidence-dependent. A legal move sequence is not proof that a setup is objectively sound, practically common, or suitable for publication.

## Files

- `apps/api/src/modules/trap-pilot/trap-pilot.types.ts` — pilot-only canonical data contract.
- `apps/api/src/modules/trap-pilot/trap-pilot.data.ts` — canonical source-controlled dataset.
- `apps/api/src/modules/trap-pilot/trap-pilot.candidates*.ts` — grouped editorial candidate records.
- `apps/api/src/modules/trap-pilot/trap-pilot.validator.ts` — deterministic structural validation.
- `apps/api/src/modules/trap-pilot/trap-pilot.review.ts` — deterministic review classification.
- `apps/api/src/modules/trap-pilot/trap-pilot.analysis-targets.ts` — derives engine-review positions.
- `apps/api/src/modules/trap-pilot/trap-pilot.evidence.ts` — evidence types and stable hashing.
- `apps/api/src/modules/trap-pilot/trap-pilot.evidence.generated.ts` — source-controlled generated snapshots.
- `apps/api/src/modules/trap-pilot/trap-pilot.evidence.validator.ts` — version, identity, and payload validation.
- `apps/api/src/modules/trap-pilot/trap-pilot.population-evidence.ts` — bounded Explorer snapshot capture.
- `apps/api/src/scripts/validate-trap-pilot.ts` — validation and review report command.
- `apps/api/src/scripts/refresh-trap-pilot-engine-evidence.ts` — explicit opt-in engine refresh.
- `apps/api/src/scripts/refresh-trap-pilot-population-evidence.ts` — explicit opt-in Explorer refresh.
- `apps/api/test/trap-pilot/` — deterministic offline regression tests.

No Prisma model, migration, route, OpenAPI contract, MCP tool, Angular component, course write, or shared `PositionAnalysis` mutation is introduced.

## Validation

From the repository root:

```bash
npm run traps:validate --workspace=apps/api
```

The API test command runs this validator before the remaining test files. CI also uploads the complete validation output as the `trap-pilot-validation` artifact.

The validator checks:

- UCI format and legal replay with `chess.js`;
- declared trigger FEN and opponent-to-move state;
- convergence of alternate setup routes;
- unique record, response, and occurrence identities;
- legal tempting responses, punishments, and safe defenses;
- punishment coverage for every tempting response;
- lifecycle restrictions for records claiming `VALIDATED`;
- source, license, version, and timestamp provenance;
- explicit engine and population evidence states.

The evidence validator additionally checks:

- evidence schema and canonical dataset version;
- record existence and current occurrence identity;
- deterministic payload hashes;
- duplicate profile snapshots;
- engine target and population trigger FENs;
- stale, unreferenced, or falsely marked evidence.

## Identity

An occurrence identity is derived from:

- normalized four-field trigger FEN;
- side setting the trap;
- declared offer move when present;
- ordered tempting-response sequences;
- ordered punishment references and move sequences.

Opening names, ECO codes, aliases, explanations, and setup-route labels are descriptive and do not determine identity. Related ideas from non-identical positions use a family identifier instead of being collapsed.

## Evidence boundary

Canonical editorial records and generated evidence snapshots are separate structures. Refreshing evidence cannot rewrite record identity, lifecycle, soundness, explanations, or review decisions.

A curator must review generated evidence and deliberately update the canonical marker before a record can claim `AVAILABLE` or `VALIDATED`.

### Engine evidence

The intended profile is `trap-pilot-stockfish` / `depth-24-multipv-3-v1`.

Before running locally, check out or pull the latest `rb-017/issue-114-curated-traps-pilot` branch. The dataset and empty evidence bundle must both report `2026-07-pilot-v2`.

Using the repository WASM engine:

```bash
TRAP_PILOT_REFRESH_ENGINE=1 \
STOCKFISH_ENGINE=wasm \
npm run traps:refresh-engine --workspace=apps/api
```

Using a local binary:

```bash
TRAP_PILOT_REFRESH_ENGINE=1 \
STOCKFISH_ENGINE=local \
STOCKFISH_PATH=/path/to/stockfish \
TRAP_PILOT_ENGINE_VERSION="Stockfish build ..." \
npm run traps:refresh-engine --workspace=apps/api
```

Optional controls:

- `TRAP_PILOT_RECORD_IDS=id-one,id-two` limits the refresh;
- `TRAP_PILOT_ENGINE_DEPTH` defaults to `24`;
- `TRAP_PILOT_ENGINE_MULTIPV` defaults to `3` and is capped at `3`;
- `TRAP_PILOT_ENGINE_TIMEOUT_MS` defaults to at least 120 seconds per target.

The command writes only the pilot evidence bundle and retains engine identity, profile version, depth, MultiPV, white-centric scores, PVs, capture time, occurrence identity, and payload hash.

### Population evidence

The intended profile is `lichess-games-explorer` / `product-speed-rating-presets-v1`.

```bash
TRAP_PILOT_REFRESH_POPULATION=1 \
TRAP_PILOT_LICHESS_TOKEN=... \
TRAP_PILOT_SPEED_PRESET=BLITZ_AND_SLOWER \
npm run traps:refresh-population --workspace=apps/api
```

Optional controls:

- `TRAP_PILOT_RECORD_IDS=id-one,id-two` limits the refresh;
- `TRAP_PILOT_SPEED_PRESET` accepts `ALL`, `BLITZ_AND_SLOWER`, `BLITZ`, or `BULLET`.

The token is read from the environment and is never written into the generated bundle. Normal tests use a fake client and require neither credentials nor network access.

`MISSING` and `INSUFFICIENT` are first-class states. They are not zero frequency, zero tactical value, or proof that a trap is ineffective.

## Source policy

Reusable source inputs are limited to:

- CC0 Lichess game, puzzle, and evaluated-position exports;
- CC0 `lichess-org/chess-openings` metadata;
- original application analysis;
- original reviewed editorial text.

Public studies, videos, forums, blogs, books, commercial databases, and third-party trap collections are discovery references only unless their specific reuse license is verified. Public visibility is not a reuse license. The pilot summaries and classifications are project-original; third-party prose is not copied.

## Completion gates

RB-017 remains incomplete until:

- all 50 occurrences pass repository validation;
- engine and population snapshots are reproducible from retained metadata;
- missing and insufficient evidence is reviewed explicitly;
- review output identifies accepted, downgraded, rejected, duplicate, conflicting, and unresolved records;
- at least one famous trap is downgraded or rejected because validated evidence contradicts folklore;
- a final report recommends production, revision, or deferral;
- complete repository CI passes.

Any production persistence, public contract, UI, course integration, or candidate-evidence integration requires a separate user decision after the pilot report.
