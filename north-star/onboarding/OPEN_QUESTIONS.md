# Onboarding and Data Lifecycle Open Questions

Last updated: 2026-08-02

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

Resolved by `reports/ONB-002-2026-07-29-bounded-import-backfill.md`:

- extend `ImportRun` and add exact account/scope coverage;
- distinct bounded initial, forward, and backfill modes;
- one non-terminal import per account;
- separate claim/heartbeat/fencing loop;
- replayable provider windows and no frontier advancement across record failure;
- provider-specific bounded adapters;
- database-bounded persistence and preparation handoff;
- explicit backfill and conservative legacy-cursor migration.

No ONB-002-owned architecture question remains open. Numeric tuning remains with ONB-007.

## ONB-003 / #150 — Preparation orchestration

Resolved by `reports/ONB-003-2026-08-01-progressive-preparation-orchestration.md` and its self-review addendum:

- preparation run/target/batch persistence;
- immutable bounded index/analysis child jobs;
- per-run and globally serialized admission bounds;
- committed-import pipelining;
- first-analysis and stage-specific multi-account fairness;
- current evidence as readiness authority;
- acknowledged pause/cancel/retry/restart;
- retained terminal batch snapshots;
- separate onboarding and technical-job projections;
- ONB-017/018 allocation.

No ONB-003-owned architecture question remains open. Naming remains with ONB-017/018 and numeric tuning with ONB-007.

## ONB-004 / #151 — Destructive lifecycle

Resolved by `reports/ONB-004-2026-08-02-destructive-lifecycle-invariants.md`:

- define separate `UNANALYSE_GAMES`, `UNINDEX_GAMES`, `PURGE_ACCOUNT_DATA`, `DELETE_EXTERNAL_ACCOUNT`, and `DELETE_APP_USER` actions;
- un-index always includes un-analysis;
- use durable preview/execution/idempotency/checkpoint/audit records;
- persist user/account/game write fences before cancellation;
- wait for preparation/import claims and every target `JobTask.workKey` to clear before destructive writes;
- use bounded forward-only phases, not one large transaction;
- retain shared Position/PositionAnalysis/cache and delegate cleanup to ONB-006;
- clear per-game analysis runs/snapshots, AI review, ply classifications, all tactical versions/processed markers, then recompute tags;
- retain tactical feedback and scenario snapshots for un-analysis/un-index, but delete target-game scenario copies during account purge/delete;
- require provider/local/legacy opening provenance and clear only local opening values during un-index;
- account purge retains the account and independent OAuth connection;
- account deletion retains independent OAuth unless explicitly disconnected;
- whole-user deletion explicitly removes OAuth state/tokens, blocks silent identity recreation with a versioned HMAC tombstone, and requires a mobile local-purge receipt/handshake;
- lifecycle audit survives target deletion without raw personal payloads;
- allocate ONB-019/#259, ONB-020/#260, and ONB-021/#261.

No ONB-004-owned lifecycle-semantics question remains open.

Implementation-local naming is delegated to ONB-019/020/021. Administrator actor/recent-auth/audit-retention policy remains with ONB-005. Shared-position cleanup remains with ONB-006. Operational batch sizes remain evidence inputs from ONB-007.

## ONB-005 / #152 — Administration

Consumed from ONB-004:

- administrator mutations must call the same lifecycle preview/fence/drain/execution/audit service as self-service actions;
- raw administrator table deletes are prohibited;
- lifecycle audit stores pseudonymous keys, aggregates, result/error codes, and no raw personal payloads;
- administrator exposure waits for ONB-019/020/021 dependencies appropriate to each action.

Still owned by ONB-005:

- Clerk subject allowlist, role/claim, or temporary separate secret?
- How is dev-single-user admin explicitly configured?
- Does the existing Angular app suffice?
- Exact audit retention/key-rotation policy.
- Which operator actions require recent authentication, two-step approval, or dual control?
- Which user/course metadata belongs in the first read-only release?
- What database-footprint metrics are feasible and cheap?
- What route-level rate/abuse controls are needed?
- Which destructive actions are user-self-service, administrator-only, or both in the initial release?

## ONB-006 / #153 — Shared-position cleanup

Consumed from ONB-004:

- account/game/user lifecycle actions retain `Position`, `PositionAnalysis`, and `MastersExplorerCache`;
- cleanup is a separate auditable operation and must never delete course `MoveNode` evidence;
- lifecycle audit does not imply permission to remove shared positions.

Still owned by ONB-006:

- Exact orphan predicate and all dependent Position relations.
- Grace period length.
- Batch size and ordering.
- Lock/transaction pattern under concurrent indexing/analysis.
- Manual-only or eventually scheduled.
- How reclaimed storage is estimated.
- Whether cleanup can run while analysis reads Position rows.
- Progress/cancel model.
- Tests proving no referenced Position is removed.

## ONB-007 / #154 — Capacity and progress

- Representative fixture/account profiles.
- p50/p90 import/index/analysis timings.
- Lichess window duration and database write batch size.
- Import-worker poll/heartbeat/stale thresholds and maximum backlog.
- Engine startup overhead and potential reuse.
- First-value target budgets.
- Whether durable-adapter measurements support Lichess-first speed language.
- Preparation index/first-analysis/tail wave sizes and thresholds.
- Global preparation admission limits.
- Preparation reconcile polling/wake budget.
- Minimum evidence for ETA.
- Scaling trigger for separate workers/replicas.
- Database/provider safe load-test method.
- Stalled-work thresholds.
- Evidence-based default batch sizes for ONB-020/021 destructive phases; tuning may not change their forward-only/checkpointed semantics.

