# ONB-015 — Account sync cutover and preparation handoff

Date: 2026-08-22

Status: implementation complete on PR #400; final review promotion remains gated on exact-head CI and canonical queue reconciliation.

Issue: [#203](https://github.com/vokerg/chess_repertoir_trainer/issues/203)

Runtime pull request: [#400](https://github.com/vokerg/chess_repertoir_trainer/pull/400)

Branch: `account-import/onb-015-account-cutover`

## Outcome

Normal account refresh is no longer a synchronous provider request. The existing account refresh URL now persists a durable `AccountImportRun`, returns `202 Accepted`, and relies on the existing account-import worker for provider traversal. The account settings UI restores persisted run state after navigation/reload and exposes durable pause, resume, cancel, retry, and explicit bounded historical-backfill controls.

The cutover also removes browser authority over imported-game ID arrays. Preparation handoff is now a restart-safe PostgreSQL reconciliation boundary: persisted account-refresh intent is linked to bounded server-side preparation targets, while candidate game selection remains inside the existing preparation repositories.

## Delivered API and persistence boundary

- `POST /api/me/accounts/:id/sync` preserves the compatibility URL and ownership checks but now only admits durable work and returns `202`.
- Normal account refresh uses the canonical standard Bullet/Blitz/Rapid, rated-or-unrated scope required by current rating/performance behavior.
- With no exact coverage, refresh requests a bounded recent three-calendar-month interval. With exact coverage, refresh requests only the forward interval from `coveredThrough` to the new requested boundary.
- `POST /api/me/accounts/:id/backfill` is the explicit historical-expansion command. It queues the three calendar months immediately preceding exact `coveredFrom` and never rewinds forward coverage.
- `ACCOUNT_REFRESH` is a persisted durable import source. Generic `/api/me/account-imports` commands remain `USER_ACTION`; retries preserve `ACCOUNT_REFRESH` only when retrying an account-refresh run.
- The database source check is migrated additively. Existing durable and legacy rows are not reclassified during rollout, so deployment cannot retroactively manufacture account-refresh intent.
- `POST /api/me/accounts/:id/imported-game-workflow-candidates` and its operation ID are retained for compatibility, but its response is aggregate-only. It no longer returns imported/eligible game ID arrays.

## Preparation handoff

The existing worker deployment owns a restart-safe account-import/preparation reconciliation pass. It does not depend on an in-memory import-completion callback.

Handoff rules:

- only persisted `ACCOUNT_REFRESH` imports are eligible for automatic account-settings preparation;
- generic durable `USER_ACTION`, `ONBOARDING`, or `SYSTEM` imports are not silently adopted;
- eligible source scope must contain standard Blitz/Rapid preparation material; Bullet may be imported for account statistics but is intentionally excluded from the standard preparation target scope;
- completed imports are eligible only while exact `AccountImportCoverage` survives for their scope/range;
- retained terminal `ImportRun` history therefore cannot recreate preparation after a future ONB-020 purge removes coverage;
- retry runs relink recoverable preparation targets rather than create duplicate parents;
- a bounded user/account selection is used and the existing preparation repositories continue to perform bounded server-side game candidate selection.

This preserves the ONB-003/017/018 architecture: browser presence is not required, provider work is not moved into preparation transactions, and no response-sized ID array is used as a workflow command.

## Provider-neutral derived state

### Rating/account projections

Rating projection recomputation scans imported games outside the lifecycle guard, then performs only a short guarded database commit. The snapshot boundary and persisted `computedAt` use the PostgreSQL clock, avoiding cross-host clock-skew assumptions between API/worker processes and lifecycle-fence timestamps.

Post-completion reconciliation is database-driven and bounded. It can rebuild rating-derived state after any completed durable import represented by surviving exact coverage, but only `ACCOUNT_REFRESH` forward runs may advance the compatibility `ExternalAccount.lastSyncAt` / `lastSyncRunId` frontier. Historical backfill and generic same-scope durable user actions do not impersonate normal account refresh.

If ONB-020 later purges account import coverage and projections while retaining terminal import history, the reconciler and rating read-through path do not recreate the purged projection from that history alone.

### Played-game Activity Feed

Played-game reconciliation remains provider-neutral and derives dates from committed `ImportedGame` rows. Expensive aggregation happens before the lifecycle guard. The short write transaction rechecks lifecycle write permission and effective user time zone immediately before replacing daily aggregates.

The snapshot boundary also comes from PostgreSQL, so a lifecycle fence that appears after the aggregate snapshot started cannot be missed because of API/worker host clock skew.

## Angular account-settings cutover

The account store now treats persisted import runs as authoritative background state:

- initialization loads accounts plus active/recent durable imports;
- active work restores after navigation, reload, or a later session;
- polling is used only while persisted non-terminal work exists and is restart-independent;
- refresh-all submits independent account commands with `Promise.allSettled` instead of serially waiting for provider traversal;
- partial admission failure preserves successful queued accounts and refreshes persisted state for conflicted accounts;
- pause, resume, cancel, and retry patch the returned durable run immediately and continue persisted polling;
- explicit three-month backfill replaces raw-cursor-reset UX;
- manual browser-driven indexing/analysis over game ID arrays is removed;
- the account card shows truthful queued/running/paused/cancelling/completed/failed state and exact persisted counts;
- failed/cancelled terminal settlement timestamps are not presented as a successful "Last completed" import.

The normal account UI keeps account deletion disabled until ONB-020 provides the fenced destructive coordinator.

## Compatibility and destructive ownership

ONB-015 intentionally does not claim destructive lifecycle execution.

- Backend `DELETE /api/me/accounts/:id` remains the legacy compatibility implementation. ONB-020 owns its final fenced cutover. The normal Angular account UI disables deletion so ONB-015 does not advertise the legacy operation as safe product behavior.
- Deprecated `POST /api/me/accounts/:id/reset-cursor` retains only its legacy-field behavior: it clears `syncCursorTime` and leaves exact `AccountImportCoverage` untouched. It is not exposed by the normal account UI.
- Durable historical expansion is exclusively `/backfill`; cursor clearing is not an import/backfill command.
- Existing account URLs and ownership scoping are preserved where practical.

This boundary was corrected during self-review after an intermediate implementation temporarily intercepted backend DELETE and treated reset-cursor as a backfill alias. That approach was rejected because ONB-020 explicitly owns the destructive route cutover.

## Deployment and rollback

The existing persistent worker is required for this cutover; no new deployment unit was added.

Rollout order:

1. apply migrations and deploy the worker version containing durable provider execution, preparation handoff, and post-completion reconciliation;
2. verify the worker can claim durable import rows;
3. deploy the API that changes account sync to `202` durable admission;
4. deploy the Angular account page that consumes persisted run state and controls.

Do not expose the API cutover before a compatible worker is available. Accepted work is durable and may remain queued during an outage, but rollout should not intentionally create a user-visible backlog.

Rollback must leave already accepted durable work intact. Keep a compatible worker running until accepted imports/preparation are terminal or explicitly controlled. Do not use migration rollback or cursor clearing to discard durable coverage/history. API/web rollback must be coordinated because the former account page expects the old synchronous response shape.

The detailed operational sequence is recorded in `docs/deployment.md`.

## Validation coverage

Focused coverage added or expanded for:

- durable `/accounts/:id/sync` `202` compatibility, ownership, active-run conflict, bounded initial scope, and explicit backfill error behavior;
- OpenAPI convergence for the bodyless durable sync/backfill actions, exact `202` responses, preserved candidate operation ID, and deprecated typed reset-cursor response;
- legacy DELETE/reset route compatibility without moving ONB-020 ownership into this task;
- aggregate-only imported-game workflow summary and absence of response ID arrays;
- bounded multi-account preparation handoff, generic-import exclusion, retry relinking, completed-run coverage proof, and Bullet-only exclusion;
- restart-safe post-completion reconciliation, bounded draining, forward-sync compatibility projection, historical backfill behavior, generic same-scope source isolation, and purge non-resurrection;
- lifecycle-fence snapshot semantics for rating and played-game activity writes, including database-clock snapshot boundaries;
- Angular reload restoration, active/recent precedence, concurrent multi-account queueing, partial failure recovery, queued/running/paused/terminal/failed state, pause/resume/cancel/retry controls, explicit backfill UX, disabled destructive UI, and truthful completion facts.

The repository has no dedicated browser E2E harness for this account page. Browser-facing reload/navigation/control behavior is therefore exercised through the existing Angular store/component DOM tests rather than by introducing unrelated Playwright/Cypress infrastructure in ONB-015.

Final exact-head CI evidence is recorded when this task is promoted to `REVIEW`; `DONE` remains reserved for accepted/merged delivery under the onboarding protocol.

## Self-review findings resolved during implementation

1. **Destructive ownership drift** — an intermediate DELETE interception and reset-as-backfill alias crossed into ONB-020 ownership. Restored backend compatibility and kept destructive controls disabled only in the normal UI.
2. **Completion callback durability** — an in-memory post-completion callback could be lost after terminal import settlement. Replaced with restart-safe persisted reconciliation.
3. **Purge resurrection** — retained terminal history could otherwise recreate projections/preparation after purge. Completed handoff and post-completion work now require surviving exact coverage.
4. **Lifecycle clock skew** — application `new Date()` snapshot boundaries were unsafe against database fence timestamps across hosts. Rating/activity snapshots now use PostgreSQL time.
5. **Preparation intent ambiguity** — scope/priority alone could cause generic imports to be adopted. Added persisted `ACCOUNT_REFRESH` source intent without rewriting historical rows.
6. **OpenAPI transitional debt** — restored reset compatibility initially increased `legacyOpaqueResponseSchema` usage. Replaced it with the exact external-account response schema; the repository hygiene debt count decreases instead of expanding.
7. **OpenAPI convergence drift** — the global convergence test still described synchronous account sync and did not allowlist durable backfill. Updated it to assert bodyless durable `202` semantics.
8. **Generic import sync-frontier leak** — same-scope generic durable imports could advance `lastSyncAt/lastSyncRunId`. Sync-frontier selection now requires `ACCOUNT_REFRESH`, while generic imports may still rebuild provider-neutral derived statistics.
9. **Angular status/control coverage** — added explicit persisted completed/failed restoration plus resume/cancel/retry regressions in addition to existing queued/running/paused/reload/multi-account coverage.
10. **Misleading completion fact** — failed/cancelled `completedAt` timestamps were presented as successful completion. The UI now falls back to the last successful account refresh marker unless the latest run actually completed successfully.

## Scope boundary and residual risk

- The current durable import scope vocabulary intentionally supports standard Bullet, Blitz, and Rapid. Legacy Lichess sync historically could retain slower standard categories; widening the shared durable provider contract is not part of ONB-015 and should be a separately reviewed product/contract change if desired.
- ONB-020 remains responsible for safe account purge/delete/reset execution and backend destructive-route replacement.
- ONB-025 remains responsible for automatic stale-account refresh triggering after this cutover is accepted.
- ONB-008/009/010 remain responsible for onboarding disposition/readiness, lifecycle commands, and final onboarding/Home product flow.
- Final visual/accessibility polish remains coordinated with the visual-transformation work; ONB-015 preserves current shared account-page primitives rather than creating a parallel design system.

## Canonical reconciliation

Before promotion to `REVIEW`, `TASKS.md`, `STATUS.md`, `ROADMAP.md`, `GITHUB_ISSUES.md`, `OPEN_QUESTIONS.md`, this task file, issue #203, and PR #400 are reassessed against this delivered boundary. No new program-wide architecture decision is required beyond the existing ONB-002/003/004 contracts; the additive `ACCOUNT_REFRESH` source is an implementation-level persisted intent needed to enforce those ownership boundaries.
