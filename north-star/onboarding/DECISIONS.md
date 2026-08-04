# Onboarding and Data Lifecycle Decisions

Last updated: 2026-08-03

Statuses:

- `LOCKED` — program agreement; change only through reviewed decision update.
- `PROVISIONAL` — recommended direction delegated to a research task for finalization.
- `REJECTED` — approach must not be introduced without reopening the decision.
- `OPEN` — unresolved.

## Locked

### D-001 — Onboarding is progressive preparation

Status: `LOCKED`

It is a persisted, resumable data-preparation experience, not a blocking wizard or one browser-local checklist.

### D-002 — Default value is recent-first

Status: `LOCKED`

The initial recipe starts with a recent bounded sample rather than all available history.

### D-003 — Initial speed/variant scope

Status: `LOCKED`

The product default is standard blitz and rapid games.

### D-004 — Stage order

Status: `LOCKED`

Import precedes indexing; indexing/opening assignment precedes engine analysis.

### D-005 — Reuse imported-game jobs

Status: `LOCKED`

`JobRun`/`JobTask` remains the execution engine for imported-game indexing and analysis.

### D-006 — Server/database processing

Status: `LOCKED`

No client-side bulk import, indexing, analysis, lifecycle deletion, or cleanup.

### D-007 — Exact progress before ETA

Status: `LOCKED`

Show persisted stage state, milestones, and exact counts. A percentage requires a fixed denominator for that stage instance. Do not show one weighted overall preparation percentage while import can discover games. Public ETA and “almost done” wording remain disabled in the initial release; a later stage ETA requires the ONB-007 telemetry eligibility contract.

### D-008 — No hardcoded admin credentials

Status: `LOCKED`

No administrator password/token in source control or the normal client bundle.

### D-009 — Admin read-only first

Status: `LOCKED`

Ship authorization, audit foundation, and diagnostics before destructive actions.

### D-010 — Destructive actions are audited domain operations

Status: `LOCKED`

Preview, idempotency, authorization, active-worker safety, and explicit retained/deleted semantics are mandatory.

### D-011 — Shared-position cleanup is separate

Status: `LOCKED`

Account purge does not automatically delete all shared Positions. Cleanup is database-driven and excludes course MoveNode data.

### D-012 — Program ownership boundaries

Status: `LOCKED`

This program owns functional onboarding and data lifecycle. Visual Transformation #133 owns final visual/accessibility polish. Repertoire Builder #105 owns repertoire decisions.

### D-013 — User disposition is separate from preparation runs

Status: `LOCKED`

Persist a user-level onboarding disposition with durable values `PENDING`, `COMPLETED`, and `SKIPPED`. Derive new, active, returning, and reset presentation from disposition plus preparation state rather than persisting competing statuses.

### D-014 — Preparation is repeatable

Status: `LOCKED`

Use repeatable user-owned `DataPreparationRun` records for onboarding, expansion, and recovery. Permit at most one non-terminal preparation run per user. Do not create a generic workflow platform.

### D-015 — A run starts on explicit recipe acceptance

Status: `LOCKED`

Connecting or creating an external account does not create background preparation. Create a run only when the authenticated user accepts a concrete recipe.

### D-016 — Default date range is a fixed three-calendar-month snapshot

Status: `LOCKED`

At start, snapshot an inclusive UTC date-only range from three calendar months before the start date through the start date. The range does not continue moving while durable work runs.

### D-017 — Default rated policy includes rated and unrated games

Status: `LOCKED`

The preparation recipe includes both. Individual product views may keep feature-owned rated defaults and filters.

### D-018 — First run uses one selected account

Status: `LOCKED`

Guide one owned active account through the first run. Additional accounts, older history, bullet, and other broader scopes are explicit expansion runs.

### D-019 — Index and analysis remain separate stages

Status: `LOCKED`

Indexing is required before analysis and provides earlier value. Default preparation requests analysis for successfully indexed games, but analysis remains a distinct stage with independent progress and recovery.

### D-020 — Core onboarding completion does not require full analysis

Status: `LOCKED`

Complete user onboarding when the bounded initial import is terminal, all eligible games have terminal indexing outcomes, at least one game indexed successfully, and no required import/index work remains active. Analysis may continue afterward.

### D-021 — No-data and all-index-failed outcomes need attention

