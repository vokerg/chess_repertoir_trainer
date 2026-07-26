# Repertoire Builder Program Status

Last updated: 2026-07-26

## Current state

**Program state:** foundation merged; population direction revised and RB-001 claimed for implementation.

**Implementation state:** PR #80 provides rated Lichess population evidence and PR #76 provides the current versioned cross-pool normalization profile. RB-001 implementation is now claimed on PR #84. No interactive repertoire-builder workflow has been implemented.

**Planning foundation:** merged through PR #81, with later reconciliation through PR #83.

**Active implementation PR:** #84 — `CRT-3 RB-001: deliver peer population presets`.

**Jira project:** `CRT` — Chess Repertoire Trainer.

**Jira epic:** `CRT-2` — Repertoire Builder north-star program, `In Progress`.

## Runtime foundations on `main`

### Population evidence — PR #80

Available now:

- authenticated Masters and rated Lichess Opening Explorer endpoints;
- shared service, cache, contracts, normalized-position reuse, throttling, stale fallback and request deduplication;
- raw optional month, rating-group and speed filters;
- one mixed upstream response and one mixed cache profile per complete filter combination;
- reusable Peer games widget in Opening Analysis;
- canonical runtime documentation in `docs/opening-explorer.md`.

### Rating normalization — PR #76

Available now:

- profile `universal-online-strength`, version `2026-07-product-v1`;
- 13 current product-facing grades;
- Chess.com and Lichess bullet, blitz and rapid ranges;
- source confidence and soft padding;
- classification/range helpers, API, tests and `docs/rating-normalization.md`.

These are implementation baselines, not the final north-star product policy.

## Revised RB-001 direction

RB-001 / CRT-3 is defined as a simplification and productization task:

- replace raw speed checkboxes with fixed presets: All speeds, Blitz and slower, Blitz, Bullet;
- exclude ultraBullet;
- replace rating-group checkboxes with one target: All players, My peers, My peers and above, or one explicit Lichess group;
- default to **Blitz and slower** plus **My peers and above**;
- remove user-selected public-game month bounds;
- keep one mixed Lichess request and the existing mixed cache architecture;
- accept the upstream aggregate without client-side per-speed weighting;
- create a new versioned normalization profile aligned directly to Lichess Explorer groups;
- map Chess.com bullet, blitz and rapid into those benchmark bands;
- resolve a temporary dominant peer range from recent three-month imported games, then all history, then a generic 1500 fallback;
- expose requested and effective population provenance directly in the response;
- keep services reusable by the future builder.

The exact dominant-range coverage threshold remains an RB-001 implementation decision that must be versioned, documented and tested.

## Player-level boundary

RB-002 / CRT-4 follows RB-001 rather than running independently.

RB-001 owns the bounded on-demand peer-band resolver needed by Opening Analysis. RB-002 owns the later durable multi-account player-level projection, storage/snapshot decision, confidence, exclusions and overrides. It must reuse the RB-001 profile and resolver boundary.

Repository state:

- RB-001: `CLAIMED` by ChatGPT on `north-star/rb-001-peer-presets-replan`;
- RB-002: `BLOCKED` on RB-001;
- RB-003: independent `PROPOSED` planning;
- downstream profile, target and ranking tasks remain blocked.

## Target-contract impact

RB-006 / CRT-8 must model the fixed speed presets and rating targets from RB-001. The previous arbitrary weighted speed-set and controlled-General assumptions are no longer the intended MVP contract.

A factual peer band may initialize a target, but explicit manual group selection remains authoritative and must not mutate the factual player-level projection.

## Jira execution status

- `CRT-2` remains `In Progress`.
- `CRT-3` is assigned for the RB-001 implementation claim; transition to `In Progress` follows the first substantive implementation commit.
- `CRT-4` remains `To Do`, with repository status `BLOCKED` on CRT-3's benchmark profile/resolver boundary.
- downstream Jira tasks remain `To Do`.
- no issue is moved to `Done` by the claim.

The material CRT-3 blocks CRT-4 dependency is present in Jira.

## Active claims

### RB-001 / CRT-3

- Claimed by: ChatGPT
- Branch: `north-star/rb-001-peer-presets-replan`
- PR: #84
- Scope: normalization profile, temporary peer resolver, Opening Explorer presets/provenance, compact Peer games UI, tests, runtime docs and completion synchronization.

## Recommended execution sequence

1. Implement and test the Lichess-benchmark profile version.
2. Implement the provider/speed-aware peer resolver over bounded imported-game evidence.
3. Replace the rated Explorer raw query with preset resolution and direct provenance.
4. Replace the Peer games controls with two compact selects.
5. Update runtime documentation and validation.
6. Produce the completion report and synchronize Jira/queue status.
7. Unblock RB-002 only after the shared benchmark/resolver boundary is available.

## Validation for the planning and claim updates

Performed:

- inspected current RB-001, RB-002 and RB-006 task files;
- inspected `TASKS.md`, `ROADMAP.md`, `STATUS.md`, `DECISIONS.md`, `OPEN_QUESTIONS.md` and `FEATURES.md`;
- inspected current Opening Explorer service, client, cache repository, contracts and Peer games widget;
- inspected current rating-normalization profile/service/documentation;
- inspected current account rating/performance projection and imported game-recorded rating usage;
- inspected Jira CRT-2, CRT-3, CRT-4, CRT-6 and CRT-8 assumptions;
- opened PR #84 and synchronized the affected Jira descriptions/comments/dependency;
- recorded the visible RB-001 claim on PR #84.

Not yet performed:

- runtime code changes beyond the claim metadata;
- builds, tests, lint or browser validation;
- data migration;
- Jira `In Progress` transition.

## Current risks

- the new Chess.com-to-Lichess benchmark boundaries still require careful versioned calibration;
- a dominant-range formula can hide genuine multi-speed divergence if its threshold is poorly chosen;
- correspondence and classical may be queried but currently lack supported personal rating evidence;
- a generic fallback can look factual unless provenance is visible;
- activating a new normalization profile may affect the lab consumer and future durable references;
- backward compatibility for the raw rated Explorer query must be handled deliberately;
- runtime documentation must match the delivered implementation exactly.

## Update protocol

After every claimed task or meaningful program session:

1. update this status;
2. update the task file;
3. update the mapped Jira issue and links;
4. add or update the required report;
5. assess queue priority and dependencies;
6. update roadmap, decisions and open questions where evidence changed them;
7. ensure branch and PR visibility in Jira.