Consumed decisions:

- exact stages/counts and fixed-denominator fractions only;
- ETA remains disabled without evidence;
- visible wave size is not the worker scheduling slice;
- preparation priority ordering remains fixed relative to direct-user work;
- destructive actions use bounded transactions regardless of chosen numeric batch size.

## ONB-008 / #193 — Disposition and readiness implementation

Resolved boundaries:

- ONB-017/018 own physical preparation execution;
- ONB-008 owns user disposition, legacy adoption, readiness/presentation projection, warnings, actions, and bounded reveals;
- current game/import evidence is authoritative;
- account/game destructive operations rederive readiness but do not silently reset disposition;
- whole-user deletion removes disposition.

Still owned by ONB-008:

- readiness contract enum names and evidence payload size;
- presentation-state/latest-milestone vocabulary;
- embedded reveal summaries versus references;
- polling/cache policy;
- legacy/new-user migration mechanism;
- import scope/coverage summary shape;
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
- dedicated onboarding store/projection separate from technical jobs.

Still owned by ONB-010:

- current transformed shared-primitives implementation base;
- Home versus `/onboarding` split at compact widths;
- product polling/event cadence;
- Angular component/store decomposition;
- accepted prototype tool/version;
- final responsive/accessibility handoff to #133.

## ONB-011 / #199 — Import persistence and coverage

- Exact Prisma field names and checkpoint representation.
- SQL constraints and active-status partial unique index.
- Whether `lastSyncRunId` becomes a relation.
- Canonical scope-hash serialization.
- Target-to-current-import relation with ONB-017.
- Schema/migration coordination with ONB-019 resource fences.
- Exact query/guard used to reject new import work in a fenced user/account scope.

## ONB-012 / #200 — Import worker and API lifecycle

- Numeric import priorities/poll/heartbeat/stale defaults after ONB-007.
- Paused-run retention policy.
- Conflict response for a second active import.
- Worker-loop supervisor shape.
- Exact cancellation acknowledgement exposed to ONB-020/021.
- Exact claim/fence checks ensuring no provider write survives destructive drain success.

## ONB-013 / #201 — Lichess adapter

- Provider-window duration after capacity evidence.
- Optional OAuth use for documented higher rate while preserving anonymous support.
- Bounded malformed-NDJSON error context.
- Fence/abort behavior during account/user lifecycle operations.

## ONB-014 / #202 — Chess.com adapter

- ETag/Last-Modified persistence timing.
- Archive-index/month inconsistency after retry exhaustion.
- Final batch size.
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
- reconcile wake hint;
- exact handoff/cutover point that lets ONB-020 prove no legacy synchronous provider request remains active.

## ONB-016 / #224 — Lightweight experience blueprint

Resolved by the ONB-016 reports and `EXPERIENCE_BLUEPRINT.md`. No ONB-016-owned product/interaction question remains open.

## ONB-017 / #253 — Preparation execution persistence and batches

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

- Worker supervisor/module shape.
- Reconcile poll/wake implementation after ONB-007.
- Attention/invariant error detail.
- Retry-generation handshake.
- Global admission lock/query implementation.
- Stage-specific account-round-robin SQL.
- Shutdown ordering.
- Exact cancellation/drain projection consumed by ONB-020/021.

## ONB-019 / #259 — Destructive lifecycle foundation

- Exact model/field names for operation, resource fence, audit event, and deleted-identity tombstone.
- Whether preview is an operation status or a separate record.
- Preview expiry and terminal operation/audit retention durations.
- HMAC key/version storage and rotation policy with ONB-005.
- Exact opening-provenance enum/legacy migration.
- Exact user/account/game fence conflict constraints and admission query shapes.
- Exact direct-writer guard coverage and module ownership.
- How lifecycle operation claims/heartbeat/stale recovery reuse existing worker patterns.

## ONB-020 / #260 — Account and game destructive coordinator

- Numeric game/deletion batch sizes after ONB-007 evidence.
- Exact phase/checkpoint vocabulary.
- Transaction split between analysis clear and tag recomputation.
- Exact all-version tactical clear repository API.
- How retained scenario sessions are presented as historical after source detection removal.
- Exact preparation target invalidation representation after account purge/delete.
- Compatibility timetable and response migration for current account-delete/reset-cursor routes.
- Which selected-game versus account-wide un-analysis/un-index controls ship self-service initially.

## ONB-021 / #261 — Whole-user deletion and mobile purge

- Exact deletion receipt and next-contact tombstone response shapes.
- Whether the product also deletes the upstream Clerk identity or only app data plus tombstone initially.
- Deliberate later start-fresh/tombstone-release policy.
- Mobile purge ordering relative to Clerk sign-out and local logging.
- How a second offline device identifies the deletion state and discards stale outbox work.
- Bounded phase ordering for courses/training/puzzle/jobs after account purge reuse.
- Exact token-revocation timeout/retry/audit policy.

## Cross-program

- Which Visual Transformation branch/PR becomes the base for ONB-010 Angular work?
- Does #133 remain one final polish issue or receive an ONB integration subtask?
- Which Player Chess Profile branch state is canonical for readiness/reveals?
- What canonical Profile/opening insight API and minimum evidence thresholds support onboarding reveals?
- Which deterministic missed-shot selection policy supplies at most one onboarding scenario?
- Which Repertoire Builder entry point and evidence-anchor contract follows approved evidence?
- How are same-game duplicates and different-person accounts handled before mixed-provider insights ship?
- Native mobile onboarding remains a later consumer; when is that task allocated?
