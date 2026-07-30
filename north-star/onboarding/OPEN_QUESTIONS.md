# Onboarding and Data Lifecycle Open Questions

Last updated: 2026-07-30

Every material question has one owning task. Other tasks may contribute evidence but must not silently finalize it.

## ONB-001 / #148 — Lifecycle and product contract

Resolved by `reports/ONB-001-2026-07-29-lifecycle-default-recipe.md`:

- the default range is a fixed inclusive UTC date-only three-calendar-month snapshot;
- rated and unrated standard blitz/rapid games are included;
- a preparation run is created only when the user accepts a concrete recipe;
- skip dismisses guidance and does not cancel accepted work;
- user disposition is `PENDING`, `COMPLETED`, or `SKIPPED`, while active/new/returning/reset are derived or commanded;
- core completion requires terminal bounded import and indexing with at least one indexing success, not full analysis;
- readiness is feature-specific and evidence-based;
- `/home` remains signed-in entry, `/onboarding` is resumable, direct protected navigation is preserved;
- Home and clients consume a server-owned projection and allowed actions;
- existing users are adopted as completed during migration.

No ONB-001-owned product-contract question remains open.

## ONB-002 / #149 — Import

Resolved by `reports/ONB-002-2026-07-29-bounded-import-backfill.md`:

- extend the existing `ImportRun` rather than add a generic request platform;
- add account-and-canonical-scope coverage with a proved contiguous half-open UTC interval;
- use separate `BOUNDED_INITIAL`, `INCREMENTAL_FORWARD`, and `HISTORICAL_BACKFILL` modes;
- enforce one non-terminal import run per external account;
- execute provider import through a separate claim/heartbeat/fencing loop in the existing worker deployment;
- use deterministic provider windows and replay incomplete windows through duplicate-safe writes;
- a successful empty window advances coverage;
- a parse/normalization/persistence failure keeps the current window incomplete and cannot be skipped under an advancing frontier;
- Lichess uses bounded `since`/`until`, speed filters, and streamed NDJSON;
- Chess.com uses the archive index plus serial monthly requests and exact range/scope filtering;
- forward `coveredThrough` and historical `coveredFrom` are independent;
- preparation queries eligible games from PostgreSQL rather than receiving unbounded ID arrays;
- bulk writes replace per-game existence N+1;
- one provider-neutral post-import boundary owns rating-stat refresh;
- legacy `syncCursorTime` is a conservative planning hint, not coverage proof;
- raw cursor reset is deprecated in favor of explicit backfill and ONB-004-approved reset.

No ONB-002-owned architecture question remains open.

Implementation tuning delegated to ONB-007:

- Lichess window duration;
- database write batch size;
- import-worker poll/heartbeat/stale thresholds;
- maximum queued backlog and process-split trigger;
- whether any percentage or ETA is justified.

## ONB-003 / #150 — Preparation orchestration

Resolved by ONB-001/002:

- the aggregate is a repeatable user-owned `DataPreparationRun`;
- at most one non-terminal preparation run exists per user;
- index and analysis are separate stages;
- analysis is not a core onboarding-completion gate;
- skip is separate from pause/cancel;
- Home/job-panel ownership boundaries are fixed;
- provider import exposes persisted progress and exact scope/range;
- preparation selects eligible games from PostgreSQL rather than import response arrays;
- import rows can become visible before provider-run completion.

ONB-016 adds the following required UX outcomes without choosing the physical solution:

- a first meaningful indexed reveal should be possible before full preparation;
- a bounded first-analysis lane should unlock analysed value before the lower-priority analysis tail completes;
- multiple-account expansion needs account-specific progress and an understandable aggregate;
- background continuation must remain exact after core readiness.

Still owned by ONB-003:

- What exact Prisma model and lifecycle-status vocabulary implement `DataPreparationRun`?
- Separate JobRuns per wave or one JobRun with checkpoints?
- How many queued waves may exist?
- What exact source/priority values are used?
- Does indexing pipeline after each committed import batch, after each complete provider window, or only after terminal import?
- Which deterministic sample/order feeds the first-analysis lane: newest month, representative subset, account-balanced sample, or another policy?
- How is multi-account expansion ordered?
- How does parent pause/cancellation propagate and acknowledge active import and game work?
- How are terminal child runs reconciled after dismissal/retention cleanup?
- How are failed games retried without duplicating completed work?
- How does the preparation projection consume settled-game/import progress without duplicating state?
- How is the one-active-run invariant enforced under concurrency?

