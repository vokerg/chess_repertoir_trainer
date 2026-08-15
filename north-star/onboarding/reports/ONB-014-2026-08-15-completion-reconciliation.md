# ONB-014 completion reconciliation

Date: 2026-08-15

Issue: #202

Runtime pull request: #356

Final runtime pull-request head: `d4592fe6b0e3c61ee9d25bc1517a8fc83a7466c2`

Runtime squash commit: `b9c2038bfd20f7b0a493c2eda3dd6c2aed911ec5`

Completion reconciliation pull request: #383

## Decision

ONB-014's bounded Chess.com account-import adapter is implemented, validated, accepted through the merged runtime pull request, integrated into `main`, and has now passed the outstanding real low-volume provider canary. This reconciliation records the final runtime and canary evidence, moves the canonical task from `REVIEW` to `DONE`, and synchronizes execution-state records without changing provider runtime behavior.

The temporary CI hook used to execute the canary was removed before the final completion branch was rebuilt. The intended completion diff contains no provider traversal, API route, Angular behavior, Prisma schema/migration, lifecycle-operation persistence, dependency, broker, deployment, or permanent workflow change.

## Delivered scope verified on `main`

- deterministic half-open UTC calendar-month planning with exact epoch-second clipping;
- newest-first initial/backfill traversal and oldest-first forward traversal;
- one successful archive-index traversal as authority for listed versus absent months;
- strictly serial monthly provider requests with `AbortSignal`, bounded retry/backoff, recognizable User-Agent, and durable HTTP 429 retry timing;
- bounded `ETag` / `Last-Modified` validator metadata without allowing a `304` response to become independent coverage authority;
- one authoritative Chess.com normalization path reused by durable and transitional synchronous flows;
- exact immutable range, standard-variant, speed, and rated-scope filtering;
- duplicate-safe 100-game-or-smaller provider-neutral guarded batch commits with exact counters;
- one guarded provider commit seam for plan initialization, batch persistence, and atomic window checkpoint/coverage advancement;
- exact successful absent/empty-month coverage and conservative replay of failed, partial, malformed, cancelled, stale-claim, or lifecycle-fenced months;
- progressive committed-row visibility and Activity Feed reconciliation before window coverage proof;
- worker registration in the existing account-import worker with no second queue, deployment, schema, or migration.

## Review history

The runtime implementation and its adversarial self-review are preserved in the ONB-014 implementation report and self-review addendum. Two material runtime gaps were corrected before merge:

1. provider plan denominator/restart progress had used a generic claim-fenced checkpoint path outside the provider lifecycle-admission seam; `initializePlan` was moved into the same provider-neutral guarded commit repository used by batch/window progress, with stale-work-key and lifecycle-fence PostgreSQL coverage;
2. explicit December-to-January planner coverage was missing; a year-boundary and inclusive-lower-epoch-second regression was added.

The completion reconciliation then received a separate adversarial self-review. That review found two material execution-state defects in the first draft:

1. it treated ONB-015 and ONB-018 as a mutual promotion blocker and therefore claimed that no onboarding implementation task was `READY`. Re-reading the accepted ONB-003 allocation, ONB-017 completion contract, ONB-018 planning-maturity gate, ONB-015 handoff contract, roadmap critical path, and issues #203/#254 showed that this was too conservative. ONB-018's bounded reconciler implementation was blocked on ONB-017 plus durable import/provider delivery; those gates are now complete. ONB-015 consumes ONB-018 for its final account-sync/preparation handoff. ONB-018 / #254 is therefore promoted to unclaimed `READY` while ONB-015 / #203 remains `PROPOSED`;
2. after broadening the queue check, it also found ONB-019 / #259 stale at `PROPOSED`. ONB-019's planning gate was ONB-004 acceptance plus schema-collision coordination. ONB-004 and ONB-005 are complete; ONB-017's claim explicitly established migration order with ONB-019 following; ONB-011 later recorded the destructive-lifecycle schema ownership split directly on #259; both overlapping schema owners are merged; and the self-review found no ONB-019 branch or open PR. ONB-019 is therefore promoted to unclaimed `READY` on the parallel lifecycle path, while a fresh current Prisma/migration collision check remains mandatory before claim.

The review also rechecked archive availability semantics, malformed payload handling, exact scope/range boundaries, serial access, cancellation, retry/429 behavior, validators/304 handling, duplicate replay, 100-row transaction bounds, atomic coverage progression, Activity Feed ordering, shared normalization, worker registration, completion protocol, live issue state, current PR/branch collisions, and the locked program decisions. No further material runtime defect was found.

## Validation evidence

- reviewed runtime head `5e530a2a2b001ae0ee2ce42872b45c9b8f86a085` passed GitHub Actions CI #2666 after the self-review runtime corrections;
- final runtime PR head `d4592fe6b0e3c61ee9d25bc1517a8fc83a7466c2` passed CI #2669, including lint, build, architecture/hygiene, migrations, audits, and full repository tests;
- PR #356 squash-merged into `main` as `b9c2038bfd20f7b0a493c2eda3dd6c2aed911ec5` on 2026-08-12;
- the outstanding real provider canary passed the dedicated `ONB-014 low-volume Chess.com canary` step in CI workflow run #2812 (`31881053242`) on 2026-08-15;
- the canary used public account `hikaru` and fixed historical month `2014-01`, exercising the committed archive-index/month provider harness with one bounded month and no load-test behavior; the observed result was 152 parseable archive links and 44 games in the selected historical month;
- exact boundary, validator/cache, cancellation, retry/429, malformed-response, replay, lifecycle-fence, and bounded-write behavior remain covered by the focused provider/executor/PostgreSQL tests already accepted in runtime PR #356; the real canary is complementary provider-integration evidence, not a substitute for those deterministic tests;
- the temporary canary workflow step was removed before the final completion branch was rebuilt and is not present in the final intended diff;
- the first clean docs-only completion head `84572244fa4fa1a48bf17df8a5fb6ed9925b374f` passed normal repository CI #2821 (`31881572380`), including lint, build, generated/imported-game opening audits, architecture/hygiene, migrations, full tests, artifacts, and cleanup;
- all self-review queue corrections require a fresh exact-head normal repository CI after the final one-commit branch rebuild before merge.