Status: `LOCKED`

Do not silently complete when the initial range contains no eligible games or when every eligible game fails indexing. Expose deterministic actions for expansion, another account, retry, explicit finish, or skip as applicable.

### D-022 — Readiness is feature-specific

Status: `LOCKED`

Expose capability readiness from persisted evidence and feature-owned thresholds rather than one global “insights ready” boolean. Distinguish locked, partial, ready, and checked-empty states.

### D-023 — Home and onboarding route coexist

Status: `LOCKED`

Keep `/home` as the default signed-in destination and preserve login `returnUrl`. Add a protected resumable `/onboarding` route. Do not globally redirect every protected route behind an onboarding guard.

### D-024 — Home consumes one server-owned projection

Status: `LOCKED`

Home may show a prominent Start/Resume treatment before core readiness and a compact preparation card afterward, but it must consume the onboarding projection rather than independently infer lifecycle from accounts and jobs.

### D-025 — The technical job panel remains separate

Status: `LOCKED`

Keep the global imported-game job panel as the child-job execution surface. Do not make it own provider import, recipe, user disposition, milestones, or product-readiness narrative.

### D-026 — Skip is not cancellation

Status: `LOCKED`

Skipping dismisses first-run guidance and does not silently cancel accepted preparation. Pause/cancel/retry are explicit preparation commands. If skipped preparation later reaches core readiness, disposition becomes `COMPLETED`.

### D-027 — Existing users are adopted as complete

Status: `LOCKED`

Migration creates existing `AppUser` rows as onboarding `COMPLETED` with a legacy-adoption reason/timestamp. New users created after rollout begin `PENDING`. Readiness remains independently derived from actual evidence.

### D-028 — Clients render server-allowed actions

Status: `LOCKED`

The onboarding projection supplies deterministic action codes and destinations. Angular must not create a second preparation recommendation/ranking engine.

### D-029 — Import requests use the existing `ImportRun` aggregate

Status: `LOCKED`

Extend `ImportRun` with mode, source, immutable scope/range, lifecycle, retry, checkpoint, claim, and progress fields. Do not add a parallel generic request/workflow aggregate without a later demonstrated need.

### D-030 — Coverage is exact account-and-scope time coverage

Status: `LOCKED`

Add an account-owned coverage record keyed by canonical versioned import scope. Store a proved contiguous half-open UTC interval `[coveredFrom, coveredThrough)`, including successful periods containing zero games.

### D-031 — Import modes are distinct

Status: `LOCKED`

Use `BOUNDED_INITIAL`, `INCREMENTAL_FORWARD`, and `HISTORICAL_BACKFILL`. Forward sync extends the future frontier; backfill extends the historical frontier; neither replaces the other.

### D-032 — One non-terminal import exists per account

Status: `LOCKED`

Enforce the invariant in PostgreSQL. Multiple accounts may queue independently, but one account cannot run forward sync and backfill concurrently.

### D-033 — Provider import has a separate worker loop

Status: `LOCKED`

Run account/provider work through a separate PostgreSQL claim/heartbeat/fencing loop in the existing worker deployment. Reuse worker patterns, not imported-game `JobTask` rows. Do not add an external broker or second deployment initially.

### D-034 — Provider windows are replayable coverage units

Status: `LOCKED`

Plan deterministic half-open UTC provider windows. Commit normalized rows in bounded batches, but advance coverage only after a whole window is proved complete or empty. Replay an interrupted window through duplicate-safe writes.

### D-035 — Failed records cannot be skipped under an advancing cursor

Status: `LOCKED`

A provider parse, normalization, or persistence failure makes the current window incomplete and retryable. Do not mark the run complete or advance coverage beyond an unprocessed record.

### D-036 — Import persistence and preparation handoff are database-bounded

Status: `LOCKED`

Replace per-game existence N+1 with duplicate-safe bulk insert and bounded reads. Do not return all imported or eligible IDs. Preparation selects eligible games from PostgreSQL by account, immutable scope/range, state, newest-first ordering, and configured wave limit.

### D-037 — Legacy cursors are migration hints, not coverage proof

Status: `LOCKED`

Retain `syncCursorTime` temporarily for compatibility, but do not infer exact historical coverage from it. The first durable run establishes coverage only for windows it actually proves.

