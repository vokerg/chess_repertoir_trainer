# Repertoire Builder Program Status

Last updated: 2026-07-26

## Current state

**Program state:** foundation merged; population direction revised before RB-001 implementation.

**Implementation state:** PR #80 provides rated Lichess population evidence and PR #76 provides the current versioned cross-pool normalization profile. No interactive repertoire-builder workflow has been implemented.

**Planning foundation:** merged through PR #81, with later reconciliation through PR #83.

**Current planning PR:** [#84](https://github.com/vokerg/chess_repertoir_trainer/pull/84) from `north-star/rb-001-peer-presets-replan` to `main`.

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

RB-001 / CRT-3 is now defined as a simplification and productization task:

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

RB-002 / CRT-4 now follows RB-001 rather than running independently.

RB-001 owns the bounded on-demand peer-band resolver needed by Opening Analysis. RB-002 owns the later durable multi-account player-level projection, storage/snapshot decision, confidence, exclusions and overrides. It must reuse the RB-001 profile and resolver boundary.

Repository state:

- RB-001: `READY`;
- RB-002: `BLOCKED` on RB-001;
- RB-003: independent `PROPOSED` planning;
- downstream profile, target and ranking tasks remain blocked.

## Target-contract impact

RB-006 / CRT-8 must model the fixed speed presets and rating targets from RB-001. The previous arbitrary weighted speed-set and controlled-General assumptions are no longer the intended MVP contract.

A factual peer band may initialize a target, but explicit manual group selection remains authoritative and must not mutate the factual player-level projection.

## Jira execution status

Synchronized through PR #84 planning coordination:

- `CRT-2` remains `In Progress` with revised program scope;
- `CRT-3` remains `To Do`, matching repository `READY`; no implementation claim exists;
- `CRT-4` remains `To Do`, with repository status `BLOCKED` on CRT-3;
- `CRT-6` and `CRT-8` descriptions now consume the revised player-level/preset boundaries;
- Jira records CRT-3 as blocking CRT-4;
- no issue was moved to `In Progress`, `In Review` or `Done`.

## Active claims

None.

Claims belong in individual task files and must be synchronized to Jira before substantive work.

## Recommended next coordination

1. Review and merge planning PR #84 when approved.
2. Claim RB-001 / CRT-3 on a separate implementation branch.
3. Implement the Lichess-benchmark profile version before finalizing peer resolution.
4. Reuse existing imported-game rating fields and account rating/performance patterns for the recent/all-history resolver.
5. Keep one mixed Lichess call and cache profile; do not add per-speed requests or a new cache store.
6. Replace the current Peer games filter controls with the two compact selects.
7. Update `docs/rating-normalization.md` and `docs/opening-explorer.md` in the implementation PR.
8. Unblock RB-002 only after the shared benchmark/resolver boundary is available.

## Validation for this planning revision

Performed:

- inspected RB-001, RB-002, RB-004, RB-006 and RB-010 task files;
- inspected the program foundation, North Star, feature catalog, queue, roadmap, status, decisions, open questions and agent instructions;
- inspected current Opening Explorer service, client, cache repository, contracts and Peer games widget;
- inspected current rating-normalization profile/service/documentation;
- inspected current account rating/performance projection and imported game-recorded rating usage;
- inspected and synchronized Jira CRT-2, CRT-3, CRT-4, CRT-6 and CRT-8;
- created and verified the Jira CRT-3 blocks CRT-4 relationship;
- compared the branch against `main` and confirmed only North Star planning files changed;
- opened PR #84 and linked it from affected Jira issues.

Not performed:

- runtime code changes;
- builds, tests, lint or browser validation;
- data migration;
- Jira workflow transition.

Reason: this coordination change revises planning and Jira scope only.

## Current risks

- the new Chess.com-to-Lichess benchmark boundaries still require careful versioned calibration;
- a dominant-range formula can hide genuine multi-speed divergence if its threshold is poorly chosen;
- correspondence and classical may be queried but currently lack supported personal rating evidence;
- a generic fallback can look factual unless provenance is visible;
- replacing the current normalization profile may affect lab consumers and any future durable references;
- runtime documentation must not be updated to claim the new behavior before the implementation lands.

## Update protocol

After every claimed task or meaningful program session:

1. update this status;
2. update the task file;
3. update the mapped Jira issue and links;
4. add or update the required report;
5. assess queue priority and dependencies;
6. update roadmap, decisions and open questions where evidence changed them;
7. ensure branch and PR visibility in Jira.
