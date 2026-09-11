# ONB-026 orphan shared-position cleanup review report

Date: 2026-09-11
Status: `REVIEW`
Pull request: [#412](https://github.com/vokerg/chess_repertoir_trainer/pull/412)
Branch: `onb-026/issue-280-orphan-position-cleanup`
Base refreshed from: `origin/main` at `7bc7a77874df2fc208313d18766b8ca51bb21f35`

## Review outcome

The implementation and review fixes are ready for maintainer review. The delivered scope remains manual-first, disabled-by-default, PostgreSQL-only shared-position cleanup. It does not add recurring scheduling, course-tree deletion, account/user deletion, or an administrator mutation route.

The review fixes addressed:

- `ImportedGamePly` update triggers now use `OLD TABLE` and `NEW TABLE` transition relations and reset only when the `positionId` reference changes; unrelated ply-field updates no longer reset a candidate.
- Durable `orphansFirstObserved` and `orphansRefreshed` run counters now distinguish new observations from refreshed candidates, and the first observation timestamp is preserved across bounded transactions.
- A cancellation request that wins a lock-timeout/error race is settled as `CANCELLED` before lock-timeout retry handling.
- The manual command exposes an injectable canonical-service/worker orchestration runner, so flag, confirmation, output, and terminal-failure tests do not accidentally scan the shared production-sized database.
- Live shared-database fixtures scope their traversal bounds to their own positions before testing lifecycle or lock interleavings.

## Live database evidence

The target database reported PostgreSQL `server_version_num=170011`. The migration `20260903080000_position_cleanup_foundation` was applied successfully, and `npx prisma migrate status --schema prisma/schema.prisma` subsequently reported the database schema up to date. The live database hygiene check after testing reported zero `PositionCleanupRun` and zero `PositionCleanupCandidate` rows; diagnostic rows were removed.

The bounded benchmark passed with 10, 500, and 5,000 input-row profiles. The latest run observed transaction p90 `325.32ms` and uncontended canonical lock p90 `157.52ms`, below the accepted `1000ms` and `250ms` limits. The query-plan assertion confirmed a pre-filter `Limit` node.

The focused PostgreSQL suite passed all ten position-cleanup tests: bounded performance, command orchestration, config/service, execute lock timeout, integration/triggers, lifecycle recovery, observation/reference race, predicate/grace, reindex interleavings, and worker cancellation race.

## Validation record

Passed:

- `npm run build` (domain, contracts, API, web, and mobile; elevated rerun was required for Angular process spawning).
- `npm run build:api`.
- `npm run lint` (API, web, and mobile).
- `npm run check:architecture`.
- `npm run check:hygiene`.
- `npx prisma format --schema apps/api/prisma/schema.prisma`.
- `npx prisma validate --schema prisma/schema.prisma` from `apps/api`.
- `npx prisma migrate deploy --schema prisma/schema.prisma` and migration-status verification.
- The focused position-cleanup test suite listed above.
- `git diff --check` (only the repository's existing LF-to-CRLF warnings were emitted for touched files).

Not complete or not run:

- `npm test --workspace=apps/api` reached the full test runner but stopped in the unrelated `account-import.claim-admission.test.mjs` fixture because the shared database contains pre-existing queued import state; the same test also failed when run alone with no claim. This is not an ONB-026 assertion or schema dependency.
- Root `npm test` was not rerun after that API-gate failure because it includes the same failing API workspace gate.
- A complete production-scale manual cleanup sweep was intentionally not run. The shared database contains approximately 1.07 million positions; a diagnostic dry-run confirmed bounded progress, but was stopped before a multi-minute full traversal. The command contract is covered by the injectable command test, and SQL/lifecycle behavior is covered by the live focused suite.
- A migration rollback was not executed against the shared database; rollback assessment remains a maintainer/deployment decision.

The standard command remains disabled unless `POSITION_CLEANUP_ENABLED=true` is explicitly provided, and no destructive execute cleanup was run by this review.