### D-038 — Historical expansion is explicit backfill

Status: `LOCKED`

Do not implement older-history expansion by clearing a forward cursor. Deprecate raw cursor reset after explicit backfill and ONB-004-approved reset semantics are available.

### D-039 — Rating-stat refresh has one owner

Status: `LOCKED`

Provider adapters and route handlers do not both recompute account rating statistics. Use one provider-neutral coalesced post-import refresh policy.

### D-041 — Import persistence decision finalized

Status: `LOCKED`

The accepted physical direction is extended `ImportRun` plus `AccountImportCoverage`, with retries represented as new linked runs and at most one non-terminal run per account.

### D-045 — Lightweight presentation uses focused progressive disclosure

Status: `LOCKED`

The functional onboarding experience follows [`EXPERIENCE_BLUEPRINT.md`](EXPERIENCE_BLUEPRINT.md): use a protected resumable route, present one dominant action per focused surface, progressively disclose advanced detail, and do not reproduce account Settings as a first-run dashboard or table.

### D-046 — Additional accounts follow first value

Status: `LOCKED`

Preserve the one-selected-account first run. Offer additional Lichess or Chess.com accounts as explicit expansion after account acceptance and preferably after the first useful result; do not require every account before preparation starts.

### D-047 — Activity is communicated with real milestones

Status: `LOCKED`

Make background work feel active through persisted provider-window, import, index, analysis, readiness, and newly-ready-value milestones. Do not time-smooth, fabricate, or visually advance progress without authoritative state.

### D-048 — Reveals reuse canonical evidence

Status: `LOCKED`

Onboarding may present a bounded ordered subset of import, opening, Player Chess Profile, analysis, or tactical facts, but feature-owned calculations and evidence thresholds remain authoritative. Angular must not create a second insight engine.

### D-049 — Reveal density is bounded

Status: `LOCKED`

Expose useful value progressively and show at most three evidence-labelled insight cards in one onboarding reveal. A reveal may occur before full preparation when its feature-specific evidence threshold is met.

### D-050 — Personal tactics and Builder are optional continuations

Status: `LOCKED`

An eligible personal tactical scenario and an evidence-anchored Repertoire Builder entry may be offered as optional next actions. Neither is a core-completion gate, and onboarding never selects repertoire moves, creates courses, or applies Builder changes.

### D-051 — Generated prototypes are design references, not production authority

Status: `LOCKED`

ChatGPT Sites, Figma Make, Codex/Figma, or repository-local prototypes use synthetic data and private review to validate states and interaction. Production remains the existing Angular/server architecture; generated framework, storage, authentication, routing, or migration choices are not accepted without normal architecture review.

### D-052 — Functional accessibility precedes final visual polish

Status: `LOCKED`

ONB-010 implements semantic, keyboard, focus, reduced-motion, zoom, progress, and state behavior as part of the functional experience. VT-302 / #133 owns final product-wide visual, responsive, empty-state, motion, and accessibility acceptance.

### D-053 — First-analysis lane is deterministic and bounded

Status: `LOCKED`

Unlock a three-game first-analysis batch from current successfully indexed, unanalysed games before the lower-priority analysis tail. Select newest-first within the target. Start when three indexed games exist, with a one-game fallback after normal index/import candidates are quiescent for a smaller account. Keep the sizes configurable.

### D-055 — Preparation uses targets and retained child-job batches

Status: `LOCKED`

Persist one `DataPreparationRun` with ordered account targets and durable `DataPreparationBatch` rows. A batch links to one child `JobRun` and retains terminal counts after child dismissal or retention deletion. Do not use child job history as the only parent state.

### D-056 — Every preparation batch has an immutable child job

Status: `LOCKED`

Create a separate immutable `INDEX_GAMES` or `ANALYSE_GAMES` `JobRun` for each bounded batch. Do not append tasks to an active run or combine index and analysis into `PROCESS_GAMES` for onboarding.

### D-057 — Preparation admission is bounded per run and globally

Status: `LOCKED`

Permit at most one non-terminal index batch and one non-terminal analysis batch per preparation run. Initial global limits are four non-terminal onboarding batches, 200 queued onboarding tasks, and 40 queued onboarding analysis tasks. Keep the limits configurable and increase only after queue-age/direct-user evidence.