## ONB-004 / #151 — Destructive lifecycle

- Exact model matrix for purge, delete account, un-index, un-analyse, and delete user.
- Must un-index always include un-analyse?
- Which tags are analysis-derived and how are they cleared/rebuilt?
- What happens to tactical feedback and scenario sessions after un-analysis?
- What happens to AI reviews?
- Is provider opening provenance required before index reset?
- How is active import/game work cancellation acknowledged before deletion?
- Are large deletes one transaction or bounded action steps?
- How are import/job/preparation histories retained for audit?
- What user-facing self-service subset is safe?
- Which destructive operations reset onboarding disposition or import coverage, and which retain them?
- When can the direct account-delete route be replaced by the acknowledged destructive protocol?

## ONB-005 / #152 — Administration

- Clerk subject allowlist, role/claim, or temporary separate secret?
- How is dev-single-user admin explicitly configured?
- Does the existing Angular app suffice?
- What audit model and retention are required?
- How does preview bind to execution and reject stale state?
- Which operator actions require re-authentication or two-step approval?
- What user/course metadata belongs in the first read-only release?
- What database-footprint metrics are feasible and cheap?
- What route-level rate/abuse controls are needed?

## ONB-006 / #153 — Shared-position cleanup

- Exact orphan predicate and all dependent Position relations.
- Grace period length.
- Batch size and ordering.
- Lock/transaction pattern under concurrent indexing.
- Manual-only or eventually scheduled.
- How is reclaimed storage estimated?
- Can cleanup run while analysis reads Position rows?
- What progress/cancel model is used?
- What tests prove no referenced Position is removed?

## ONB-007 / #154 — Capacity and progress

- Representative fixture/account profiles.
- p50/p90 import/index/analysis timings.
- Lichess window duration and database write batch size.
- Import-worker poll/heartbeat/stale thresholds and maximum backlog.
- Engine startup overhead and potential reuse.
- First-value target budgets: first imported game, first visible game, first indexed reveal, first analysed reveal, first personal tactic, core readiness, and recipe completion.
- Whether measured durable-adapter performance supports Lichess-first speed language.
- Default preparation wave size.
- Minimum evidence for ETA.
- Scaling trigger for separate import/game workers or replicas.
- Database/provider safe load-test method.
- Which stalled-work thresholds appear in admin diagnostics and onboarding attention states?

Consumed decisions:

- current product may show exact stages/counts and fixed-denominator fractions only;
- ETA and qualitative completion promises remain disabled;
- visible preparation wave size is not the imported-game worker scheduling slice;
- provider import starts with one global active claim and serial provider requests;
- provider window and batch sizes remain tunable without changing the coverage model;
- elapsed-time or weighted overall progress is prohibited.

## ONB-008 / #193 — Disposition and readiness implementation

- Final physical split between user disposition and preparation aggregate after ONB-003.
- Exact readiness contract enum names and evidence payload size.
- Exact presentation-state and latest-milestone vocabulary consumed by ONB-010.
- Whether bounded reveal items are embedded summaries or references to canonical feature reads.
- Polling/cache policy for the read projection.
- Migration mechanism that adopts existing users while new users begin pending.
- How import scope/coverage facts are summarized without duplicating the import read model.
- How `checked-empty`, partial, ready, and newly-ready states are versioned so return visits do not replay stale reveals.

## ONB-009 / #194 — Lifecycle commands

- Exact route grouping after import/preparation implementation endpoints exist.
- Idempotency key and duplicate-command response policy across parent and import run creation.
- Expansion command shape for older history, bullet, and additional accounts.
- Whether explicit no-data “finish without games” is a completion or skip reason in persistence.
- How server-allowed actions distinguish a quiet secondary destination from a current primary recovery action.

## ONB-010 / #195 — Functional Angular experience

Resolved by ONB-016:

