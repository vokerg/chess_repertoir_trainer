# ONB-015 thorough self-review addendum — cutover recovery and derived-state hardening

Date: 2026-08-24

Issue: #203

Pull request: #400

Parent report: `ONB-015-2026-08-22-account-sync-cutover-handoff.md`

## Review scope

This review re-read the implemented account-sync cutover against ONB-002/003/004, the live ONB-015 issue handoff, delivered ONB-018 preparation control, and delivered ONB-019 lifecycle-guard semantics. It focused on failure/retry recovery, future ONB-020 purge interaction, derived-state resurrection, Angular persisted-work settlement, route compatibility, and exact deployment rollback assumptions.

## Findings corrected

### 1. Retained failed initial refresh could be abandoned with an incomplete accepted range

A failed or cancelled `BOUNDED_INITIAL` account refresh may have committed newest-first coverage before termination. Starting a brand-new forward refresh from that frontier would leave the older remainder of the accepted initial range permanently missing.

Admission now requires explicit Retry while surviving exact coverage proves the failed/cancelled initial refresh is incomplete. Retry preserves the immutable original range and remains linked to the existing preparation target. If a future destructive purge removes that coverage, retained terminal history alone no longer blocks normal account reuse.

Focused PostgreSQL coverage proves the surviving-partial-coverage block and the post-purge reuse boundary.

### 2. Preparation handoff intent was too implicit

The compatibility account-refresh path now persists explicit source `ACCOUNT_REFRESH`. Generic `USER_ACTION` imports do not automatically enter account-refresh preparation handoff. The migration expands the durable source/check constraints without rewriting historical `USER_ACTION` rows.

Completed refresh history can enter handoff only while exact surviving `AccountImportCoverage` still covers the requested range. This keeps progressive non-terminal handoff restart-safe while preventing retained terminal history from manufacturing preparation work after future purge removes coverage.

### 3. Multi-account post-completion latency was unnecessarily serialized

The persisted post-completion scanner was already the restart-safe correctness authority, but one candidate per maintenance pass could make reconciliation latency proportional to account count. The worker now drains at most 20 persisted candidates per maintenance pass. The bound is explicit and tested; there is still no in-memory completion dependency or new queue/service.

### 4. Lifecycle snapshot timestamps mixed application and database clocks

Rating and played-game activity aggregation originally took stale-write snapshots from application time while lifecycle fence timestamps are database-generated. Cross-host clock skew could therefore undermine the `releasedAt >= snapshotStartedAt` stale-snapshot rule.

Both derived-state paths now read the snapshot from PostgreSQL before expensive aggregation. Rating projection `computedAt` is also written from the database clock inside the guarded transaction. Provider I/O/large aggregation remains outside the lifecycle guard; only the short revalidation/write commit is guarded.

### 5. Purged rating projection could be resurrected by retained history or read-through

Two separate resurrection paths were found during review:

- retained completed durable `ImportRun` history plus imported game rows could cause lazy rating recomputation after exact durable coverage had been removed;
- a fresh/legacy/purged account with no rating-relevant evidence could manufacture an empty `AccountRatingStats` row simply by reading the rating endpoint.

The read-through rule now combines both protections:

- a retained completed durable import with no surviving coverage is a purge epoch boundary and returns `null` rather than recomputing;
- when no stored projection exists, no rating-relevant imported game means `null` and no derived row creation.

The HTTP route already had an explicit nullable 200 response. The final contract fix aligned its HTTP boundary test and Angular API type with that existing schema. Dedicated integration coverage proves fresh-empty reads do not create rows, evidence-backed reads rebuild, and purge-like coverage/evidence removal stays non-resurrecting.

### 6. Angular polling could miss settlement when a run disappeared from both projections

The persisted accounts store now treats a previously active run disappearing from both active and recent projections as settlement rather than silently continuing with stale local state. Settlement reloads bounded account/workflow state. Focused polling coverage exercises that disappearance case in addition to normal terminal transitions.

### 7. Compatibility/destructive ownership had drifted during review

ONB-015 does not own final destructive execution. The final boundary is:

- backend `DELETE /api/me/accounts/:id` remains the existing compatibility implementation until ONB-020 replaces it with the canonical fenced destructive coordinator;
- normal Angular account deletion remains disabled so ONB-015 does not present the unfenced compatibility route as safe product behavior;
- deprecated `/reset-cursor` clears only legacy `syncCursorTime` and does not mutate durable `AccountImportCoverage`;
- `/backfill` is the explicit durable historical-expansion command.

The reset route keeps an exact typed external-account response rather than increasing opaque-schema debt.

### 8. Rollback documentation overstated what queue drain can make safe

Draining active imports/preparation is necessary before rollback but does not make a binary predating `ACCOUNT_REFRESH` source-compatible. Terminal `ImportRun` rows are intentionally retained, so a pre-cutover contracts revision can still reject persisted source values after the queue is empty.

Deployment guidance now requires rollback to remain schema/source-compatible with retained durable rows. Database migrations are not an application rollback mechanism; any deliberate retained-data rewrite would require a separately reviewed migration.

## Validation history and CI-driven fixes

The repeated exact-head runs were treated as executable review rather than as flaky noise:

- CI #3143 exposed an invalid recovery-policy test expectation: `/backfill` cannot reach retry admission without the coverage precondition. The fixture was corrected instead of weakening production admission.
- CI #3151 exposed a regression where the zero-evidence rating simplification had accidentally removed the durable-coverage purge epoch check. The two guards were combined.
- CI #3153 then exposed a stale HTTP contract test that still parsed an empty-account rating response as a non-null object even though the route schema was already nullable. The test and Angular API type were aligned with the actual public route contract.
- CI #3155 / run `32692461730` passed end-to-end on runtime head `5a2b6348ee516c477c9353020fd90f365f2cc25a`.

CI #3155 passed:

- dependency install and audit;
- lint;
- full domain/contracts/API/web/mobile build;
- opening classification and knowledge audits;
- architecture guardrails;
- repository hygiene guardrails;
- migrations from an empty PostgreSQL database;
- imported-game opening classification/knowledge audits;
- the complete repository test suite, including the new recovery, purge-epoch, nullable-boundary, Activity Feed, preparation-handoff, and Angular polling regressions.

GitHub checked out the live PR merge ref against then-current `main`, so the successful run also exercised current-main integration rather than only the branch's historical merge base.

## Preserved scope boundaries

- No provider-adapter rewrite.
- No new worker/service/deployment unit.
- No new broker, storage layer, queue library, or frontend state framework.
- Durable normal refresh scope remains Bullet/Blitz/Rapid; standard preparation handoff remains Blitz/Rapid.
- Legacy Lichess synchronous history could contain slower standard perf types; widening the durable shared speed contract is intentionally not folded into this cutover.
- No ONB-009/010 onboarding command/UI ownership.
- No lifecycle-fence persistence ownership beyond consuming the delivered guard.
- Final account/game destructive execution and final DELETE/reset compatibility cutover remain ONB-020-owned.

## Review disposition

Runtime implementation is review-ready at `5a2b6348ee516c477c9353020fd90f365f2cc25a` after CI #3155. Repository status/rollback/review records are reconciled in a following documentation-only commit, which must itself pass exact-head CI before PR #400 is marked ready for review. The task remains `REVIEW` and issue #203 remains open until acceptance/merge and completion reconciliation.