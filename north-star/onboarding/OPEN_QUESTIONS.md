# Onboarding and Data Lifecycle Open Questions

Last updated: 2026-08-04

Every material question has one owning task. Other tasks may contribute evidence but must not silently finalize it.

## ONB-001 / #148 — Lifecycle and product contract

Resolved by `reports/ONB-001-2026-07-29-lifecycle-default-recipe.md`:

- fixed recent one-account standard blitz/rapid recipe including rated/unrated games;
- explicit acceptance before run creation;
- skip distinct from cancellation;
- user disposition separate from preparation;
- core completion after terminal import/index with at least one indexing success, not full analysis;
- feature-specific readiness;
- Home plus resumable onboarding route;
- server-owned projection/actions;
- existing-user adoption.

No ONB-001-owned product-contract question remains open.

## ONB-002 / #149 — Import

Resolved by `reports/ONB-002-2026-07-29-bounded-import-backfill.md` and ONB-007 operational handoff:

- extend `ImportRun` and add exact account/scope coverage;
- distinct bounded initial, forward, and backfill modes;
- one non-terminal import per account;
- separate claim/heartbeat/fencing loop;
- replayable provider windows and no frontier advancement across record failure;
- provider-specific bounded adapters;
- database-bounded persistence and preparation handoff;
- explicit backfill and conservative legacy-cursor migration;
- initial serial provider execution, 14-day Lichess/calendar-month Chess.com units, 100-row writes, and one import executor.

No ONB-002-owned architecture or numeric-policy question remains open. Implementation-local validation remains with ONB-011 through ONB-015.

## ONB-003 / #150 — Preparation orchestration

Resolved by `reports/ONB-003-2026-08-01-progressive-preparation-orchestration.md`, its self-review addendum, and ONB-007 numeric handoff:

- preparation run/target/batch persistence;
- immutable bounded index/analysis child jobs;
- per-run and globally serialized admission bounds;
- committed-import pipelining;
- first-analysis and stage-specific multi-account fairness;
- current evidence as readiness authority;
- acknowledged pause/cancel/retry/restart;
- retained terminal batch snapshots;
- separate onboarding and technical-job projections;
- 50-game index waves, three-game first analysis, 10-game analysis tail, and four-batch/200-task/40-analysis caps;
- ONB-017/018 allocation.

No ONB-003-owned architecture or numeric-policy question remains open. Naming and transaction implementation remain with ONB-017/018.

## ONB-004 / #151 — Destructive lifecycle

Resolved by `reports/ONB-004-2026-08-02-destructive-lifecycle-invariants.md` and both self-review addenda:

- define separate `UNANALYSE_GAMES`, `UNINDEX_GAMES`, `PURGE_ACCOUNT_DATA`, `DELETE_EXTERNAL_ACCOUNT`, and `DELETE_APP_USER` actions;
- un-index always includes un-analysis;
- use durable preview/execution/idempotency/checkpoint/audit records;
- persist user/account/game write fences before cancellation;
- wait for preparation/import claims and every target `JobTask.workKey` to clear before destructive writes;
- use bounded forward-only phases, not one large transaction;
- retain shared Position/PositionAnalysis/cache and delegate cleanup to ONB-006;
- clear per-game analysis runs/snapshots, AI review, ply classifications, all tactical versions/processed markers, then recompute tags;
- retain tactical feedback and scenario snapshots for un-analysis/un-index, but delete target-game scenario copies before source links are nulled during account purge/delete;
- require provider/local/legacy opening provenance and clear only local opening values during un-index;
- account purge retains the account, terminal import history, and independent OAuth connection;
- account deletion retains independent OAuth unless explicitly disconnected;
- whole-user deletion explicitly removes OAuth state/tokens, blocks silent identity recreation with a versioned HMAC tombstone, and requires a mobile local-purge receipt/handshake;
- terminal cancellation is pre-mutation only and partial failure retains the durable resource fence;
- lifecycle audit survives target deletion without raw personal payloads;
- allocate ONB-019/#259, ONB-020/#260, and ONB-021/#261.