### D-058 — Preparation scheduling remains below direct-user work

Status: `LOCKED`

Use existing `JobRun.source = ONBOARDING`. Initial lane priorities are `FIRST_INDEX = 200`, `FIRST_ANALYSIS = 190`, `INDEX_CONTINUATION = 180`, and `ANALYSIS_TAIL = 100`; retries retain their lane priority. Every preparation lane remains below the current lowest direct-user priority of 250. Preserve this ordering and floor.

### D-059 — Indexing pipelines from committed import rows

Status: `LOCKED`

Preparation may select and index valid committed `ImportedGame` rows before the provider window or import run is terminal. Core readiness still waits for terminal exact import coverage and terminal indexing outcomes. Persisted-state reconciliation is authoritative; no delivery event is required for correctness.

### D-060 — Current game evidence is readiness authority

Status: `LOCKED`

Use current index/opening/analysis evidence plus active child work to derive readiness. `JobTask.COMPLETED` or `SKIPPED` is execution history, not sufficient readiness proof. Historical batch totals are audit/progress evidence and must not be summed as the current eligible result set.

### D-061 — Preparation control is acknowledged and restart-safe

Status: `LOCKED`

Pause stops new admission and becomes `PAUSED` only after current import/child work is quiescent. Cancel becomes terminal only after import and child claims are acknowledged. Retry creates new child batches for failed/unprepared evidence without resetting historical jobs. Restart creates a linked recovery run; expansion creates a new immutable run.

### D-062 — Preparation reconciliation is a separate short worker loop

Status: `LOCKED`

Run a bounded PostgreSQL reconcile loop in the existing worker deployment. Initial cadence is one second for active due work and five seconds for idle scanning, with persisted immediate wake hints after import commits, child settlement, and controls. Never hold a reconcile transaction across provider I/O, PGN processing, or Stockfish execution.

### D-063 — Expansion is account-round-robin

Status: `LOCKED`

The first run remains one account. Multi-account expansion selects newest-first within each target and admits batches account-round-robin using immutable target order as the tie-break. The run still has only one active index and one active analysis batch.

### D-064 — Destructive actions have five separate meanings

Status: `LOCKED`

Use distinct actions for un-analysis, un-index, account-data purge, external-account deletion, and whole-app-user deletion. Do not expose one ambiguous reset/delete command whose retained data depends on hidden implementation details.

### D-065 — Destructive execution is durable, previewed, fenced, and idempotent

Status: `LOCKED`

Persist the preview/execution/checkpoint/audit boundary and user/account/game resource fences. Clients submit bounded server-resolved scope, a valid preview, confirmation, and an idempotency key; the browser never coordinates deletion phases.

### D-066 — Drain proof requires claim acknowledgement

Status: `LOCKED`

Install the resource fence before cancellation, reject new work, request preparation/import/job cancellation, and wait for every provider/import claim plus relevant `JobTask.workKey` to clear. Terminal run/task status alone is not sufficient proof that an executor can no longer write.

### D-067 — Un-index always includes un-analysis; shared engine evidence survives

Status: `LOCKED`

Un-index first clears all per-game analysis evidence and then removes plies/index state. Un-analysis, un-index, account purge/delete, and user deletion retain shared `Position`, `PositionAnalysis`, and `MastersExplorerCache`; ONB-006 owns separately proved orphan cleanup.

### D-068 — Derived analysis state is cleared by canonical source, then tags are recomputed

Status: `LOCKED`

Un-analysis deletes game analysis runs and AI reviews, clears latest-analysis and ply classification fields, removes every tactical detection/processed version, and recomputes the complete tag set. Retain tactical feedback and self-contained scenario history for un-analysis/un-index; purge/delete removes target-game scenario copies.

### D-069 — Account purge and account deletion retain independent OAuth by default

Status: `LOCKED`

Account purge removes games, import/coverage state, copied scenario data, rating statistics, and sync frontiers while retaining the account. Account deletion performs purge and removes the account/default reference. A separately managed `LichessConnection` remains unless the user explicitly disconnects it or deletes the whole app user.

### D-070 — Opening provenance is required

Status: `LOCKED`

Persist provider, local-book, legacy/unknown, and none provenance. Un-index clears only locally assigned opening values. Existing non-null values without provable source migrate conservatively to unknown and are retained.

