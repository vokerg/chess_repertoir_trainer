# Onboarding and Data Lifecycle Open Questions

Last updated: 2026-08-26

Every material question has one owning task. Completed-task design and review history remains in its task file and append-only reports; this file tracks only unresolved implementation/product questions that can still affect future work.

## Recently resolved by merged implementation

### ONB-008 / #193 — disposition/readiness projection

Resolved by PR #398, final head `d303c692883f9d7354167c7618853a76f80022c9`, CI #3149, and the ONB-008 implementation/completion reports.

The server-owned projection vocabulary, bounded evidence shape, ownership/lineage fencing, legacy adoption, fixed-denominator progress behavior, tactical readiness policy/versioning, action intents, and malformed cross-user import-link behavior are no longer open ONB-008 questions.

No ONB-008-owned question remains open.

### ONB-015 / #203 — account-sync cutover/preparation handoff

Resolved by PR #400, the 2026-08-24 thorough self-review addendum, final CI #3156, and the ONB-015 completion record.

The durable account-refresh compatibility contract, explicit bounded backfill, preparation handoff, refresh retry/admission policy, source-isolated sync frontier, lifecycle-fenced rating/activity reconciliation, purge-epoch non-resurrection behavior, Angular persisted import state, and worker-first rollout/rollback contract are no longer open ONB-015 questions.

Final destructive DELETE/reset compatibility removal is intentionally **not** an ONB-015 question; it belongs to ONB-020.

No ONB-015-owned question remains open.

### ONB-019 / #259 — destructive lifecycle foundation

Resolved by PR #386, both ONB-019 self-review addenda, final CI #3013, and the ONB-019 completion record.

Operation/fence persistence, overlap serialization, commit-side writer guards, idempotent preview binding, first-destructive-commit atomicity, forward-only claimed-state movement, identity/user lock ordering, audit/provenance/tombstone foundations, and durable action/scope consistency are no longer open ONB-019 questions.

Operation-specific destructive row execution remains owned by ONB-020/021, not ONB-019.

No ONB-019-owned question remains open.

## ONB-009 / #194 — onboarding lifecycle commands

Still owned by ONB-009:

- final route grouping/naming over the delivered onboarding/import/preparation modules;
- duplicate/idempotent command response vocabulary;
- exact expansion command payload for history, bullet, and additional-account scopes;
- explicit no-data finish/skip reason vocabulary;
- action priority/destination behavior after each accepted command;
- exact accepted-versus-acknowledged pause/cancel response vocabulary while reusing ONB-018 quiescence semantics.

These are implementation-local API decisions; they must not redefine ONB-008 readiness or ONB-019/020 destructive lifecycle state.

## ONB-010 / #195 — functional Angular onboarding/Home

Still owned by ONB-010:

- final transformed shared-primitives implementation base at claim time;
- exact Home versus `/onboarding` split at compact widths;
- product polling/cache cadence over the server projection;
- Angular component/store decomposition;
- accepted prototype/review artifact and copy/component handoff;
- final responsive/accessibility handoff boundary with Visual Transformation #133.

The browser must consume ONB-008/009 contracts rather than infer lifecycle, progress, readiness, or ETA.

## ONB-020 / #260 — account/game destructive coordinator

Still owned by ONB-020:

- exact bounded phase decomposition and checkpoints for un-analysis, un-index, account purge, and account deletion;
- measured game-batch/query/lock limits within ONB-007 budgets;
- exact authenticated preview/execute/status route shape over ONB-019 operations;
- drain integration details across import, preparation, and job work keys;
- final compatibility cutover/removal timing for immediate account DELETE and raw cursor reset;
- verified row-retention/deletion matrix and postcondition checks, especially copied scenario data and retained terminal import history after purge.

ONB-020 must reuse ONB-019 fences/transactions and cannot create a parallel lifecycle state machine.

## ONB-021 / #261 — whole-user deletion/mobile purge

Still owned by ONB-021:

- current mobile offline/outbox purge contract and exact next-contact deleted-state handshake;
- bounded whole-user deletion phase/checkpoint decomposition after ONB-020 account cleanup is available;
- exact post-delete receipt/status capability shape that cannot reprovision an `AppUser`;
- provider-token revocation failure handling versus mandatory local token/state deletion;
- multi-device stale-outbox rejection/purge ordering.

ONB-021 remains blocked on ONB-020 delivery.

## ONB-024 / #274 — administrator lifecycle controls

Still owned by ONB-024:

- proof that the pinned Clerk client flow can provide fresh signed `fva` plus one-use `reverification_id` evidence bound to the requested execution;
- exact administrator capability/action mapping over the final ONB-020/021/026 services;
- bounded administrator audit list/detail projection and retention configuration;
- whether/when administrator whole-user deletion is explicitly enabled by a separate support/policy decision.

Administrator execution stays disabled where canonical lifecycle services or proven reverification evidence do not yet exist.

## ONB-025 / #276 — stale-account refresh trigger

Still owned by ONB-025:

- final command route/name in the delivered account-import module;
- persisted automatic-refresh cooldown and failed-attempt backoff representation;
- exact bounded per-account result vocabulary for fresh/already-active/fenced/failed cases;
- root/session bootstrap integration point that runs once per authenticated application session without moving orchestration into `auth.plugin.ts`;
- interaction with inactive/deleted/fenced accounts as ONB-020 changes account lifecycle behavior.

The 24-hour rolling cooldown is the accepted initial policy; browser-local timestamps and cron scheduling are not options.

## ONB-026 / #280 — orphan shared-position cleanup

Still owned by ONB-026:

- deployed PostgreSQL major-version verification for statement-trigger transition relations;
- current Prisma/schema/migration ownership immediately before claim;
- exact migration SQL, constraints, indexes, and transition-relation trigger implementation;
- measured scan/delete batch sizes at or below the accepted 500-input-row ceiling;
- query plans and transaction/lock p50/p90 evidence;
- exact worker/manual-command integration while preserving the accepted table-lock order and dry-run semantics.

If deployed PostgreSQL cannot support the required transition-relation contract, ONB-026 returns to design review rather than weakening the database-owned reset invariant.

## No question reopened by the 2026-08-26 reconciliation

`DECISIONS.md` was reassessed while reconciling ONB-008/015/019 completion. No new architecture or product decision was required. This reconciliation changes task/queue truth and downstream readiness only; it does not silently alter accepted behavior.
