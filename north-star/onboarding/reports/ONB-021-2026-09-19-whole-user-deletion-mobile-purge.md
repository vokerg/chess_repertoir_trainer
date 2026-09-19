# ONB-021 whole-user deletion and mobile purge handoff — 2026-09-19

## Outcome

PR #426 implements durable self-service whole-application-user deletion over the ONB-019/020 lifecycle foundation and adds the mobile next-contact purge handshake.

The server path previews and executes `DELETE_APP_USER`, establishes a USER fence, cancels and drains user-wide durable work, reuses the bounded ONB-020 account/game purge, deletes residual user-owned data in bounded phases, creates a deleted-identity tombstone atomically with final AppUser removal, and verifies completion before releasing the fence. The deletion receipt remains usable after AppUser removal without ordinary auth provisioning.

Mobile treats the typed lifecycle deletion responses as local purge commands. Before completing sign-out it deletes the `local_user` root in an exclusive SQLite transaction; the existing foreign-key cascade graph removes downloaded content, local training state, marathon state, completed attempts, and pending attempt outbox rows. Other devices are rejected by the USER fence/tombstone at the API auth boundary before mobile sync handlers can upload stale data, and purge on their next authenticated contact.

Administrator whole-user deletion and Angular account-management UI remain out of scope. Existing Angular and administrator lifecycle controls remain typed to account/game actions.

## Server lifecycle

The implementation adds dedicated whole-user lifecycle routes/services and a persistent worker lane. Preview produces the canonical bounded impact counts and confirmation token. Execute is idempotent by operation/idempotency key and issues an opaque receipt before destructive completion.

The worker advances through fencing, drain, bounded execution, final identity deletion, and verification. Import, preparation, and job work is cancellation-targeted and must quiesce before destructive phases proceed. Legacy synchronous import state is treated as a pre-mutation blocker instead of being raced.

Destructive execution is checkpointed after every bounded account/game or residual phase. Failures before the first destructive commit settle as `FAILED_BEFORE_MUTATION` and release the USER fence; failures after the first destructive commit settle as `NEEDS_ATTENTION`, retain the fence/checkpoint, and resume through the same operation/receipt.

Final AppUser deletion no longer relies on foreign-key cascades as an implicit catch-all. Immediately before the final transaction, the worker verifies that every enumerated user-owned relation is already empty. A schema-level regression test locks the current direct AppUser ownership map and requires every direct relation to use `onDelete: Cascade` and to participate in the pre-/post-delete verification counts. FK-less `OAuthLoginState` is checked explicitly.

The final transaction creates the identity tombstone under the identity-first lock order, binds the lifecycle operation, deletes any remaining OAuth login state defensively, and removes the AppUser. Post-delete verification re-counts the AppUser and every user-owned relation before verified completion can release the fence.

## Auth and identity behavior

Normal authenticated resolution remains the authoritative provisioning path but now refuses both active USER fences and deleted-identity tombstones. It cannot update or recreate the user while deletion is in progress or after deletion.

Only the exact deletion execute retry/status path uses the special read-only identity resolution needed to find the retained lifecycle operation after the AppUser row is gone. It does not perform ordinary AppUser upsert.

Typed auth responses distinguish:
- deletion in progress: HTTP 423 with `DATA_LIFECYCLE_DELETION_IN_PROGRESS`;
- deleted identity: HTTP 410 with `DATA_LIFECYCLE_IDENTITY_DELETED`.

Both carry the mobile purge signal. Mobile session, manifest, course-bundle, and training-attempt OpenAPI responses now expose the same 410/423 deletion contract.

Lichess upstream revocation is best-effort and audit-visible; the local encrypted connection row is still deleted as a mandatory user-owned phase.

## Retained shared data

Whole-user deletion deliberately retains data that is not user-owned:
- shared `Position` rows;
- `PositionAnalysis`;
- `MastersExplorerCache`;
- global game-tag definitions;
- the global Lichess puzzle corpus;
- lifecycle audit evidence;
- the deleted-identity tombstone and retained lifecycle operation required for status/receipt lookup.

The integration fixture now creates shared position/analysis/cache and puzzle/tag data referenced by the deleting user and asserts that user references disappear while the shared corpus remains.

## Mobile purge boundary

The mobile database enables SQLite foreign keys and roots offline state under `local_user`. The ONB-021 regression covers the direct cascade roots and the nested training-session -> attempt -> outbox cascade chain. The runtime purge deletes only the authenticated local-user root inside one exclusive transaction, then signs out.

Mobile API callers centralize deletion-signal handling. Foreground/session probes detect deletion before activating local state; manifest/course/outbox sync paths also route 410/423 deletion responses through the same purge handler. The server auth guard runs before mobile-sync route handlers, so stale outbox submissions cannot be accepted after the USER fence or tombstone becomes authoritative.

## Self-review corrections made while finishing PR #426

The final review found and corrected several gaps in the draft implementation:

1. post-delete verification omitted `ImportRun`;
2. the initial ImportRun verification patch had a shifted Promise result list and was corrected before handoff;
3. final AppUser deletion could have relied on an accidentally missed FK cascade, hiding an unbounded residual deletion; a pre-delete ownership-empty gate now prevents that;
4. mobile manifest/course/attempt OpenAPI schemas did not advertise the same 410/423 deletion contract already used by the session probe;
5. the mobile deletion-signal test still used the earlier 409 draft status instead of the implemented 423 Locked status;
6. required shared-data retention was not exercised by the whole-user integration fixture;
7. restart/bounded-batch and pre-/post-mutation failure-boundary coverage was missing;
8. there was no schema-level guard requiring future direct AppUser relations to be added to whole-user verification.

The branch was also reconciled with current `main` (including PR #427's synchronous administrator account-purge changes). The only overlapping documentation was reconciled to retain both the current admin-purge description and ONB-021 semantics.

## Validation coverage in the branch

Focused tests now cover:
- happy-path whole-user deletion, duplicate execute/receipt idempotency, auth fence rejection, tombstone recreation rejection, post-delete receipt retry, OAuth/provider cleanup, and retained shared data;
- cancellation before mutation as a no-op;
- worker recreation between steps, bounded residual batches, post-mutation failure -> `NEEDS_ATTENTION` with retained fence, same-receipt resume, and pre-mutation legacy-drain failure -> `FAILED_BEFORE_MUTATION` with released fence;
- schema-level completeness of the direct AppUser ownership map and FK-less OAuth verification;
- mobile typed deletion signals, offline ownership/cascade graph, and exclusive local-user-root deletion.

Adjacent ONB-019/020 coverage continues to exercise the guarded writer/fence concurrency matrix, bound-scope authorization, account/game purge behavior, cancellation/drain infrastructure, and failure-state semantics reused by ONB-021.

## Validation status

Exact-head CI must still validate the final branch. The last CI result visible for this PR is an older successful run from 2026-09-13 and is not evidence for the 2026-09-19 head. GitHub did not schedule runs for the connector-authored draft commits while the PR remained a draft.

A local checkout could not be used as a substitute because the execution environment failed to resolve `github.com` when cloning the repository. The review handoff therefore depends on a new pull-request CI run for the exact final head.

## Residual ownership

- ONB-024 owns administrator whole-user mutation exposure if policy later authorizes it.
- ONB-026 owns shared Position cleanup.
- A future product/UI task may expose user deletion in Angular; ONB-021 does not add that UI.
