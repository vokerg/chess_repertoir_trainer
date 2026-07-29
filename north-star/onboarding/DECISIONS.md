# Onboarding and Data Lifecycle Decisions

Last updated: 2026-07-29

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

Show persisted stage state and exact counts. Percentages require a fixed denominator. ETA and “almost done” wording are disabled until ONB-007 approves an evidence-based policy.

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

## Provisional

### D-040 — Visible wave target

Status: `PROVISIONAL`

Start research with approximately 50 games per preparation wave. ONB-003/007 decide final policy/configuration.

### D-041 — Import persistence

Status: `PROVISIONAL`

Persist account-level import work with separate bounded-initial, incremental-forward, and historical-backfill modes. ONB-002 decides whether to extend ImportRun or add a request/task model.

### D-042 — Admin identity

Status: `PROVISIONAL`

Reuse Clerk authentication plus an environment allowlist of verified administrator subjects. ONB-005 validates and defines dev behavior/future role migration.

### D-043 — Angular admin surface

Status: `PROVISIONAL`

Use a lazy route in the existing web app, hidden and server-authorized, rather than a separate deployment.

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

## Open

See [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) for questions and owners.