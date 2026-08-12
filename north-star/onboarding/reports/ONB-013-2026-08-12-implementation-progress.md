# ONB-013 — Bounded Lichess adapter implementation and review evidence

Date: 2026-08-12

Task: [ONB-013](../tasks/ONB-013-lichess-bounded-import.md)

Issue: [#201](https://github.com/vokerg/chess_repertoir_trainer/issues/201)

Pull request: [#357](https://github.com/vokerg/chess_repertoir_trainer/pull/357)

Branch: `account-import/onb-013-lichess-adapter`

Status: `REVIEW`; runtime and validation complete, pending final exact-head gate and squash merge.

## Implemented

- Deterministic half-open Lichess windows, 14 days by default, with canonical `BULLET` / `BLITZ` / `RAPID` `perfType` mapping.
- `since = from`, `until = to - 1ms`, rated filtering, and mode-specific request ordering.
- Serial streaming NDJSON with the worker `AbortSignal`, explicit stream cancellation on failed traversal, and no full-response buffering.
- Shared Lichess normalization used by both durable and compatibility sync paths.
- Bounded duplicate-safe persistence with a maximum 100-game batch and no per-game existence-query N+1.
- No unbounded imported/eligible game-ID result arrays in the compatibility wrapper.
- Provider-neutral ONB-014 shared commit seam for plan initialization, atomic game/progress checkpoint commits, and atomic successful-window coverage completion.
- Progress-only atomic commits for out-of-scope and malformed-record accounting.
- Exact empty-window coverage, duplicate-safe replay, stable persisted window planning across restart/config changes, and conservative coverage after partial or failed traversal.
- Provider-safe typed failures, minimum one-minute HTTP 429 deferral, provider/parse/write/checkpoint/window timing, and generic handling for unexpected exceptions.
- Progressive played-game activity reconciliation after durable committed batches.
- Legacy sync bulk-persistence failure is fatal, preventing cursor advancement across an unpersisted batch.
- Lichess executor registered beside the already-landed ONB-014 Chess.com executor in the existing worker runtime; no duplicate provider-commit infrastructure remains.

## Self-review findings resolved

Two review rounds were used during implementation. Material findings fixed before merge readiness included:

1. replacing an interim Lichess-specific persistence/checkpoint sequence with the shared provider-neutral atomic commit repository established by ONB-014;
2. cancelling the response reader on malformed/non-successful NDJSON exits;
3. validating persisted current-window checkpoints against the deterministic plan;
4. recording provider timing for transport failures;
5. removing the compatibility service's per-game existence-query N+1;
6. removing unbounded game-ID arrays from the compatibility result path;
7. making compatibility bulk-persistence failures abort before cursor advancement;
8. correcting the malformed-record executor regression test to account for the intentional zero-game progress-only atomic commit;
9. removing stale branch metadata that would have regressed ONB-014's already-landed runtime state.

## Validation evidence

The low-volume Lichess canary ran in PR CI as workflow run #2665 (`31566377590`). The dedicated `ONB-013 low-volume Lichess canary` step completed successfully together with lint, build, architecture, hygiene, migrations, audits, and the repository test suite. The temporary workflow hook used to collect the evidence was removed from the production diff afterward.

The reviewed runtime head `9d1bde8e563e60ab1c233d88123b675f419c5d74` then passed the normal full repository workflow as CI run #2684 (`31571213970`). This included lint, full build, architecture guardrails, repository hygiene, database migrations, opening audits, and the complete test suite.

Focused coverage includes request planning and half-open bounds, `perfType` mapping, NDJSON fixtures/chunking, malformed and interrupted streams, empty windows, duplicate replay, 100-row batching, activity reconciliation, lifecycle fencing, 429 retry deferral, restart with persisted planning, corrupt-checkpoint rejection, cancellation, worker typed-failure settlement, retry lineage, and shared provider-commit PostgreSQL atomicity.

## Scope notes

ONB-015 still owns removal of synchronous provider traversal from the account HTTP route and the durable cutover/preparation handoff. ONB-019 still owns persisted destructive lifecycle fences. ONB-013 does not add a second queue, broker, deployment, database model, migration, or cross-process mutex.

ONB-014's runtime has landed separately on `main`; its own issue remains in review pending its Chess.com-specific external canary/completion reconciliation. This report makes no completion claim for ONB-014.

## Merge readiness

PR #357 is review-ready. After this metadata-only reconciliation, the exact final head must pass the normal full CI workflow and the final self-review must find no new blocker before squash merge.