No ONB-004-owned lifecycle-semantics question remains open.

Implementation-local naming is delegated to ONB-019/020/021. Administrator identity, recent-auth, diagnostics, and audit-policy direction is resolved by ONB-005 and delegated to ONB-022/023/024. Shared-position cleanup research is resolved by ONB-006 and implementation is delegated to ONB-026. Operation-specific transaction sizing remains with ONB-026/020/021 under the ONB-007 budget envelope.

## ONB-005 / #152 — Administration

Resolved by `reports/ONB-005-2026-08-04-admin-auth-diagnostics-actions.md` and its three self-review addenda:

- keep normal Clerk authentication as the sole production login boundary;
- derive administrator capabilities server-side after verified Clerk authentication;
- bootstrap with a disabled-by-default exact Clerk-subject allowlist behind one replaceable policy;
- reject shared secrets, email allowlists, `AppUser.isAdmin`, client-side roles, impersonation, a second login, and Clerk Organizations solely for global operators;
- reject production administrator authority under `dev-single-user` while permitting explicit non-production test/development injection;
- retain only the verified session fields needed for authorization and future reverification;
- ship migration-free read-only diagnostics first with numeric user-ID lookup, opaque cursor pagination, database aggregates, explicit partial sections, and strict sensitive-field exclusions;
- use exact approved row counts rather than per-user byte estimates;
- use the existing Angular deployment through a lazy direct-link `/admin` route with API authority and no required static-navigation entry;
- require valid preview, typed confirmation, idempotency, signed recent `fva`, and one-use request-bound `reverification_id` for administrator execution;
- keep administrator execution disabled until the pinned Clerk client flow proves that signed evidence end to end;
- reuse ONB-019/020/021 lifecycle services for every mutation and defer administrator whole-user deletion pending a separate policy decision;
- use configurable initial defaults of 30 days for read-access security logs and 365 days for mutation audit, with explicit production confirmation and versioned domain-separated HMAC keys;
- bind request-budget enforcement to verified deployment topology and never describe an in-process limiter as distributed protection;
- surface ONB-007 warnings with exact triggering evidence and no ETA/SLA implication;
- allocate ONB-022/#272, ONB-023/#273, and ONB-024/#274 after the existing product critical-path backlog.

No ONB-005-owned architecture or policy question remains open. Implementation-local contracts and validation remain with ONB-022/023/024 and the lifecycle owners.

## ONB-006 / #153 — Shared-position cleanup

Resolved by:

- `reports/ONB-006-2026-08-04-orphan-shared-position-cleanup.md`;
- `reports/ONB-006-2026-08-04-self-review-addendum.md`;
- `reports/ONB-006-2026-08-04-second-self-review-addendum.md`.

Final research decisions:

- an orphan is exactly a `Position` with zero `ImportedGamePly` references;
- `PositionAnalysis` and `MastersExplorerCache` are dependent rows deleted by existing cascades;
- course `MoveNode` rows are unrelated and excluded;
- a dedicated candidate ledger records first-observed orphan state;
- the initial grace is 30 days and every new or updated ply reference resets it in the same transaction through PostgreSQL statement triggers;
- reconciliation remains a bounded legacy/rollout repair and diagnostic path;
- every phase limits input Position/candidate rows before filtering, with at most 500 input rows inspected per transaction initially;
- checkpoints advance to the last input row inspected;
- delete batches lock `ImportedGamePly` → `ImportedGamePosition` → `PositionAnalysis` → `MastersExplorerCache`, then recheck `NOT EXISTS`;
- dry-run is an exact bounded traversal observation with start/completion timestamps, not one point-in-time snapshot or execution promise;
- progress is exact phase/upper-bound/checkpoint/inspected/matched/deleted state with no ETA or byte claim;
- cancellation is acknowledged between atomic batches;
- the first release is manual, disabled by default, and unscheduled;
- a server-side command defaults to dry-run and requires explicit apply/confirmation while reusing the canonical service/state machine;
- implementation is allocated to ONB-026 / #280.

