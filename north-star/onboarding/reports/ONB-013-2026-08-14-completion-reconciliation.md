# ONB-013 completion reconciliation

Date: 2026-08-14

Issue: #201

Runtime pull request: #357

Final runtime pull-request head: `2f53e81fba2386c1c2b3638c24a1450184497f78`

Runtime squash commit: `e276e3820acbd8361feae99d8a0e15a9cf412e53`

Completion reconciliation pull request: #376

## Decision

ONB-013's bounded Lichess account-import adapter is implemented, validated, accepted through the merged runtime pull request, and integrated into `main`. This reconciliation records the final runtime and canary evidence, moves the canonical task from `REVIEW` to `DONE`, and synchronizes the queue/status records without changing runtime behavior.

This reconciliation is documentation/execution-state only. It adds no provider traversal, account-import runtime behavior, API route, Angular behavior, Prisma schema/migration, lifecycle-operation persistence, dependency, workflow, broker, deployment, or generic job abstraction change.

## Delivered scope verified on `main`

- deterministic configurable half-open Lichess provider windows, initially 14 days;
- exact canonical scope to `perfType` / rated-provider request mapping;
- serial streaming NDJSON traversal with `AbortSignal` and explicit cancellation of failed streams;
- shared normalization reused by durable and compatibility sync paths;
- duplicate-safe bounded persistence in 100-game-or-smaller commits, with the previous per-game existence-query N+1 removed;
- one provider-neutral guarded atomic commit seam shared with Chess.com for games, counters, checkpoints, and successful-window coverage advancement;
- progressive committed-row visibility plus Activity Feed reconciliation after durable commits;
- exact empty-window coverage and conservative incomplete-window replay;
- persisted window-plan validation across restart/config changes;
- typed provider failures, minimum one-minute HTTP 429 deferral, and provider/parse/write/checkpoint/window timing without raw personal payloads;
- lifecycle-fence/cancellation behavior that prevents stale completion;
- worker registration beside the Chess.com executor in the existing worker deployment;
- no second queue, deployment, schema/migration, unbounded game-ID arrays, or provider network work inside database transactions.

## Review history

Two implementation self-review rounds are preserved in the ONB-013 implementation report. Material corrections before merge included replacing interim Lichess-specific persistence/checkpoint sequencing with the shared provider-neutral atomic commit repository, cancelling failed NDJSON readers, validating persisted current-window checkpoints, recording provider timing on transport failure, removing compatibility N+1/unbounded ID behavior, and preventing compatibility cursor advancement after bulk-persistence failure.

The runtime branch was later reconciled with the already-landed ONB-014 shared-commit architecture and then-current `main`; the final PR head contains the intended ONB-013 runtime plus its completion metadata only.

A completion-reconciliation self-review on 2026-08-14 found and corrected four documentation/process defects before merge: an accidental wording drift in the accepted ONB-013 task contract, stale ONB-013 ownership in `OPEN_QUESTIONS.md`, stale execution-state text in `GITHUB_ISSUES.md`, and a two-commit drift behind `main`. The accepted task contract was restored, the two canonical coordination documents were reconciled, and PR #376 was rebuilt as one documentation-only commit on current `main` `e486a1b02fb02d09803fc4e1b3ce67ea610ce7ae`.

## Validation evidence

- low-volume Lichess canary workflow run #2665 (`31566377590`) passed the dedicated `ONB-013 low-volume Lichess canary` step together with normal repository gates; the temporary workflow hook was removed afterward;
- reviewed runtime head `9d1bde8e563e60ab1c233d88123b675f419c5d74` passed normal full CI #2684 (`31571213970`);
- final runtime PR head `2f53e81fba2386c1c2b3638c24a1450184497f78` passed CI #2687 (`31580120124`);
- runtime PR #357 squash-merged into `main` as `e276e3820acbd8361feae99d8a0e15a9cf412e53` on 2026-08-12;
- completion PR #376 was refreshed over current `main` `e486a1b02fb02d09803fc4e1b3ce67ea610ce7ae` after the self-review found branch drift.

This documentation-only reconciliation must pass its own exact-head repository CI after the refresh before merge.

## Dependency and queue reconciliation

ONB-007, ONB-011, ONB-012, and ONB-013 are complete. ONB-014's runtime is also merged, but its task remains `REVIEW` because the required real low-volume Chess.com canary has not been recorded. This reconciliation therefore does not promote ONB-015.

ONB-015 / #203 remains `PROPOSED` behind completion of both provider adapters. ONB-018 remains dependency-blocked by durable import/cutover work. ONB-019 retains ownership of persisted destructive lifecycle operations/fences/audit/provenance, and ONB-020 retains destructive account/game coordination.

There is no unclaimed `READY` provider-adapter implementation task after this reconciliation. ONB-014 is review work, not a new implementation claim.

## Canonical-document reassessment

- `TASKS.md` records ONB-013 `DONE`, ONB-014 `REVIEW`, and keeps ONB-015 `PROPOSED`;
- the ONB-013 task file records the final runtime head/CI/squash commit, completion branch/report, and `DONE` state while preserving the accepted scope and acceptance criteria unchanged;
- `STATUS.md` records the delivered Lichess adapter, the merged-but-incomplete Chess.com review state, and the remaining cutover gate;
- `ROADMAP.md` was re-read: its ONB-013 + ONB-014 → ONB-015 dependency sequence remains structurally correct, so no architecture/ordering rewrite is required here;
- `DECISIONS.md` was re-read: the locked import decisions already match the delivered Lichess implementation, so no decision change is required;
- `OPEN_QUESTIONS.md` now records the merged ONB-013 implementation/canary evidence and removes stale ONB-013 ownership; optional authenticated Lichess access would require a new bounded owner if pursued;
- `GITHUB_ISSUES.md` now reflects ONB-013 completion reconciliation, ONB-014 `REVIEW`, completed ONB-023 state, and the absence of an unclaimed `READY` onboarding implementation task;
- issue #201 stays open until this reconciliation merges, while #202 remains open in `REVIEW`.

## Residual risks and handoff

- ONB-015 still owns removal of synchronous provider traversal from the account HTTP route and the durable account-sync/preparation handoff;
- ONB-019 still owns persisted destructive lifecycle fences; ONB-013 only consumes the provider-neutral admission/commit seam and does not claim destructive safety;
- ONB-014 still needs its real low-volume Chess.com canary and completion reconciliation;
- no public ETA or production throughput guarantee follows from CI or the low-volume Lichess canary;
- optional authenticated Lichess import for documented higher provider limits is not required by the accepted ONB-013 outcome and is not introduced here.

## Completion condition

After PR #376 is approved and squash-merged, ONB-013 is canonically `DONE` and issue #201 may close as completed. ONB-014 remains `REVIEW`; ONB-015 is not promoted by this change.
