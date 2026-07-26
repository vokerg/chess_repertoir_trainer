# Repertoire Builder Program Status

Last updated: 2026-07-26

## Current state

**Program state:** foundation merged and active execution underway.

**Implementation state:** two Stage 1 dual-use foundations are available on `main`: rated Lichess population evidence and versioned cross-pool rating normalization. No interactive repertoire-builder workflow has been implemented yet.

**Planning foundation:** merged through PR #81 at squash commit `ead1d01161228f8dc647a847383f9215a61f966b`.

**Population evidence foundation:** merged through PR #80.

**Rating normalization foundation:** merged through PR #76.

**Jira project:** `CRT` — Chess Repertoire Trainer.

**Jira epic:** `CRT-2` — Repertoire Builder north-star program, `In Progress`.

## Completed program setup

- [x] Recorded the human-controlled repertoire-builder premise.
- [x] Separated intrinsic opening, target population, player profile, and repertoire target.
- [x] Recorded arbitrary speed combinations and controlled General mode.
- [x] Recorded the multi-account level requirement and left its formula open.
- [x] Recorded opening classification as an independent dependency with intentionally blank implementation planning.
- [x] Defined the Player Chess Profile as a standalone and north-star capability.
- [x] Recorded profile override and multiple repertoire personas.
- [x] Recorded visual move choice as required while leaving exact UX open.
- [x] Recorded optional LLM and vague traps research without making them core dependencies.
- [x] Added ordered tasks, claim rules, report templates, and queue governance.
- [x] Created Jira Epic `CRT-2` for the full program.
- [x] Created Jira Tasks `CRT-3` through `CRT-18`, mapped one-to-one to RB-001 through RB-016.
- [x] Applied Jira priorities corresponding to repository P0-P3 priorities.
- [x] Added material Jira `Blocks` links for the foundational profile, target, ranking, builder, and course-delivery chain.
- [x] Added Jira workflow, PR visibility, claiming, reporting, and synchronization rules.
- [x] Merged the planning foundation to `main` through PR #81.

## Runtime foundations now available

### Population evidence — PR #80

PR #80 merged the shared Opening Explorer and Peer games capability to `main`:

- authenticated `/api/masters-explorer` and `/api/lichess-games-explorer` endpoints;
- shared Opening Explorer service, cache, Lichess client, normalized-position reuse, throttling, stale fallback, and request deduplication;
- shared `@chess-trainer/contracts/opening-explorer` schemas;
- optional rated-game month, rating-group, and speed filters;
- arbitrary non-empty combinations of the source's speed buckets;
- source-separated Masters and rated Lichess evidence;
- focused contract, API, repository, service, OpenAPI, store, and widget tests;
- a reusable Peer games Angular widget composed in Opening Analysis behind its own toggle;
- canonical documentation in `docs/opening-explorer.md`.

This is a substantial part of RB-001 / CRT-3, but it does not complete that task. Controlled General weighting, explainable per-speed components, normalized-grade population targeting, direct response-level filter provenance, and sparse-data semantics remain.

### Rating normalization — PR #76

PR #76 merged the shared rating-normalization domain to `main`:

- a versioned `universal-online-strength` profile, currently `2026-07-product-v1`;
- 13 stable product-facing grades;
- calibrated Chess.com and Lichess bullet, blitz, and rapid pools;
- FIDE Standard as reference-only with unsupported lower grades represented as `null`;
- profile source metadata, per-pool confidence, and soft-padding values;
- shared `@chess-trainer/contracts/rating-normalization` schemas;
- helpers to classify one rating into a grade and map a grade back to a source-pool range;
- `GET /api/rating-normalization/default` with Fastify/OpenAPI metadata;
- a reference table in the performance-by-rating lab;
- focused API and Angular store tests;
- canonical guidance in `docs/rating-normalization.md`.

This removes the prerequisite blocker for RB-002 / CRT-4 but does not complete it. Multi-account selection, recency, period behavior, activity weighting, per-speed/overall resolution, contribution evidence, confidence aggregation, exclusions, and override projection remain.

## Jira execution status

