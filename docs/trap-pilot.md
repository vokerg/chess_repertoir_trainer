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

- `apps/api/src/modules/trap-pilot/trap-pilot.types.ts` — pilot-only data contract.
- `apps/api/src/modules/trap-pilot/trap-pilot.data.ts` — canonical source-controlled records.
- `apps/api/src/modules/trap-pilot/trap-pilot.validator.ts` — deterministic structural validation and review output.
- `apps/api/src/scripts/validate-trap-pilot.ts` — validation command.
- `apps/api/test/trap-pilot/trap-pilot-validator.test.mjs` — offline regression tests.

No Prisma model, migration, route, OpenAPI contract, MCP tool, Angular component, or course-writing behavior is introduced.

## Run validation

From the repository root:

```bash
npm run traps:validate --workspace=apps/api
```

The command exits non-zero for structural errors. During the seed stage, incomplete pilot size and missing evidence are reported as warnings rather than hidden or converted to zero values.

The normal API test runner recursively discovers the trap-pilot test because it ends with `.test.mjs`.

## Identity

An occurrence identity is derived from:

- normalized four-field trigger FEN;
- side setting the trap;
- declared offer move when present;
- ordered tempting-response move sequences;
- ordered punishment references and move sequences.

Opening names, ECO codes, aliases, explanations, and setup-route labels do not determine identity.

Alternate setup routes may belong to one occurrence only when replay reaches the same normalized legal trigger. Related ideas from different positions use a family identifier instead of being collapsed.

## Structural validation

The validator currently verifies:

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

## Evidence boundary

Canonical editorial data and derived evidence are separate.

### Engine evidence

The intended first profile is recorded as `trap-pilot-stockfish` / `depth-24-multipv-3-v1`.

A future opt-in refresh command must use the existing `StockfishEngine` abstraction and retain engine identity, profile version, depth, MultiPV lines, white-centric scores, timestamp, and payload hash. Pilot runs must not overwrite shared `PositionAnalysis` rows.

### Population evidence

The intended profile is recorded as `lichess-games-explorer` / `product-speed-rating-presets-v1`.

A future opt-in refresh command must reuse existing product speed presets and rating groups, preserve requested and effective populations, counts, profile version, and timestamp, and respect authentication and rate limits. Deterministic tests must use stored fixtures and must never require live Explorer access.

`MISSING` and `INSUFFICIENT` are first-class states. They must not be interpreted as zero frequency or zero tactical value.

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