### D-071 — Large destructive actions are bounded and forward-only

Status: `LOCKED`

Use deterministic short transactions with persisted phase/checkpoint progress. After deletion begins, retry resumes forward and does not promise rollback. Parent cascades are final cleanup/safety, not the only large-data execution plan.

### D-072 — Destructive audit survives deletion without becoming a shadow data store

Status: `LOCKED`

Retain action/status/timestamps/pseudonymous actor-target keys/aggregate counts/error codes and result linkage outside target cascades. Do not retain PGN, tokens, email, usernames, FEN history, AI content, scenario JSON, provider URLs, or raw auth subjects.

### D-073 — Whole-user deletion removes OAuth state and blocks silent identity recreation

Status: `LOCKED`

Delete local encrypted provider connections and OAuth login-state rows explicitly, attempt bounded upstream token revocation, remove all AppUser-owned rows in bounded phases, then delete `AppUser`. Persist a versioned HMAC identity tombstone checked before normal external-user upsert; starting fresh must be a deliberate later policy.

### D-074 — Mobile deletion requires a local-purge handshake

Status: `LOCKED`

Server deletion cannot erase offline SQLite data. The initiating client receives a terminal receipt and deletes its `local_user` row, cascading downloads, local training, and outbox rows before sign-out. Other offline devices purge on next contact and cannot upload stale attempts.

### D-075 — Account/game lifecycle actions rederive readiness, not disposition

Status: `LOCKED`

Un-analysis/un-index/purge/delete change feature readiness and active preparation evidence. They do not silently reset user onboarding disposition. Whole-user deletion removes disposition entirely; explicit preparation restart/recovery remains a separate command.

### D-076 — User and administrator actions share one lifecycle service

Status: `LOCKED`

ONB-005 may authorize administrator actors and UI, but it must call the same preview/fence/drain/execution/audit application service. Do not create administrator-only raw delete SQL or a second destructive state machine.

### D-077 — Preparation wave sizes are measured configuration

Status: `LOCKED`

Initial index and index-continuation waves are 50 games, first analysis is three games, and analysis tail is 10 games. Keep all values configurable. The existing worker slice of 25 remains a scheduler fairness/preemption boundary and is not a product wave.

### D-078 — Provider execution is serial and bounded initially

Status: `LOCKED`

Start with one active account-import executor, one provider request at a time, 14-day replayable Lichess windows, Chess.com calendar-month archive units, and duplicate-safe database writes of at most 100 normalized games per transaction. These are implementation-start defaults, not public timing promises.

### D-079 — Import and preparation loops use measured initial timing

Status: `LOCKED`

Start import polling/heartbeat/stale/recovery at one second, 15 seconds, two minutes, and 30 seconds. Start active/idle preparation reconciliation at one second and five seconds, with a 15-second due-warning threshold and persisted immediate wake hints. Controlled-clock tests and telemetry remain authoritative.

### D-080 — Public ETA is disabled until production telemetry qualifies it

Status: `LOCKED`

A future stage ETA requires a fixed denominator, matching provider/engine/depth/MultiPV/worker/database/game-length fingerprint, at least 30 recent successful samples across five runs and three account scopes, a 14-day-or-newer sample window, p90 no more than twice p50, failure/timeout below 5%, and no active rate limit, stall, pause, or material higher-priority preemption. Configuration or deployment changes invalidate the sample set.

### D-081 — First-value and stall budgets are internal controls

Status: `LOCKED`

Use internal p90 acceptance/alert budgets for durable command acceptance, reconciliation, first imported/indexed/analysed evidence, bounded waves, queue age, and no-progress detection. A budget breach raises telemetry/operational attention and does not fabricate UI progress or automatically cancel durable user work.

### D-082 — Capacity and engine changes require sustained evidence

Status: `LOCKED`

Keep one deployment and the current fresh-engine-per-task design initially. Split provider execution, add imported-game workers, or reuse Stockfish only after sustained queue-age/direct-user-latency/CPU evidence and dedicated fencing, cancellation, state-isolation, crash-recovery, connection-capacity, and memory tests.

## Operational and administrative decisions

### D-040 — Preparation wave sizing finalized

Status: `LOCKED`

