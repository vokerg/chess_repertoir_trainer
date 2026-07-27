# Curated trap knowledge pilot

RB-017 is a bounded evidence and validation pilot. It is not a production traps database or product feature.

## Current state

The initial implementation slice contains three source-controlled seed occurrences:

- Légal trap;
- Blackburne–Shilling;
- Fishing Pole.

They were selected because they stress different model boundaries: offer versus temptation, dubious setup versus conditional punishment, and family/move-order complexity.

The approved pilot is not complete until the corpus contains 20–50 reviewed occurrences and the required evidence snapshots and review report exist.

## Files

- `apps/api/src/modules/trap-pilot/trap-pilot.types.ts` — pilot-only canonical data contract.
- `apps/api/src/modules/trap-pilot/trap-pilot.data.ts` — canonical source-controlled editorial records.
- `apps/api/src/modules/trap-pilot/trap-pilot.validator.ts` — deterministic structural validation and review output.
- `apps/api/src/modules/trap-pilot/trap-pilot.analysis-targets.ts` — derives trigger, response, punishment, and defense positions for engine review.
- `apps/api/src/modules/trap-pilot/trap-pilot.evidence.ts` — derived evidence bundle types and stable hashing.
- `apps/api/src/modules/trap-pilot/trap-pilot.evidence.generated.ts` — source-controlled generated evidence snapshots.
- `apps/api/src/modules/trap-pilot/trap-pilot.evidence.validator.ts` — dataset/version/identity/hash cross-validation.
- `apps/api/src/modules/trap-pilot/trap-pilot.population-evidence.ts` — bounded Explorer snapshot capture.
- `apps/api/src/scripts/validate-trap-pilot.ts` — validation command.
- `apps/api/src/scripts/refresh-trap-pilot-engine-evidence.ts` — explicit opt-in engine refresh.
- `apps/api/src/scripts/refresh-trap-pilot-population-evidence.ts` — explicit opt-in Explorer refresh.
- `apps/api/test/trap-pilot/` — deterministic offline regression tests.

No Prisma model, migration, route, OpenAPI contract, MCP tool, Angular component, or course-writing behavior is introduced.

## Run validation

From the repository root:

```bash
npm run traps:validate --workspace=apps/api
```

The command validates canonical records and the separate generated evidence bundle. It exits non-zero for structural, identity, version, or payload-hash errors.

During the seed stage, incomplete pilot size and missing evidence are reported as warnings rather than hidden or converted to zero values. The normal API test runner recursively discovers all trap-pilot `.test.mjs` files.

## Identity

An occurrence identity is derived from:

- normalized four-field trigger FEN;
- side setting the trap;
- declared offer move when present;
- ordered tempting-response move sequences;
- ordered punishment references and move sequences.

Opening names, ECO codes, aliases, explanations, and setup-route labels do not determine identity.

Alternate setup routes may belong to one occurrence only when replay reaches the same normalized legal trigger. Related ideas from different positions use a family identifier instead of being collapsed. Castling and legally relevant en-passant state remain part of the normalized trigger identity.

## Structural validation

The canonical validator verifies:

- UCI format and legal replay with `chess.js`;
- declared trigger FEN against every setup route;
- opponent-to-move state at the trigger;
- convergence of alternate setup routes;
- unique record, response, and occurrence identities;
- legal tempting-response and punishment branches;
- legal safe defenses distinct from the tempting first move;
- punishment coverage for every tempting response;
- lifecycle restrictions for records claiming `VALIDATED`;
- source, license, version, and timestamp provenance;
- explicit engine and population evidence state.

The evidence validator additionally verifies:

- evidence schema and canonical dataset version;
- record existence and current occurrence identity;
- deterministic payload hashes;
- duplicate profile snapshots;
- engine target and population trigger FENs;
- canonical `AVAILABLE` markers against generated snapshots;
- stale or unreferenced evidence.

## Evidence boundary

Canonical editorial records and derived evidence snapshots are separate source-controlled structures.