- use a route-based resumable experience rather than a blocking modal train;
- present one dominant action per focused surface;
- do not use first-run tables or Settings-style action clusters;
- reveal import-only, indexed, and analysed value progressively;
- show at most three evidence-labelled insight cards at once;
- use canonical Profile/opening/tactical evidence rather than Angular calculations;
- offer additional accounts after first value;
- treat personal tactics and Builder entry as optional continuations;
- keep generated Sites/Figma code non-authoritative.

Still owned by ONB-010:

- Which then-current transformed shared primitives are the implementation base?
- Whether Home hosts the complete pre-core experience or links to `/onboarding` at compact widths.
- Product polling/event cadence after ONB-008/009 performance evidence exists.
- Exact Angular component/store decomposition across the functional slices.
- Which prototype tool and accepted version are available to the implementation team at execution time?
- Exact handoff of final responsive/accessibility polish to #133.

## ONB-011 / #199 — Import persistence and coverage

- Exact Prisma field names and whether provider checkpoint stays JSON or receives a child window table after implementation spike.
- Exact SQL check constraints and active-status partial unique index.
- Whether `lastSyncRunId` becomes a real relation during migration.
- Final canonical scope-hash serialization format.

## ONB-012 / #200 — Import worker and API lifecycle

- Exact numeric import priorities and poll/heartbeat/stale defaults after ONB-007.
- Whether paused runs retain planned window counts indefinitely or have a retention policy.
- Exact typed conflict response for a second active account import.
- Whether the existing worker bootstrap runs loops concurrently or through a small shared supervisor abstraction.

## ONB-013 / #201 — Lichess adapter

- Final Lichess provider-window duration after capacity evidence.
- Whether OAuth is optionally used for the account owner's higher documented stream rate while preserving anonymous import support.
- Exact bounded error context retained for malformed NDJSON.

## ONB-014 / #202 — Chess.com adapter

- Whether ETag/Last-Modified validators are persisted initially or deferred as an optimization.
- Exact behavior for an archive-index/month endpoint inconsistency after retry exhaustion.
- Final batch size after capacity evidence.

## ONB-015 / #203 — Account-sync cutover and handoff

- Exact compatibility window for `POST /api/me/accounts/:id/sync`.
- When `/reset-cursor` is removed after explicit backfill/reset exists.
- Whether rating statistics refresh once per terminal run or through a coalesced window-level trigger.
- Exact ONB-003 reconciliation trigger for progressively committed import rows.

## ONB-016 / #224 — Lightweight experience blueprint

Resolved by `reports/ONB-016-2026-07-30-lightweight-onboarding-experience-blueprint.md` and `EXPERIENCE_BLUEPRINT.md`:

- the durable experience is route-based, progressive, and non-blocking;
- focused surfaces have one dominant action and progressively disclose advanced detail;
- first-run onboarding does not reproduce the account-management dashboard;
- the first run remains one selected account; additional accounts are expansion after first value;
- activity uses persisted milestones rather than fabricated progress;
- value reveals at import-only, indexed, and analysed evidence levels;
- each reveal contains at most three evidence-labelled items;
- insight calculations and thresholds remain feature-owned;
- an eligible own-game tactic and Builder entry are optional continuations;
- ChatGPT Sites/Figma/Codex prototypes use synthetic data and remain design references;
- Angular and the server-owned lifecycle remain production authority;
- ONB-003, ONB-007, ONB-008/009/010, VT-302, Profile, tactical training, and Builder retain their delegated decisions.

No ONB-016-owned product/interaction question remains open. Tool availability, physical orchestration, evidence thresholds, and implementation details remain with their listed owners.

## Cross-program

- Which Visual Transformation branch/PR becomes the base for ONB-010 Angular work?
- Does #133 remain one final polish issue or receive an ONB integration subtask?
- Which Player Chess Profile branch state is canonical when ONB-008 implements readiness and reveal summaries?
- What canonical Profile/opening insight API and minimum evidence thresholds support a bounded onboarding reveal?
- Which deterministic missed-shot selection policy supplies at most one onboarding scenario?
- Which Repertoire Builder entry point and evidence-anchor contract should be offered after approved evidence exists?
- How are same-game duplicates and different-person accounts handled before mixed-provider insights ship?
- Native mobile onboarding is a later consumer of the server contract; when is that task allocated?