Use the D-077 defaults and D-057 global caps. Keep the visible wave independent from `JOB_WORKER_SLICE_SIZE`, and change values only through measured configuration review.

### D-042 — Admin identity

Status: `PROVISIONAL`

Reuse Clerk authentication plus an environment allowlist of verified administrator subjects. ONB-005 validates and defines dev behavior/future role migration.

### D-043 — Angular admin surface

Status: `PROVISIONAL`

Use a lazy route in the existing web app, hidden and server-authorized, rather than a separate deployment.

### D-044 — Import operational sizing finalized

Status: `LOCKED`

Use D-078/D-079 as initial operational defaults, plus exact counters, rate-limit/retry-at state, queue-age/stage-duration telemetry, and canary validation. Do not infer provider latency or public ETA from synthetic CI timings.

### D-054 — Provider-speed preference in onboarding

Status: `REJECTED`

Do not label Lichess or Chess.com as the quicker first look from synthetic/local benchmarks. Provider choice remains user-controlled. Reopen only with comparable production-like provider telemetry and reviewed copy.

## Rejected

### D-100 — Synchronous full import and analysis

Status: `REJECTED`

Do not hold one HTTP request through provider fetch, indexing, and analysis.

### D-101 — Full history by default

Status: `REJECTED`

Do not make all-history preparation the first-use default.

### D-102 — Replace the durable worker

Status: `REJECTED`

Do not add Redis, a hosted queue, or a second imported-game executor without a later demonstrated requirement.

### D-103 — Equate worker slice with UX batch

Status: `REJECTED`

`JOB_WORKER_SLICE_SIZE` is scheduling fairness, not an onboarding wave contract.

### D-104 — Client advances every batch

Status: `REJECTED`

The workflow must continue without the user keeping a page open or repeatedly sending next-batch commands.

### D-105 — Raw admin table deletes

Status: `REJECTED`

No arbitrary delete endpoint or UI that bypasses lifecycle invariants.

### D-106 — Delete all Position data on account purge

Status: `REJECTED`

Shared analysis is separately retained and cleaned.

### D-107 — Build competing visual onboarding

Status: `REJECTED`

Functional work must coordinate with #133 and use the transformed shared system.

### D-108 — Browser-local onboarding authority

Status: `REJECTED`

Do not derive durable disposition, preparation stage, completion, or readiness from local storage, route history, or browser-only account/job inspection.

### D-109 — Full analysis as onboarding completion

Status: `REJECTED`

Do not block core completion behind all requested Stockfish analysis.

### D-110 — Global onboarding route trap

Status: `REJECTED`

Do not replace the sign-in guard with a rule that redirects every protected destination to onboarding.

### D-111 — Latest observed game time is coverage

Status: `REJECTED`

A game timestamp cannot prove no-game periods, exact scope, or gap-free provider traversal.

### D-112 — Continue after a failed game and advance coverage

Status: `REJECTED`

Do not count a parse/persistence failure, continue, and move the authoritative frontier beyond it. The current window must remain incomplete.

### D-113 — Return all imported IDs for browser handoff

Status: `REJECTED`

Do not use unbounded response arrays or client-side candidate coordination. Preparation selection is server/database owned.

### D-114 — Model provider fetches as imported-game tasks

Status: `REJECTED`

`JobTask` remains imported-game keyed. Account/provider import uses its own claimable run boundary.

### D-115 — Cursor reset is historical backfill

Status: `REJECTED`

Clearing `syncCursorTime` is ambiguous and can trigger full-history rescans. Older-history expansion and destructive reset are explicit domain commands.

### D-116 — First-run account-management dashboard

Status: `REJECTED`

Do not expose sync, index, analyse, cursor, activation, default-account, deletion, and other advanced account controls together as the onboarding experience. Keep them in Settings or progressively disclosed recovery/advanced destinations.

### D-117 — Blocking modal train

Status: `REJECTED`

Do not make the durable onboarding lifecycle a sequence of blocking modals. Use the resumable route; reserve dialogs for bounded confirmations.

### D-118 — Require all accounts before first value

Status: `REJECTED`

Do not delay the initial preparation run until every provider account is connected. Additional accounts are explicit expansion.

### D-119 — Fabricated or weighted overall progress

Status: `REJECTED`

Do not derive progress from elapsed time or combine import, indexing, and analysis into an arbitrary weighted overall percentage.

