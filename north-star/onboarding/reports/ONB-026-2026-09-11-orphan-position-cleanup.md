# ONB-026 orphan shared-position cleanup review report

Date: 2026-09-12
Status: `REVIEW`
Pull request: [#412](https://github.com/vokerg/chess_repertoir_trainer/pull/412)
Branch: `onb-026/issue-280-orphan-position-cleanup`
Base: `origin/main` at `956ddf05f63c71af7783ea133ac67044f6c78b87`

## Review outcome

The implementation and takeover-review fixes are ready for exact-head validation and maintainer review. The delivered scope remains manual-first, disabled-by-default, PostgreSQL-only shared-position cleanup. It does not add recurring scheduling, course-tree deletion, account/user deletion, or an administrator mutation route.

The takeover review addressed:

- Lock-timeout and generic-failure settlement are atomic with cancellation state. If cancellation committed before terminal settlement, the run becomes `CANCELLED` rather than incorrectly becoming `NEEDS_ATTENTION` or `FAILED`.
- The `ImportedGamePly` UPDATE trigger now uses OLD/NEW transition relations. A changed/new position reference always takes the database-owned observer fence; a retained reference takes cleanup fence/reset work only when a stale candidate exists. Ordinary score/classification/move-only updates with no candidate therefore acquire no cleanup advisory locks.
- A focused PostgreSQL regression holds the ONB-026 advisory lock and proves the normal unchanged-reference update bypasses that fence, while a stale-candidate update still uses it and rolls back safely on lock timeout.
- Durable counters are phase-exact: reconciliation records `reconcileCandidatesInspected` / `candidatesReconciled`, observation records `positionsInspected` / `orphansMatched`, and evaluation records `candidatesInspected` / `candidatesMatched`. Detailed first-observed/refreshed, dry-run eligible, delete, and dependent-row counters remain available.
- Execute batches keep destructive table-lock traffic on one lazy dedicated `PrismaClient` per worker, reused across pages and explicitly closed at worker/command shutdown. Injected-repository tests keep using their injected boundary. This preserves isolation without per-delete-page client construction/disconnect churn.
- The command exposes an injectable entrypoint that owns argv parsing and failure exit-code mapping. Tests cover default dry-run parsing, explicit apply/typed confirmation, terminal failure => exit code 1, and invalid execute invocation => exit code 1.
- The already-applied foundation migration `20260903080000_position_cleanup_foundation` was restored unchanged. Review corrections are delivered in the forward migration `20260912050000_position_cleanup_review_fixes` rather than rewriting applied migration history.

## Migration and database evidence

The previously inspected shared target reported PostgreSQL `server_version_num=170011`, and the foundation migration was applied there during the original implementation validation. That foundation migration is now preserved byte-for-byte on the branch.

The takeover review added `20260912050000_position_cleanup_review_fixes`. It has **not** been manually applied to the shared target as part of this review. Migration application on a clean PostgreSQL instance is covered by the pull request CI gate. This report intentionally does not claim that the shared target is already at the new review migration.

No destructive execute cleanup was run against the shared target during the takeover review.

## Performance evidence

The existing bounded benchmark covers 10, 500, and 5,000 input-row profiles, asserts a pre-filter `Limit` node, and enforces the accepted transaction and lock budgets. The last recorded branch benchmark before the takeover corrections observed transaction p90 `314.97ms`, uncontended canonical lock p90 `144.80ms`, and canonical lock-wait p90 `248.44ms`, below the accepted `1000ms` / `250ms` limits.

The takeover change specifically removes cleanup advisory-lock fan-out from normal retained-reference ply updates and adds a lock-contention regression for that behavior. The standard API test runner discovers all position-cleanup `*.test.mjs` files, including the benchmark and the new regression.

## Validation record

The pull request's exact-head CI checks are the authoritative release gate rather than a copied run id in this append-only report. The CI workflow covers dependency setup, lint, build, architecture/hygiene guardrails, migration application, and the full API test runner.

The position-cleanup suite currently contains 18 focused test files covering:

- bounded performance and query-plan limits;
- migration/schema contracts;
- configuration/service policy;
- insert/update trigger behavior and rollback;
- unchanged-update advisory-fence filtering;
- observation/reference races and transient re-reference grace reset;
- reconciliation;
- predicate/grace equivalence;
- execute cascade behavior;
- dependent-writer, reindex, and cascade-writer interleavings;
- lock timeout plus lock-timeout/cancellation and generic-failure/cancellation precedence;
- cancellation between batches;
- stale recovery/replay;
- worker shutdown;
- command orchestration, argv parsing, typed confirmation, and exit mapping.

Still intentionally not performed:

- A complete production-scale manual cleanup sweep. The shared database previously measured approximately 1.07 million positions, and no need was identified to run destructive or multi-minute maintenance merely to validate the implementation.
- A destructive execute cleanup against the shared target.
- A manual application of the new review migration to the shared target.
- Migration rollback against the shared target; rollback remains a maintainer/deployment decision.

The command remains disabled unless `POSITION_CLEANUP_ENABLED=true` is explicitly provided.