## Dependency and queue reconciliation

ONB-007, ONB-011, ONB-012, ONB-013, ONB-014, and ONB-017 are complete. Both durable provider adapters and the preparation execution boundary are therefore accepted.

ONB-018 / #254 is promoted to unclaimed `READY`. ONB-003 explicitly allocated ONB-018 after the ONB-017 persistence/admission boundary; the ONB-018 task's planning-maturity gate names ONB-017 and durable import delivery as its blockers. ONB-011/012 provide the durable import lifecycle, ONB-013/014 provide the provider adapters, and all are complete. ONB-015's preparation-handoff dependency remains a final end-to-end coordination point, not a hard blocker to implementing the bounded reconciler itself.

ONB-015 / #203 remains `PROPOSED`. Its account-sync cutover and preparation handoff explicitly consume ONB-018 / #254, so promoting ONB-015 before ONB-018 would invert the accepted orchestration boundary.

ONB-019 / #259 is also promoted to unclaimed `READY` on the parallel destructive-lifecycle support path. Its accepted ONB-004 lifecycle design and ONB-005 actor/audit policy are complete, and the historical ONB-011/017 schema collision is now an ownership/claim-time coordination concern rather than an unresolved dependency. ONB-020/021 remain `PROPOSED` behind ONB-019 and their additional gates; ONB-026 remains `PROPOSED` because it consumes ONB-019 conventions plus its own PostgreSQL/version/coordination gates.

ONB-018 remains the deterministic next task by canonical order. ONB-019 may proceed in parallel only after the normal fresh collision/claim protocol.

## Canonical-document reassessment

- `TASKS.md` records ONB-013 and ONB-014 `DONE`, promotes ONB-018 as the deterministic next unclaimed `READY` task, promotes ONB-019 as parallel unclaimed `READY`, and keeps ONB-015/020/021 dependency-blocked `PROPOSED`;
- the ONB-014 task file records the final runtime head/CI/squash commit, real provider canary, completion branch/report, and `DONE` state while preserving the accepted scope and acceptance criteria;
- the ONB-018 task file now distinguishes its satisfied hard readiness gates from ONB-015 end-to-end handoff coordination and records its unclaimed `READY` promotion;
- the ONB-019 task file now records the resolved schema ownership/migration-order gate and its unclaimed `READY` promotion while preserving a mandatory fresh collision check before claim;
- `STATUS.md` records the delivered Chess.com adapter, ONB-018 as deterministic next, and ONB-019 as parallel ready lifecycle work;
- `OPEN_QUESTIONS.md` records the merged ONB-014 implementation/canary evidence and removes stale ONB-014-owned questions now resolved by the accepted runtime;
- `GITHUB_ISSUES.md` records ONB-013/014 completion plus conditional readiness for ONB-018 and ONB-019;
- `ROADMAP.md` was re-read rather than changed: its critical path already places ONB-015 and ONB-018 as sibling work after provider delivery, and its Phase 8 schema-collision note remains a valid pre-claim guard for ONB-019 even though the historical ownership/migration-order dependency is now resolved;
- `DECISIONS.md` was re-read: the locked provider-window, bounded-write, exact-coverage, preparation, lifecycle-fence/audit, worker, and progress decisions already match the delivered implementation and corrected queue state, so no decision change is required;
- issue #202 remains open until this completion reconciliation merges, consistent with the repository `DONE`/issue-closure protocol;
- issues #254 and #259 remain open and unclaimed; readiness promotion does not claim either task.

## Residual risks and handoff

- ONB-015 still owns removal of synchronous provider traversal from account HTTP routes, Angular/background status cutover, rating/activity reconciliation, and the final account-sync/preparation handoff;
- ONB-018 must coordinate that handoff but can implement its bounded PostgreSQL reconciler, import-evidence observation, child admission, first-analysis lane, control acknowledgement, restart behavior, and queue bounds against the already-delivered durable import/preparation foundations;
- ONB-019 can now implement the persisted destructive lifecycle operation/fence/audit/provenance foundation, but must perform a fresh current Prisma/migration collision review immediately before claim and must not duplicate import/preparation state machines;
- ONB-020/021 remain blocked on the lifecycle foundation and their own execution gates, and ONB-026 remains blocked on ONB-019 conventions plus its own cleanup-specific gates;
- the real canary is intentionally low-volume and does not establish production throughput, provider capacity, SLA, or ETA;
- current transitional synchronous account sync remains until ONB-015 lands.

## Completion condition

After PR #383 is approved and squash-merged, ONB-014 is canonically `DONE` and issue #202 may close as completed. ONB-018 / #254 is then the deterministic next unclaimed `READY` onboarding implementation task by order, with ONB-019 / #259 also unclaimed `READY` on the parallel lifecycle path. The temporary canary workflow hook is excluded from the final intended diff.
