# ONB-019 self-review addendum — hierarchical fencing and recoverability

Date: 2026-08-16

Issue: #259

Pull request: #386

Parent implementation report: `ONB-019-2026-08-16-destructive-lifecycle-foundation.md`

## Findings corrected during PR self-review

### Hierarchical write admission

The first implementation treated a normal writer's scope too narrowly: an account-scoped writer checked USER and ACCOUNT fences but not a GAME fence owned by that account, and a user-scoped writer did not treat descendant ACCOUNT/GAME fences as overlapping.

That was unsafe for admission even though row-level game triggers would eventually reject some commits. The shared application guard and PostgreSQL guard now use hierarchical overlap semantics:

- USER writer: conflicts with every active fence owned by the user;
- ACCOUNT writer: conflicts with USER, the exact ACCOUNT fence, and any GAME fence under the account;
- GAME writer: conflicts with USER, its parent ACCOUNT, and the exact GAME fence.

Focused tests cover account-import, preparation, external-account, AppUser/auth, JobTask, and cross-resource destructive-operation admission while a child GAME fence exists.

### PostgreSQL advisory-lock parameter typing

GitHub Actions CI #2867 reached the test phase after lint, build, audits, architecture/hygiene checks, and migrations passed, then exposed a PostgreSQL type-resolution error in the new application-level advisory lock:

`function pg_advisory_xact_lock(bigint, bigint) does not exist`

Prisma bound JavaScript numeric parameters as bigint, while the two-key PostgreSQL advisory-lock overload expects two integers. Both lifecycle lock namespaces now cast each parameter explicitly to `integer`:

- user-scope lifecycle lock `17000259`;
- deleted-identity lock `17000260`.

The database migration functions use SQL integer arguments/literals and were not affected.

### NEEDS_ATTENTION resumability

The accepted ONB-004 second self-review addendum requires a partially applied lifecycle operation to stay fenced until it resumes and verifies completion or an explicit administrator repair/close procedure proves safety.

The initial repository retained the fence/checkpoint when a post-mutation failure entered `NEEDS_ATTENTION`, but normal workers intentionally do not claim `NEEDS_ATTENTION`. Without an explicit recovery transition the state was durable but not resumable.

`resumeDataLifecycleNeedsAttention` now provides the internal recovery primitive. It:

- takes the same user-scoped transactional lifecycle lock;
- accepts only an unclaimed `NEEDS_ATTENTION` operation that has first-destructive-commit evidence;
- refuses recovery if the durable fence is missing;
- preserves the checkpoint, first destructive commit timestamp, and live fence;
- clears only stale stop/error/terminal markers;
- moves the operation to `WAITING_FOR_DRAIN`, which is claimable by the normal lifecycle worker path.

This is deliberately not a public endpoint and does not implement administrator authorization/policy. A resumed operation remains forward-only; another post-mutation failure returns it to `NEEDS_ATTENTION` with the fence and checkpoint intact.

## Validation additions

The database integration suite now covers:

- hierarchical parent/child write admission;
- USER/ACCOUNT/GAME destructive conflict behavior;
- database rejection of `CANCELLED` after first destructive commit;
- expired-preview execute rejection;
- stale-claim recovery with durable fence retention;
- explicit `NEEDS_ATTENTION` resume to `WAITING_FOR_DRAIN` with checkpoint/fence/first-commit preservation;
- repeated post-mutation failure returning to fenced `NEEDS_ATTENTION`.

Exact-head GitHub Actions remains the authoritative executable validation because the execution environment cannot clone GitHub (`Could not resolve host: github.com`).