Refreshing evidence does not rewrite record identity, lifecycle, soundness, explanations, or review decisions. A curator must review a generated snapshot and explicitly update the canonical evidence marker before a record can claim `AVAILABLE` or `VALIDATED`.

### Engine evidence

The intended first profile is `trap-pilot-stockfish` / `depth-24-multipv-3-v1`.

The refresh command reuses the existing `StockfishEngine` abstraction and analyses positions derived from the canonical records. It writes only `trap-pilot.evidence.generated.ts`; it does not persist or overwrite shared `PositionAnalysis` rows.

Example using the repository's WASM engine:

```bash
TRAP_PILOT_REFRESH_ENGINE=1 \
STOCKFISH_ENGINE=wasm \
npm run traps:refresh-engine --workspace=apps/api
```

For an external local binary, also provide auditable engine metadata:

```bash
TRAP_PILOT_REFRESH_ENGINE=1 \
STOCKFISH_ENGINE=local \
STOCKFISH_PATH=/path/to/stockfish \
TRAP_PILOT_ENGINE_VERSION="Stockfish 18 build ..." \
npm run traps:refresh-engine --workspace=apps/api
```

Optional controls:

- `TRAP_PILOT_RECORD_IDS=id-one,id-two` limits the refresh to named canonical records;
- `TRAP_PILOT_ENGINE_DEPTH` defaults to `24`;
- `TRAP_PILOT_ENGINE_MULTIPV` defaults to `3` and is capped at `3`;
- `TRAP_PILOT_ENGINE_TIMEOUT_MS` defaults to at least 120 seconds per target.

The snapshot retains engine type/version, profile version, depth, MultiPV, white-centric scores, PVs, capture time, occurrence identity, and payload hash.

### Population evidence

The intended profile is `lichess-games-explorer` / `product-speed-rating-presets-v1`.

The refresh command reuses the existing serialized and rate-limited Lichess Games client plus the existing product speed/rating population resolver. It captures `ALL` rating groups for one explicit product speed preset; it does not use a hidden player-specific peer resolution.

```bash
TRAP_PILOT_REFRESH_POPULATION=1 \
TRAP_PILOT_LICHESS_TOKEN=... \
TRAP_PILOT_SPEED_PRESET=BLITZ_AND_SLOWER \
npm run traps:refresh-population --workspace=apps/api
```

Optional controls:

- `TRAP_PILOT_RECORD_IDS=id-one,id-two` limits the refresh;
- `TRAP_PILOT_SPEED_PRESET` accepts `ALL`, `BLITZ_AND_SLOWER`, `BLITZ`, or `BULLET`.

The snapshot retains requested preset, effective speeds and rating groups, total/move result counts, average rating, capture time, occurrence identity, profile version, and payload hash.

The access token is read from the environment and is never written into the generated bundle. Deterministic tests use a fake client and never require network access or credentials.

`MISSING` and `INSUFFICIENT` are first-class states. They must not be interpreted as zero frequency, zero tactical value, or evidence that a trap is ineffective.

## Source policy

Reusable source inputs are limited to:

- CC0 Lichess game, puzzle, and evaluated-position exports;
- CC0 `lichess-org/chess-openings` metadata;
- original application analysis;
- original reviewed editorial text.

Public studies, videos, forums, blogs, books, commercial databases, and third-party trap collections are discovery leads only unless their specific reuse license is verified. Public visibility is not a reuse license.

The current seed prose and classifications are project-original summaries of the approved RB-014 research. No third-party prose is copied.

## Completion gates

RB-017 remains incomplete until:

- 20–50 reviewed occurrences are present;
- representative sound, playable-risk, dubious, refuted, mating, material, family, and transposition cases are covered;
- engine and population snapshots are reproducible from retained metadata;
- missing/insufficient evidence is reviewed explicitly;
- review output identifies accepted, downgraded, rejected, duplicate, conflicting, and unresolved records;
- at least one famous trap is downgraded or rejected because validated evidence contradicts folklore;
- a final report recommends production, revision, or deferral;
- complete repository CI passes.

Any production persistence, public contract, UI, course integration, or candidate-evidence integration requires a separate user decision after the pilot report.
