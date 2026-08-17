# ONB-019 third self-review addendum

Date: 2026-08-17

Issue: #259

Pull request: #386

Branch: `onb-019/issue-259-destructive-lifecycle-foundation`

## Review objective

This pass re-reviewed the destructive-lifecycle foundation as a concurrency and database-integrity boundary rather than assuming earlier green CI implied completeness. The review traced durable admission from application repositories through PostgreSQL triggers, retried/recovery states, indirect ownership lookups, HMAC rotation, and FK cascades.

## Findings and corrections

### Indirect lifecycle scope could become stale before commit

Child/preparation/scenario writers that derive ownership through a parent could read that parent before acquiring the lifecycle user lock. A concurrent ownership transition could therefore invalidate the snapshot before the child committed.

The final design uses **read → lifecycle advisory lock → re-read**. Parent-row `FOR SHARE` stabilization was considered and removed during review because it can invert lock ordering against parent FK cascades. If the post-lock ownership snapshot differs, the writer fails with `DATA_LIFECYCLE_OWNERSHIP_CHANGED` and its short transaction can retry.

### Redundant ownership identifiers needed database consistency checks

Rows that persist both `userId` and game/account references could otherwise be constructed with contradictory ownership by direct writers. Database helpers now reject inconsistent user/account/game combinations so fence scope cannot be selected from a forged redundant identifier.

### Bound destructive operations were not sufficient authorization by themselves

A transaction-local lifecycle operation id must not exempt every write for the target user. The database guard now requires an active fence owned by the bound operation that contains the exact write scope. Writes outside that scope fail with `DATA_LIFECYCLE_SCOPE_VIOLATION`.

### Old/new scope transitions must both be fenced

Update triggers now guard the previous and destination scope so reparenting cannot move a record out of, or into, a fenced USER/ACCOUNT/GAME hierarchy without participating in lifecycle serialization.

### Whole-user admission had non-FK gaps

`AppUser` INSERT now participates in the USER lifecycle guard so direct recreation of a fenced numeric target is blocked. `OAuthLoginState`, which is not owned through an `AppUser` foreign key, has an explicit USER-scope write guard so a concurrent auth-state write cannot survive whole-user cleanup merely because no FK cascade reaches it.

### Tactical/scenario admission needed broader coverage

`TacticalDetectionRun` creation is guarded at admission while already-admitted runs may still settle during drain. Scenario sessions resolve scope through the direct imported-game snapshot and tactical-detection reference, reject inconsistent dual references, and scenario attempts inherit the resolved session scope.

### Scenario FK cascades exposed trigger-order bugs

The adversarial retained-scenario regression first exposed a real AppUser deletion failure. PostgreSQL can delete the referenced `ImportedGame` before a `ScenarioTrainingSession` DELETE trigger executes. Strictly re-resolving the old game then raised `DATA_LIFECYCLE_SCOPE_MISMATCH` and blocked the legitimate FK cascade.

After that DELETE case was fixed, the full existing suite exposed the adjacent retained-snapshot behavior: `ScenarioTrainingSession.importedGameId` and `tacticalDetectionId` use `ON DELETE SET NULL`. PostgreSQL can therefore invoke the session UPDATE trigger after the referenced parent is already gone, with OLD still containing the now-deleted id. Strict OLD-scope resolution failed in the same way and broke the existing scenario-training contract that a session survives game deletion with `importedGameId = NULL`.

The final trigger keeps ordinary INSERT/UPDATE/direct DELETE strict. It permits only the FK-internal shapes that can observe a missing OLD parent: a cascade child DELETE, or an UPDATE that changes exactly one lifecycle parent reference from its old id to `NULL` while the user and other lifecycle reference remain unchanged and that old parent is already absent. Immediate foreign keys prevent such a dangling OLD reference outside the parent deletion statement, whose parent mutation has already crossed its lifecycle guard. ONB-019 now owns explicit regression coverage for both retained-session `SET NULL` behavior and later whole-user cascade deletion.

### HMAC rotation configuration could select the wrong signing key

Previous HMAC keys are now verification-only: they require an explicitly configured current key and every previous version must be lower than the current version. Deleted-identity provisioning also fails closed when persisted tombstones use a historical key version that is no longer configured.

### Retention received an additional fence invariant

Generic terminal-operation cleanup refuses to delete an operation that still owns an active lifecycle fence, in addition to preserving tombstone-linked operations.

## Regression coverage added or strengthened

The third pass adds/extends PostgreSQL coverage for:

- indirect scope revalidation under a real concurrent lifecycle/user-lock race;
- ownership mismatch rejection;
- old/new scope-transition guards;
- bound destructive-operation scope containment;
- AppUser/OAuth USER-fence admission;
- HMAC key rotation and missing historical versions;
- tactical-run admission;
- retained scenario behavior when tactical derivations are removed;
- ImportedGame/TacticalDetection FK `SET NULL` behavior for retained scenario snapshots;
- whole-user FK cascade through a retained scenario snapshot.

## Final validation

Exact reviewed head `da8e41a0dec2f1280bdc841539a0ba067f36c365` passed GitHub Actions CI run #2986 (`32016829189`) end-to-end. The run passed dependency audit, lint, build, opening audits, architecture and repository-hygiene guardrails, the complete migration chain from an empty PostgreSQL database, and the full repository test suite including the strengthened lifecycle cascade regressions and the existing scenario-training response contract that originally exposed the `SET NULL` edge case.

## Review conclusion

No destructive executor or public lifecycle API is introduced by these corrections. They strengthen the ONB-019 persistence/admission boundary that downstream ONB work will rely on.

The exact reviewed head is green. PR #386 remains intentionally open/unmerged pending normal review/merge action.