No ONB-006-owned architecture or policy question remains open.

Implementation-local validation remains with ONB-026:

- exact Prisma/SQL names and constraints;
- deployed PostgreSQL transition-relation compatibility;
- final measured scan/delete page sizes at or below the accepted ceiling;
- query plans and required candidate indexes;
- trigger, lock-order, concurrency, cancellation, stale-claim, and command implementation details;
- production lock/cascade/cache-churn telemetry before any scheduling decision;
- schema/migration coordination with ONB-011, ONB-017, and ONB-019.
## ONB-007 / #154 — Capacity and progress

Resolved by `reports/ONB-007-2026-08-03-throughput-progress-benchmarks.md` and `reports/artifacts/ONB-007-2026-08-03-ci-benchmark-summary.json`:

- representative 10/50/200-game and 16/40/80-ply fixture profiles;
- p50/p90 synthetic import persistence, job admission, index/tag, depth-12 analysis/process, and actual worker-wave measurements;
- initial 14-day Lichess windows and 100-row database writes;
- one import executor with 1-second poll, 15-second heartbeat, 2-minute stale, and 30-second recovery defaults;
- measured fresh-engine overhead and explicit deferred-reuse gate;
- internal first-value budgets and no public timing promise;
- no provider-speed preference from synthetic/local evidence;
- 50-game index waves, three-game first-analysis wave, one-game small-account fallback, and 10-game analysis tail;
- four non-terminal preparation batches, 200 queued tasks, and 40 queued analysis tasks globally;
- one-second active/five-second idle reconcile cadence with persisted immediate wake hints;
- exact counts and fixed-denominator percentages only; no weighted overall progress;
- public ETA disabled initially and future stage-ETA eligibility gates defined;
- queue/stall/direct-user-protection thresholds and worker/deployment/engine scaling triggers;
- disposable-database-only benchmark safety;
- initial operation budget envelopes of at most 100 game IDs or 500 input Position/candidate rows inspected per transaction, with implementation-specific measurement before increase.

No ONB-007-owned architecture or numeric-policy question remains open.

Not measured and therefore intentionally delegated to implementation telemetry/canary validation:

- real provider latency/rate-limit frequency;
- Neon network/lock behavior;
- Render local-binary Stockfish performance;
- multi-worker throughput;
- complete preparation-parent/reconcile timing;
- production account-size distribution;
- lifecycle/cleanup query performance.

These are validation gates, not unresolved permission to invent public ETA or unbounded defaults.

## ONB-008 / #193 — Disposition and readiness implementation

Resolved boundaries:

- ONB-017/018 own physical preparation execution;
- ONB-008 owns user disposition, legacy adoption, readiness/presentation projection, warnings, actions, and bounded reveals;
- current game/import evidence is authoritative;
- account/game destructive operations rederive readiness but do not silently reset disposition;
- whole-user deletion removes disposition;
- before import is terminal, expose milestones/exact counts and no overall percentage;
- percentages require immutable/frozen denominators;
- public ETA is absent in the initial release.

Still owned by ONB-008:

- readiness contract enum names and evidence payload size;
- presentation-state/latest-milestone vocabulary;
- embedded reveal summaries versus references;
- polling/cache policy;
- legacy/new-user migration mechanism;
- exact import scope/coverage summary shape;
- checked-empty/partial/ready/newly-ready versioning;
- attention-code-to-action mapping;
- exact projection behavior while a destructive lifecycle operation fences relevant evidence.

## ONB-009 / #194 — Onboarding lifecycle commands

Resolved boundaries:

- preparation pause/cancel/retry/restart/expansion semantics come from ONB-003/017/018;
- destructive purge/un-index/un-analyse/account-delete/user-delete commands remain ONB-019/020/021-owned and must not be duplicated.