### D-120 — Adopt generated prototype code as architecture

Status: `REJECTED`

Do not bypass Angular, typed contracts, server-owned state, authentication, feature stores, design tokens, or repository guardrails because a generated prototype appears polished.

### D-121 — One mutable or unbounded preparation job

Status: `REJECTED`

Do not create one account-sized `JobRun`, append tasks to an active run, or change its denominator as import progresses. Use bounded immutable child jobs.

### D-122 — Generic DAG or per-game preparation mirror

Status: `REJECTED`

Do not introduce a generic workflow graph or a duplicate per-game preparation-state table without a later demonstrated recipe that cannot be represented by targets, current game evidence, and child jobs.

### D-123 — Task status equals readiness

Status: `REJECTED`

Do not treat `JobTask.COMPLETED` as proof of current readiness or `SKIPPED` as failure. Reconcile canonical game evidence.

### D-124 — Wait for terminal import before any indexing

Status: `REJECTED`

Do not withhold all index work until provider completion. Valid committed imported rows may provide first value while exact coverage continues.

### D-125 — Preparation retry outranks direct user work

Status: `REJECTED`

Do not boost onboarding retry above direct user actions. Retry remains bounded and uses the normal preparation lane priority.

### D-126 — Immediate cascade while writers are active

Status: `REJECTED`

Do not delete an account/user or clear game evidence before persisted fences are installed and active preparation/import/job claims are acknowledged.

### D-127 — Terminal status proves destructive quiescence

Status: `REJECTED`

A cancelled running task may retain `workKey` while its executor stops. Never treat terminal run/task status alone as drain proof.

### D-128 — Existing ply-clear primitive is public un-index

Status: `REJECTED`

Deleting plies and index timestamps alone leaves analysis, AI, tactical, tag, and opening state. Use the complete lifecycle operation.

### D-129 — Delete shared engine analysis during user/account reset

Status: `REJECTED`

Do not delete shared Position/PositionAnalysis/cache as part of lifecycle actions. ONB-006 handles separately proved orphan cleanup.

### D-130 — Clear tags or opening values blindly

Status: `REJECTED`

Recompute tags from remaining evidence and clear opening data only when provenance proves local assignment.

### D-131 — One giant destructive transaction

Status: `REJECTED`

Do not place an account/user-sized cascade and external token call in one transaction. Use bounded forward-only phases and short transactions.

### D-132 — Delete AppUser without OAuth/mobile/auth-recreation handling

Status: `REJECTED`

Do not claim whole-user deletion after only cascading `AppUser`. OAuth state, tokens, external identity recreation, initiating-device local data, and other offline devices require explicit handling.

### D-133 — Preserve copied scenario personal data after account purge

Status: `REJECTED`

Scenario snapshots may survive un-analysis/un-index as user training history, but account purge/delete must remove snapshots sourced from target games.

### D-134 — Separate administrator deletion implementation

Status: `REJECTED`

Administrator authorization may differ, but execution must reuse the canonical lifecycle operation and audit path.

### D-135 — Public ETA from synthetic CI timing

Status: `REJECTED`

Do not convert local PostgreSQL, synthetic provider, or WASM CI timings into a production completion promise.

### D-136 — Parallel provider requests by default

Status: `REJECTED`

Do not parallelize Lichess windows or Chess.com archives in the initial implementation. Serial provider access and explicit rate-limit handling are required.

### D-137 — Symmetric 50-game analysis waves

Status: `REJECTED`

Do not choose analysis wave size merely to match the index wave. Analysis is materially more expensive; use the measured three-game first sample and 10-game tail.

### D-138 — Scale workers before queue evidence

Status: `REJECTED`

Do not add deployments or replicas because a benchmark can run faster. Require sustained queue-age, direct-user latency, CPU, connection-capacity, and concurrency-safety evidence.

### D-139 — Persistent engine reuse without isolation proof

Status: `REJECTED`

Do not reuse Stockfish across tasks until option/state leakage, cancellation, timeout, crash replacement, memory, and preemption behavior are validated.

### D-140 — Run onboarding benchmark against a normal database

Status: `REJECTED`

The retained benchmark must refuse remote, non-disposable, or non-empty databases and must never call third-party providers.

## Open

See [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) for questions and owners.