- `CRT-2` remains `In Progress` because the program has merged runtime foundations and an active execution queue.
- `CRT-3` remains `To Do`, matching repository state `READY`; no active implementation claim exists.
- `CRT-4` remains `To Do`, now matching repository state `READY`; PR #76 removed its prerequisite blocker, but no active implementation claim exists.
- `CRT-5` through `CRT-18` remain `To Do`, matching their current repository proposed, ready, or blocked states.
- No Jira task is `Done` because none currently satisfies the repository completion protocol in `JIRA.md`.

The CRT workflow is:

```text
To Do → In Progress → In Review → Done
```

Repository-specific states remain more detailed than Jira. See [`JIRA.md`](JIRA.md) for the required mapping and synchronization protocol.

## Resolved external or parallel foundations

### Population explorer

Resolved. The implementation is PR #80 and is merged to `main`. RB-001 / CRT-3 is no longer blocked on discovery and inspection. Its remaining work must extend the verified Opening Explorer and Peer games implementation rather than duplicate it.

### Rating normalization

Resolved. PR #76 is merged to `main`. RB-002 / CRT-4 is no longer blocked on availability of a normalization contract. Its remaining work must reuse the merged stable grade IDs, profile ID/version, source confidence, soft padding, classification helper, and source-range helper rather than introducing a second parity model.

The normalized-grade portion of RB-001 may now rely on the shared profile, but own-level targeting and grade-offset semantics still depend on RB-002's unresolved player-level calculation.

### Visual transformation

A separate visual-transformation program exists. RB-008 / CRT-10 and production UI work should inspect and coordinate with the current visual system before implementation.

## Active claims

None.

Claims belong in individual task files and must be synchronized to their mapped Jira issue before substantive work.

## Recommended next coordination

1. Claim RB-001 / CRT-3 for the remaining weighting, component-explainability, filter-provenance, and sparse-data contract work.
2. Claim RB-002 / CRT-4 for the multi-account level formula, account evidence projection, confidence semantics, and grade-offset source-range behavior using PR #76 as the baseline.
3. Coordinate the normalized-grade population slice of RB-001 with RB-002, but do not block the rest of RB-001 on the player-level formula.
4. Allow RB-003 / CRT-5 opening-classification work to proceed independently when its own planning begins.
5. Consider RB-008 / CRT-10 visual discovery early enough to influence contracts, but do not build production UI from assumptions.
6. Keep PR #80 and PR #76 as the only verified population and rating-parity foundations; do not create parallel feature-local contracts.

## Validation

Performed for this reconciliation:

- inspected merged PR #80 and PR #76 metadata and changed-file lists;
- inspected the current Opening Explorer contracts, routes, product documentation, and Angular usage on `main`;
- inspected the rating-normalization contracts, service helpers, route, canonical documentation, and product usage on `main`;
- compared PR #80 with every RB-001 acceptance criterion;
- compared PR #76 with every RB-002 acceptance criterion;
- inspected all fields for affected Jira issues `CRT-2`, `CRT-3`, `CRT-4`, `CRT-6`, and `CRT-8`;
- preserved priorities, parents, assignees, dependency links, estimates, and workflow states where the merged foundations did not satisfy task outcomes;
- updated the repository queue, roadmap, decisions, questions, task scopes, and reconciliation reports.

Not performed:

- application build;
- unit or integration test execution;
- lint;
- architecture checks;
- browser validation.

Reason: this reconciliation changes planning and Jira metadata only. PR #80 and PR #76 have their own runtime implementation and validation already on `main`; this session did not modify runtime code.

## Current risks

- a raw multi-speed Lichess response is not yet the controlled General weighting required by the north-star decisions;
- response payloads identify a deterministic profile version but do not directly expose the selected month, rating, and speed filters;
- weighted population aggregates do not yet expose per-speed components;
- the rating profile provides grade boundaries, but no player-level formula chooses or combines account evidence;
- soft padding and source confidence exist but their role in multi-account confidence remains unresolved;
- own-level and stronger-level population targeting still need an explicit mapping from resolved player evidence to Lichess Explorer rating buckets;
- opening classification is a required but intentionally undefined dependency;
- visual choice design may change API and state assumptions;
- Jira and repository state can drift if future agents do not follow synchronization rules.

## Update protocol

After every claimed task or meaningful program session:

1. update this status;
2. update the task file;
3. update the mapped Jira issue and links;
4. add or update the required report;
5. assess queue priority and dependencies;
6. update roadmap, decisions, and open questions where evidence changed them;
7. ensure branch and PR visibility in Jira.
