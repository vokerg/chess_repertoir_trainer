# Onboarding and Data Lifecycle Decisions

Last updated: 2026-07-28

Statuses:

- `LOCKED` — program foundation agreement; change only through reviewed decision update.
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

The product default is standard blitz and rapid games. Exact rated/date policy is delegated.

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

Show persisted state and counts. ETA is disabled until ONB-007 approves an evidence-based policy.

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

## Provisional

### D-020 — Recent window

Status: `PROVISIONAL`

Use the most recent three months. ONB-001/002 must decide rolling/date-only semantics and coverage wording.

### D-021 — Visible wave target

Status: `PROVISIONAL`

Start research with approximately 50 games per preparation wave. ONB-003/007 decide final policy/configuration.

### D-022 — Preparation aggregate

Status: `PROVISIONAL`

Add a small user-owned preparation/onboarding aggregate that references import requests and JobRuns. Do not create a generic workflow platform.

### D-023 — Import persistence

Status: `PROVISIONAL`

Persist account-level import work with separate bounded-initial, incremental-forward, and historical-backfill modes. ONB-002 decides whether to extend ImportRun or add a request/task model.

### D-024 — Admin identity

Status: `PROVISIONAL`

Reuse Clerk authentication plus an environment allowlist of verified administrator subjects. ONB-005 validates and defines dev behavior/future role migration.

### D-025 — Angular admin surface

Status: `PROVISIONAL`

Use a lazy route in the existing web app, hidden and server-authorized, rather than a separate deployment.

### D-026 — First account

Status: `PROVISIONAL`

Guide one selected account through the first run; treat additional accounts as expansion.

### D-027 — Separate INDEX and ANALYSE stages

Status: `PROVISIONAL`

Use separate JobRuns/waves for clearer value, resource, and recovery semantics instead of onboarding through opaque PROCESS jobs.

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

## Open

See [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) for questions and owners.
