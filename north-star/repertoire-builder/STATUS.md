# Repertoire Builder Program Status

Last updated: 2026-07-26

## Current state

**Program state:** foundation merged; RB-001 implementation in progress on PR #84.

**Implementation state:** the branch now contains the Lichess-benchmark profile, temporary peer resolver, preset Opening Explorer contract/service, compact Peer games UI, focused tests and canonical runtime documentation. Validation and completion synchronization remain in progress.

**Planning foundation:** merged through PR #81, with later reconciliation through PR #83.

**Active implementation PR:** #84 — `CRT-3 RB-001: deliver peer population presets`.

**Jira project:** `CRT` — Chess Repertoire Trainer.

**Jira epic:** `CRT-2` — Repertoire Builder north-star program, `In Progress`.

## Runtime baseline on `main`

PR #80 currently provides the shared Masters/rated Opening Explorer, raw rated-game filters, one mixed cache snapshot and the Peer games widget.

PR #76 currently provides profile `universal-online-strength`, version `2026-07-product-v1`, with 13 cross-pool grades.

PR #84 changes this behavior but has not been merged to `main`.

## RB-001 implementation on PR #84

Delivered on the branch:

- fixed speed presets: All speeds, Blitz and slower, Blitz, Bullet;
- no product-facing ultraBullet;
- rating targets: All players, My peers, My peers and above, or one explicit Lichess group;
- defaults: Blitz and slower plus My peers and above;
- no client-selected public-game month bounds;
- one mixed Lichess request and the existing deterministic cache architecture;
- active normalization profile `2026-07-lichess-bands-v1` with nine Lichess Explorer bands;
- the previous `2026-07-product-v1` profile preserved as a historical exported profile;
- provider/speed-aware Chess.com and Lichess rating classification;
- recent-three-month → all-history → generic 1400–1599 peer fallback;
- resolver policy `dominant-contiguous-window-v1`, using the narrowest one-to-three-band window covering at least 70% of evidence;
- direct requested/effective population and personal resolver provenance in rated responses;
- two compact native Peer games selects and a resolved-population summary;
- focused contract, normalization, resolver, service, OpenAPI and Angular component tests;
- updated `docs/rating-normalization.md` and `docs/opening-explorer.md`.

Not introduced:

- separate per-speed upstream calls or cache rows;
- client-editable weights;
- durable player-level/profile persistence;
- new database models, migrations, queues, jobs or dependencies.

## Player-level boundary

RB-001 owns the temporary factual peer resolver required by Opening Analysis. RB-002 / CRT-4 remains blocked and later owns durable multi-account projection, confidence, exclusions, persistence/snapshot and override behavior. It must reuse the RB-001 normalization/profile policy boundary.

Repository state:

- RB-001: `IN_PROGRESS` on `north-star/rb-001-peer-presets-replan`;
- RB-002: `BLOCKED` on RB-001;
- RB-003: independent `PROPOSED` planning;
- downstream profile, target and ranking tasks remain blocked.

## Jira execution status

- `CRT-2`: `In Progress`.
- `CRT-3`: assigned and `In Progress`.
- `CRT-4`: `To Do`, blocked by CRT-3.
- downstream Jira tasks remain `To Do`.

The material CRT-3 blocks CRT-4 relationship is present in Jira.

## Active implementation

### RB-001 / CRT-3

- Claimed by: ChatGPT
- Branch: `north-star/rb-001-peer-presets-replan`
- PR: #84
- Visible claim commit: `e0b50788d31f55bfdc0bb2c712c4ec497cfcece8`
- First runtime commit: `bd822d8d6d59fb274f8a0418e0adfb3879675f73`
- Scope: benchmark profile, temporary peer resolver, Opening Explorer presets/provenance, compact Peer games UI, tests, runtime docs and completion synchronization.

## Validation status

Completed so far:

- repository/API/Angular architecture and skill inspection;
- shared contracts lint;
- API and web TypeScript lint on CI;
- implementation-specific tests added;
- canonical docs updated;
- Jira claim, assignment and In Progress transition synchronized.

Pending:

- full CI build/test completion on the latest head;
- browser review of the compact controls where available;
- completion report;
- final task/queue/Jira transition to review.

No merge to `main` is authorized or performed.

## Current risks

- Chess.com boundaries are rounded product mappings and must not be presented as exact rating conversion;
- speed disparity remains deliberately ignored inside one mixed Lichess rating-group query;
- a dominant interval can hide genuine separated high-volume pools, so the full distribution remains in provenance;
- classical and correspondence do not contribute personal rating evidence;
- generic fallback must remain visibly labelled;
- cross-account duplicate imports are not independently deduplicated by the temporary resolver;
- the active default-profile change affects every current consumer of `GET /api/rating-normalization/default`.

## Queue recommendation

Finish validation and review of RB-001 first. Unblock RB-002 only after PR #84 is accepted and merged. No other task order or priority change is recommended.