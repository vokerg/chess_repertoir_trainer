# ONB-009 — Onboarding lifecycle commands implementation

Date: 2026-08-26

Issue: #194

Pull request: #406

Branch: `onb-009/issue-194-lifecycle-commands`

Status: review

## Delivered boundary

ONB-009 now exposes authenticated server-owned lifecycle commands over the durable account-import and preparation execution boundaries delivered by ONB-011/012/017/018. Routes remain thin: they validate shared contracts, enforce authenticated ownership through the command service/repositories, and delegate pause/resume/cancel/retry semantics to the existing preparation reconciler.

The implementation deliberately does not add Angular onboarding UI, provider-specific import logic, a second worker/reconcile loop, MCP mutation tools, or destructive account/user lifecycle behavior.

## Command API

- `POST /api/me/onboarding/start` — accepts the default bounded first-run recipe for one owned account and returns after durable acceptance.
- `POST /api/me/onboarding/skip` — changes first-run guidance disposition only; accepted preparation/import work is not cancelled.
- `POST /api/me/onboarding/runs/:runId/finish` — explicitly completes first-run guidance for attention outcomes where the existing ONB-008 projection advertises `FINISH_ONBOARDING`.
- `POST /api/me/onboarding/runs/:runId/pause` — persists a quiescent pause request through ONB-018.
- `POST /api/me/onboarding/runs/:runId/resume` — resumes an acknowledged paused run through ONB-018.
- `POST /api/me/onboarding/runs/:runId/cancel` — persists acknowledged cancellation request state through ONB-018; it does not report terminal cancellation early.
- `POST /api/me/onboarding/runs/:runId/retry` — delegates retry-generation creation to ONB-018 so historical child jobs remain immutable.
- `POST /api/me/onboarding/runs/:runId/restart` — creates a new linked `RECOVERY` run for terminal failed/cancelled work and preserves durable import retry lineage.
- `POST /api/me/onboarding/runs/:runId/expand` — creates a new immutable `EXPANSION` run for older history, bullet, or an additional account.

## Default recipe

The start command persists the ONB-001 default recipe rather than relying on browser state:

- one selected owned account;
- UTC date range from three calendar months before the start date through the start date, stored as a half-open interval;
- standard chess only;
- blitz and rapid;
- rated and unrated games;
- newest-first provider traversal;
- indexing enabled;
- engine analysis enabled but non-blocking for core readiness;
- AI review disabled;
- repertoire/course generation disabled.

The preparation target stores its own immutable preparation-scope version/hash/snapshot and the durable import run reference.

## Lifecycle and idempotency rules

- The existing database invariant remains the authority for one non-terminal preparation run per user.
- Duplicate equivalent start/restart/expansion commands return the already-accepted run instead of creating another preparation run.
- Durable account imports are reused only when account, mode, source, canonical scope, requested range, and retry lineage match; conflicting active imports are rejected.
- `SKIPPED` is guidance state, not cancellation. The existing ONB-008 database invariant may later advance a skipped user to `COMPLETED` when an onboarding/recovery lineage reaches `coreReadyAt`.
- `FINISH_ONBOARDING` is accepted only from the attention states for which ONB-008 advertises that action: `NO_RECENT_GAMES`, `ALL_INDEXING_FAILED`, and `IMPORT_RETRY_AVAILABLE`. Finishing guidance does not cancel or rewrite the preparation attempt.
- A `NO_RECENT_GAMES` onboarding attempt is terminalized before an explicit expansion is accepted so the one-active-run invariant remains intact; the new work is an immutable `EXPANSION` run rather than a reopened historical run.
- Expansion-only runs do not complete first-run disposition through the existing core-readiness trigger.

## Existing boundaries reused

- Account-import persistence/admission/canonical scope handling from ONB-011/012/015.
- Preparation run/target persistence and one-active-run database invariant from ONB-017.
- Pause/resume/cancel/retry and reconciliation semantics from ONB-018.
- User disposition, readiness/action projection, and core-ready completion trigger from ONB-008.

No additional queue, background job, schema model, or lifecycle state machine was introduced.

## Validation added

Focused integration/contract coverage now checks:

- duplicate concurrent default starts and one immutable accepted run;
- persisted default recipe/import/preparation scope and date-window semantics;
- skip versus cancellation semantics;
- pause request, acknowledged paused resume, cancel request, and repeat idempotency;
- ownership isolation;
- terminal cancelled restart with preparation and import retry lineage;
- skipped-to-completed transition when linked recovery reaches core readiness;
- explicit finish for no-data and the other ONB-008-advertised attention outcomes;
- older-history, bullet, and additional-account expansion snapshots;
- retry-generation delegation;
- OpenAPI registration, operation IDs, status responses, params, and request bodies for every command route.

Repository CI is the executable validation environment because the local runner used for this task could not resolve `github.com`; no local-test result is claimed.

## Self-review notes

During review, an initially proposed core-ready trigger was removed after re-inspecting the delivered ONB-008 migration: the repository already owns that invariant, including recovery-lineage checks and exclusion of expansion-only runs.

A second review found that the existing readiness projection advertises `FINISH_ONBOARDING` for three attention outcomes, while the first command draft accepted only `NO_RECENT_GAMES`. The mutation boundary was aligned with the existing projection and focused tests were added instead of changing the previously delivered ONB-008 action contract.
