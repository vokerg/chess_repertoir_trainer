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

Claim scope: implement the approved bounded trap-data and validator pilot. The work is limited to a versioned repository dataset, deterministic validation, reproducible evidence snapshots, tests, review output, and documentation. It does not add production persistence, API/MCP contracts, Angular UI, course writes, or repertoire-builder integration.

GitHub issue: #114

Claim PR: #115

Implementation PR: #117, draft

## Outcome

Prove whether a small curated trap corpus can be represented, validated, versioned, and reviewed responsibly using the repository's existing chess-domain, Stockfish, Opening Explorer, and provenance conventions.

The pilot is evidence for a future product decision. It is not a production traps capability.

## Dependency

RB-014 / #102 is complete through squash-merged PR #113. Its definition, source policy, identity model, and validation workflow are binding inputs for this pilot.

## Required repository patterns

Before implementation, inspect and reuse:

- `normalizeFenForPosition` and existing position-key semantics;
- opening-book update scripts and generated-data conventions;
- the `StockfishEngine` abstraction and stored white-centric engine-line representation;
- tactical-detection version/hash/run provenance patterns;
- existing Lichess Opening Explorer clients, speed presets, rating groups, caching, and population provenance;
- API test-runner registration and architecture guardrails.

## In scope

- 20–50 manually selected trap occurrences spanning:
  - sound;
  - playable-risk;
  - dubious;
  - refuted;
  - mating;
  - material;
  - family and transposition cases;
- a versioned repository data file rather than Prisma storage;
- a typed conceptual/data contract for the pilot only;
- deterministic validation of:
  - legal setup routes;
  - normalized trigger positions;
  - side and move sequencing;
  - occurrence identity and duplicate detection;
  - tempting response references;
  - punishment lines;
  - safe defenses or explicit refutation state;
  - source/license/provenance metadata;
- versioned Stockfish evidence snapshots using the existing engine abstraction;
- bounded Lichess Explorer population snapshots using existing speed and rating presets;
- explicit insufficient-evidence states;
- human-readable review output for missing, conflicting, duplicate, downgraded, and rejected records;
- automated tests and concise operating documentation.

## Out of scope

- Prisma models or migrations;
- production database import;
- public REST, OpenAPI, MCP, or frontend contracts;
- Angular pages, components, dialogs, or workbench integration;
- course creation or mutation;
- candidate-ranking or repertoire-target contract changes;
- automatic bulk publication from puzzles or games;
- unlicensed copied prose, annotations, studies, videos, books, commercial databases, or third-party trap collections;
- LLM-generated factual trap records;
- claims of success rate based only on final game results;
- fabricated engine or population values.

## Implemented boundary

The current branch uses an isolated module under `apps/api/src/modules/trap-pilot` and script/test conventions already present in the API workspace.

Implemented:

- pilot-only typed canonical record model;
- source-controlled seed dataset;
- deterministic legality, normalized-FEN, side-to-move, route-convergence, identity, duplicate, punishment, safe-defense, lifecycle, and provenance validation;
- separate source-controlled generated evidence bundle;
- stable evidence hashing and stale-identity/version validation;
- deterministic engine target derivation;
- explicit opt-in Stockfish refresh through the existing engine abstraction;
- explicit opt-in Lichess Games Explorer refresh through existing product speed/rating presets;
- fixture-backed tests that require neither live Stockfish nor network credentials;
- validation and operating documentation.

The canonical dataset remains source-controlled and reviewable. Refresh commands write only the pilot evidence bundle and never write shared production caches.

## Identity rules

An occurrence is anchored by:

- normalized trigger FEN;
- side setting the trap;
- ordered offer and/or tempting-response UCI sequence;
- punishment identity.

Opening name and ECO are descriptive metadata. Alternate legal setup routes can attach to one occurrence when they reach the same normalized legal trigger. Related ideas from non-identical triggers use a trap-family reference rather than being collapsed.

## Evidence rules

### Engine

- use the repository's existing Stockfish abstraction;
- use one explicit versioned analysis profile;
- preserve engine/package identity, depth, MultiPV, PVs, and white-centric scores;
- analyse trigger, tempting response, first punishment position, and declared safe defenses;
- hash the evidence payload;
- never overwrite shared `PositionAnalysis` with pilot analysis.

### Population

- use existing product speed presets and Lichess rating groups;
- preserve requested and effective populations, counts, profile version, and fetch timestamp;
- compare tempting responses with safe alternatives;
- mark unavailable or undersized samples explicitly;
- do not infer trap success from final result alone.

### Editorial

- preserve title, aliases, family, explanation, warnings, source rationale, reviewer status, and lifecycle state;
- separate setup soundness from practical temptation and punishment severity;
- retain reasons for validation, downgrade, rejection, deprecation, or refutation;
- require a deliberate canonical marker update after generated evidence is reviewed.

## Acceptance criteria

- The source-controlled pilot contains between 20 and 50 reviewed occurrences.
- Every setup route and branch replays legally with `chess.js`.
- Every occurrence has a stable normalized identity and duplicate validation.
- Every occurrence has a tempting response, punishment, and at least one safe defense or explicit refutation state.
- Every reusable source has verified license and provenance metadata.
- Engine evidence is reproducible from retained profile/version metadata.
- Population evidence is reproducible from retained target/profile/timestamp metadata.
- Missing and insufficient evidence are explicit and do not become zeroes.
- Review output identifies conflicts, duplicates, unsupported claims, and lifecycle changes.
- At least one famous trap is rejected or downgraded when evidence contradicts folklore.
- No production capability is claimed or exposed.
- Complete repository CI passes.

## Required validation

- targeted unit tests for parsing, legality, normalization, identity, duplicate detection, provenance, evidence hashing, and review classification;
- deterministic fixture tests that do not require live network access;
- explicit opt-in commands for refreshing engine and population snapshots;
- documented live credentials/rate-limit behavior for population refreshes;
- repository lint, build, architecture guardrails, migrations, and full test suite.

## Initial implementation slice

The first slice deliberately contains only three structurally different seed records. It exposes, rather than hides, the remaining pilot-size and live-evidence gaps.

Seed coverage:

- Légal trap: sacrifice/offer distinct from the tempting response;
- Blackburne–Shilling: dubious setup separated from conditional punishment;
- Fishing Pole: family, move-order, multiple-defense, normalized en-passant, and positional-consequence complexity.

The structural slice passed complete repository CI. The evidence-refresh extension is currently being validated in draft PR #117.

## Remaining work

- expand from 3 to 20–50 legally validated reviewed occurrences;
- cover sound, playable-risk, dubious, refuted, mating, material, family, and transposition cases;
- execute and review reproducible engine and population snapshots in an environment with Stockfish and Lichess credentials;
- add explicit minimum-sample and review-classification policy;
- produce accepted, downgraded, rejected, duplicate, conflicting, and unresolved review output;
- demonstrate at least one folklore downgrade or rejection;
- add the final pilot report and recommendation.

## Completion updates

On completion:

- add a pilot report with accepted, downgraded, rejected, and unresolved examples;
- state whether a production trap capability is justified, needs revision, or should be deferred;
- state whether RB-006/RB-007 require any future optional contract extension;
- update RB-D027 and remaining trap questions;
- do not create production follow-up issues without user review.

## Completion

Report: pending

Completed at: pending