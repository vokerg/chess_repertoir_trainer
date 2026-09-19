# ONB-014 self-review addendum — bounded Chess.com import adapter

Date: 2026-08-12

Task: ONB-014 / #202

Runtime pull request: #356

Branch: `account-import/onb-014-chess-com-adapter`

## Review result

One adversarial self-review round was completed against the live PR diff and current `main`. Two actionable gaps were found and fixed before merge readiness.

### 1. Provider plan progress bypassed the lifecycle admission seam

The initial implementation repaired `windowsTotal` / `windowsCompleted` through the generic worker `context.checkpoint` callback before provider traversal. That callback is exact-work-key fenced, but the current provider-neutral lifecycle checkpoint repository does not execute `AccountImportAdmissionGuard.assertAllowed`.

That created a second provider progress-write path outside ONB-014's intended single guarded commit seam.

Correction:

- added `initializePlan` to `AccountImportProviderCommitRepository`;
- plan denominator and restart-derived completed-window repair now run in a short transaction that locks the exact run/account, checks the work key and RUNNING state, invokes the existing admission guard, and then updates progress;
- the Chess.com executor no longer uses the generic lifecycle checkpoint callback for provider plan progress;
- added PostgreSQL coverage proving a lifecycle fence rolls the plan update back and a stale work key is rejected;
- updated executor fixtures to assert that all Chess.com provider progress writes use the guarded provider commit repository.

No provider network work is executed inside that transaction or guard.

### 2. Required year-boundary planner coverage was missing

The existing planner fixture proved partial-month clipping and ordering, but it did not cross December into January despite the task's explicit year-boundary validation requirement.

Correction:

- added a focused `2025-12 -> 2026-01 -> 2026-02` planning regression;
- asserted exact clipped half-open boundaries;
- asserted the lower epoch-second boundary is inclusive.

No runtime planner change was required.

## Additional review areas

The round also rechecked:

- listed versus absent archive semantics;
- malformed archive-index/month failure behavior;
- exact standard/speed/rated/range filtering;
- serial provider requests and cancellation;
- bounded retry/backoff and durable 429 deferral;
- ETag / Last-Modified validator use without treating 304 as independent coverage proof;
- duplicate-safe replay and <=100-row transactions;
- atomic batch counters and atomic window checkpoint + coverage advancement;
- stale claim and lifecycle-fence rollback;
- Activity Feed reconciliation ordering relative to coverage proof;
- shared normalization compatibility with the transitional synchronous Chess.com service;
- worker registration and absence of schema, migration, queue, deployment, Angular, or Lichess scope creep.

No additional material defect was found.

## Validation

Exact runtime head `5e530a2a2b001ae0ee2ce42872b45c9b8f86a085` passed GitHub Actions CI #2666. The job completed lint, build, architecture and repository-hygiene guardrails, database migrations, opening/imported-game audits, and the complete repository test step successfully.

The low-volume real Chess.com canary remains unexecuted from the current shell because provider-host DNS/network access is unavailable there. The opt-in canary harness remains committed. This is retained as a pre-general-release / task-completion validation gate rather than being represented as completed evidence.

## Merge recommendation

The runtime change is suitable for squash merge after the final documentation head also passes exact-head CI. Keep ONB-014 / #202 open in `REVIEW` until the real low-volume canary and completion reconciliation are recorded; do not mark the task `DONE` solely from the runtime merge.