Still owned by ONB-009:

- route grouping after import/preparation endpoints exist;
- idempotency and duplicate-command response policy for onboarding commands;
- expansion command shape;
- explicit no-data finish/skip reason;
- action priority/destination semantics;
- accepted/acknowledged pause/cancel response vocabulary.

## ONB-010 / #195 — Functional Angular experience

Resolved boundaries:

- route-based resumable experience with one dominant action;
- no first-run tables/settings clusters;
- progressive import/index/analysis value reveals;
- canonical feature evidence and at most three reveal items;
- additional accounts after first value;
- optional tactical/Builder continuation;
- dedicated onboarding store/projection separate from technical jobs;
- exact server counts, milestones, fixed-denominator percentages, checked-empty/rate-limit/stall states, and no public ETA.

Still owned by ONB-010:

- current transformed shared-primitives implementation base;
- Home versus `/onboarding` split at compact widths;
- product polling/cache cadence over the server projection;
- Angular component/store decomposition;
- accepted prototype tool/version;
- final responsive/accessibility handoff to #133.

## ONB-011 / #199 — Import persistence and coverage

Resolved numeric/telemetry input from ONB-007:

- initial database write batch is 100 normalized games and remains configurable;
- persistence/checkpoint shape must support queue/provider/parse/write/checkpoint timing and exact fixed-window denominator when known.

Still owned by ONB-011:

- Exact Prisma field names and checkpoint representation.
- SQL constraints and active-status partial unique index.
- Whether `lastSyncRunId` becomes a relation.
- Canonical scope-hash serialization.
- Target-to-current-import relation with ONB-017.
- Schema/migration coordination with ONB-019 resource fences.
- Exact query/guard used to reject new import work in a fenced user/account scope.

## ONB-012 / #200 — Import worker and API lifecycle

Resolved numeric input from ONB-007:

- one active executor initially;
- 1-second poll, 15-second heartbeat, 2-minute stale, and 30-second recovery defaults;
- queue warning after more than 20 queued runs for five minutes or oldest queue age above five minutes;
- explicit rate-limited/retry-at state distinct from stale-worker recovery.

Still owned by ONB-012:

- Paused-run retention policy.
- Conflict response for a second active import.
- Worker-loop supervisor shape.
- Exact cancellation acknowledgement exposed to ONB-020/021.
- Exact claim/fence checks ensuring no provider write survives destructive drain success.
- Exact telemetry persistence/export shape.

## ONB-013 / #201 — Lichess adapter

Resolved numeric/provider policy from ONB-007:

- initial 14-day half-open windows;
- serial requests and full-minute cooldown after HTTP 429;
- 100-row-or-smaller duplicate-safe writes;
- one low-volume canary before general release.

Still owned by ONB-013:

- Optional OAuth use for documented higher rate while preserving anonymous support.
- Bounded malformed-NDJSON error context.
- Exact canary account/fixture procedure.
- Fence/abort behavior during account/user lifecycle operations.

## ONB-014 / #202 — Chess.com adapter

Resolved numeric/provider policy from ONB-007:

- serial calendar-month archives;
- 100-row-or-smaller duplicate-safe writes;
- `ETag`/`Last-Modified` support where available;
- one low-volume canary before general release.

Still owned by ONB-014:

- Exact cache-validator persistence timing/shape.
- Archive-index/month inconsistency after retry exhaustion.
- Exact canary account/fixture procedure.
- Fence/abort behavior during account/user lifecycle operations.

## ONB-015 / #203 — Account-sync cutover and handoff

Resolved boundaries:

- committed rows support preparation selection;
- persisted reconciliation is authoritative;
- exact import termination remains core gate;
- current immediate account delete and raw cursor reset cannot be the final destructive implementation.

Still owned by ONB-015:

- compatibility window for `POST /api/me/accounts/:id/sync`;
- `/reset-cursor` removal timing after backfill and ONB-020 operations exist;
- rating-stat refresh coalescing;
- reconcile wake hint integration;
- exact handoff/cutover point that lets ONB-020 prove no legacy synchronous provider request remains active.

## ONB-016 / #224 — Lightweight experience blueprint

Resolved by the ONB-016 reports and `EXPERIENCE_BLUEPRINT.md`. No ONB-016-owned product/interaction question remains open.

## ONB-017 / #253 — Preparation execution persistence and batches

Resolved numeric input from ONB-007:

- index/first-analysis/analysis-tail defaults are 50/3/10;
- global caps are four non-terminal batches, 200 queued tasks, and 40 queued analysis tasks;
- child denominators are immutable and exact.

Still owned by ONB-017:

- Exact Prisma names for run/target/batch.
- Terminal batch snapshot representation.
- Partial unique indexes.
- Candidate query/index shape.
- Import/job relation shape.
- Internal repository/service names and transaction split.
- Initial `reconcileAfter` ownership.
- Schema/migration coordination with ONB-011 and ONB-019.
- Exact preparation admission check for active destructive user/account fences.

## ONB-018 / #254 — Preparation reconciliation and control

Resolved numeric/progress input from ONB-007:

- one-second active/five-second idle reconcile cadence and 15-second due warning;
- persisted immediate wake hints;
- first analysis after three indexed games, with one-game quiescent small-account fallback;
- index no-settlement warning after two minutes and analysis after five minutes, excluding explained higher-priority preemption;
- exact milestones/counts and no public ETA.

Still owned by ONB-018:

- Worker supervisor/module shape.
- Exact reconcile claim/wake implementation.
- Attention/invariant error detail.
- Retry-generation handshake.
- Global admission lock/query implementation.
- Stage-specific account-round-robin SQL.
- Shutdown ordering.
- Exact cancellation/drain projection consumed by ONB-020/021.

## ONB-019 / #259 — Destructive lifecycle foundation

Resolved policy input from ONB-005:

- mutation audit has a configurable 365-day initial default that production configuration must explicitly confirm;
- actor/target HMAC domains are separate from deleted-identity tombstones;
- old HMAC key versions remain available until corresponding retained records expire;
- raw administrator identity and sensitive payloads remain excluded.

Still owned by ONB-019:

- Exact model/field names for operation, resource fence, audit event, and deleted-identity tombstone.
- Whether preview is an operation status or a separate record.
- Preview expiry and terminal operation retention durations.
- Physical HMAC key/version configuration, rotation procedure, and retention cleanup implementation.
- Exact opening-provenance enum/legacy migration.
- Exact user/account/game fence conflict constraints and admission query shapes.
- Exact direct-writer guard coverage and module ownership.
- How lifecycle operation claims/heartbeat/stale recovery reuse existing worker patterns.

## ONB-020 / #260 — Account and game destructive coordinator

Resolved numeric envelope from ONB-007:

- begin at no more than 100 game IDs per transaction;
- require representative-fixture transaction p90 below one second and lock-wait p90 below 250 ms before increase;
- halve after repeated budget breach and preserve forward-only checkpoints.

Still owned by ONB-020:

- Final per-phase batch sizes after operation-specific evidence.
- Exact phase/checkpoint vocabulary.
- Transaction split between analysis clear and tag recomputation.
- Exact all-version tactical clear repository API.
- How retained scenario sessions are presented as historical after source detection removal.
- Exact preparation target invalidation representation after account purge/delete.
- Compatibility timetable and response migration for current account-delete/reset-cursor routes.
- Which selected-game versus account-wide un-analysis/un-index controls ship self-service initially.

## ONB-021 / #261 — Whole-user deletion and mobile purge

Resolved numeric envelope from ONB-007:

- user/account game phases begin at no more than 100 game IDs per transaction and must meet the same transaction/lock budgets before increase.

Resolved policy input from ONB-005:

- self-service whole-user deletion ships before administrator execution;
- administrator `DELETE_APP_USER` remains disabled pending a separate support/recovery policy decision.

Still owned by ONB-021:

- Exact deletion receipt and next-contact tombstone response shapes.
- Whether the product also deletes the upstream Clerk identity or only app data plus tombstone initially.
- Deliberate later start-fresh/tombstone-release policy.
- Mobile purge ordering relative to Clerk sign-out and local logging.
- How a second offline device identifies the deletion state and discards stale outbox work.
- Bounded phase ordering for courses/training/puzzle/jobs after account purge reuse.
- Exact token-revocation timeout/retry/audit policy.

## ONB-022 / #272 — Administrator authorization and read-only diagnostics

Resolved boundaries from ONB-005:

- migration-free server-only authorization and read-only API;
- exact Clerk-subject allowlist bootstrap behind one replaceable capability policy;
- production `dev-single-user` rejection;
- numeric user-ID lookup, cursor pagination, aggregate projections, strict field exclusions, and no arbitrary export;
- structured pseudonymous read-access logs;
- request-budget mechanism selected only after replica topology is verified.

Still owned by ONB-022:

- Exact environment/configuration names and parser placement.
- Minimal verified-session TypeScript shape and Fastify decoration ownership.
- Capability enum and error-schema names.
- Actor-key HMAC configuration seam coordinated with ONB-019.
- Exact cursor encoding/version and aggregate query/index plan.
- Partial-section and warning contract vocabulary.
- Read-security-log sink and retention enforcement.
- Request-budget implementation after deployment topology reinspection.
- OpenAPI, no-N+1, query-plan, startup-isolation, and sensitive-field tests.

## ONB-023 / #273 — Administrator diagnostics Angular feature

Resolved boundaries from ONB-005:

- lazy direct-link `/admin` route in the existing Angular app;
- normal auth guard for sign-in only and server capability authority;
- typed feature-scoped data access/store;
- no required normal-navigation entry and no destructive controls.

Still owned by ONB-023:

- Exact page/store/component decomposition against current transformed primitives.
- Cursor restoration and bounded client-page retention behavior.
- Poll/cache policy for work diagnostics.
- Optional capability-aware navigation link versus direct-link-only release.
- Warning-code presentation and partial/unavailable state copy.
- Browser, responsive, keyboard, focus, zoom, and screen-reader acceptance details.

## ONB-024 / #274 — Administrator lifecycle previews and controls

Resolved boundaries from ONB-005:

- thin capability-gated adapters over ONB-019/020/021 only;
- valid preview, typed confirmation, idempotency, recent signed `fva`, and one-use request-bound `reverification_id`;
- no simulated reauthentication or shared secret;
- no administrator whole-user deletion by default;
- cleanup exposure only after ONB-006 implementation through the same action protocol.

Still owned by ONB-024:

- Exact route/contract names after canonical lifecycle services exist.
- Pinned Clerk JS reverification trigger, token-refresh, and failure UX.
- Reverification freshness window and backend one-use persistence transaction.
- Capability-to-action matrix for un-analysis, un-index, account purge/delete, cancellation, and audit reads.
- Audit list/detail projection and UI bounds.
- Integrated idempotency, fence/drain, partial-failure, restart, and stale-preview tests.

## Cross-program

- Which Visual Transformation branch/PR becomes the base for ONB-010 Angular work?
- Does #133 remain one final polish issue or receive an ONB integration subtask?
- Which Player Chess Profile branch state is canonical for readiness/reveals?
- What canonical Profile/opening insight API and minimum evidence thresholds support onboarding reveals?
- Which deterministic missed-shot selection policy supplies at most one onboarding scenario?
- Which Repertoire Builder entry point and evidence-anchor contract follows approved evidence?
- How are same-game duplicates and different-person accounts handled before mixed-provider insights ship?
- Native mobile onboarding remains a later consumer; when is that task allocated?
