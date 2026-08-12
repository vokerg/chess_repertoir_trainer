# ONB-013 — Bounded Lichess adapter implementation progress

Date: 2026-08-12

Task: [ONB-013](../tasks/ONB-013-lichess-bounded-import.md)

Issue: [#201](https://github.com/vokerg/chess_repertoir_trainer/issues/201)

Claim branch: `account-import/onb-013-lichess-adapter`

Original inspected base: `8e8cd04f9298ae5f1f5affc4daa7fcdc2faa40be`

Status: implementation in progress; not review-ready and not complete.

## Implemented branch work

The task branch now contains the bounded Lichess provider adapter on the provider-neutral ONB-012 worker seam:

- deterministic half-open provider windows, 14 days by default;
- canonical `BULLET` / `BLITZ` / `RAPID` to Lichess `perfType` mapping;
- `since = from`, `until = to - 1ms`, exact rated filtering, and mode-specific sort order;
- serial streaming NDJSON with the worker `AbortSignal`;
- shared Lichess normalization reused by the legacy sync service so durable and legacy paths no longer define separate normalization behavior;
- bounded persistence using the existing account-import repository, with the database batch ceiling defaulting to 100;
- progressive played-game activity reconciliation after committed durable batches;
- exact window coverage only after complete successful provider traversal, including empty streams;
- replay of incomplete windows through existing duplicate-safe persistence;
- persisted provider checkpoint projection so a reclaimed run retains its original window size and active-window boundary;
- fresh retry planning from immutable scope/range plus current proved coverage rather than copying the failed run's provider denominator;
- provider-safe typed failures (`LICHESS_HTTP_*`, malformed NDJSON, unavailable account) while unexpected exceptions retain ONB-012's generic failure path;
- one-minute minimum retry deferral after Lichess HTTP 429;
- Lichess executor registration in the existing worker process;
- provider fixtures, planner/parser/executor tests, worker-boundary integration coverage, and an opt-in low-volume live canary harness.

No new queue, broker, database model, migration, background deployment, or transaction abstraction is introduced. Provider/network work remains outside the account-import admission guard and database transactions. Durable game and coverage commits continue through the existing exact-work-key and shared admission-guard seam; ONB-019 still owns persisted destructive fences.

The durable worker serializes account-import provider execution globally, matching the ONB-012/ONB-007 contract. The legacy `/api/me/accounts/:id/sync` Lichess route still performs synchronous provider I/O in the API process until ONB-015 cuts it over. ONB-013 does not add a false in-process mutex or new distributed lock across API and worker processes; therefore this progress state does not claim cross-process serialization between the legacy route and the new durable adapter before ONB-015.

## Review findings resolved during implementation

### Persisted provider checkpoint had no executor projection

`ImportRun.checkpointJson` was already persisted by ONB-012, but claimed `StoredAccountImportRun` values did not expose it. Recomputing the provider plan from current configuration on restart could therefore change window boundaries after a deployment configuration change. The branch projects the existing internal checkpoint through the lifecycle repository without exposing it through the public account-import API schema.

### Retry denominator must be fresh

ONB-002 defines retry as a new run with copied immutable scope/range and work planned from current proved coverage. ONB-012 copied `windowsTotal` from the failed source. The branch resets the retry denominator to `null`; the provider establishes a new deterministic denominator when the new run is claimed. Same-run pause/restart still preserves the original provider checkpoint/window size.

### Known provider failures need safe provider-specific codes

The ONB-012 worker intentionally collapses unexpected thrown exceptions to a generic safe failure to prevent provider payload leakage. ONB-013 additionally needs provider-specific errors. The branch adds a provider-neutral `FAILED` executor result carrying an explicitly safe code/message. Known Lichess HTTP and malformed-stream failures use it; thrown unexpected errors remain on the existing generic security path.

## Validation completed in the current environment

A strict TypeScript integration harness around the new provider/config/executor/registry compiles successfully.

Focused runtime tests pass for:

- 14-day initial/backfill and forward planning;
- half-open query boundaries and exact `perfType` / rated / sort mapping;
- checked-in NDJSON fixtures and chunked streaming;
- malformed record rejection;
- shared normalization and result mapping;
- bounded 100/100/5 persistence for a 205-game stream;
- progressive activity reconciliation;
- exact empty-window coverage;
- malformed and interrupted partial-window replay without coverage advancement;
- duplicate-safe replay;
- persistence and coverage lifecycle-fence rejection;
- provider HTTP failure without payload persistence;
- minimum 60-second HTTP 429 deferral;
- same-run restart with persisted 14-day planning after config changes;
- corrupt checkpoint / impossible coverage-progress rejection;
- provider-stream cancellation.

The worker-boundary, retry-lineage, lifecycle-checkpoint, and opt-in canary files have also been syntax-checked in the available execution environment. The branch adds DB-backed assertions that provider checkpoints survive pause/resume/reclaim and that retry runs receive a fresh provider denominator.

## Validation still required before review readiness

The execution shell cannot resolve GitHub hosts, so a complete repository checkout, installed monorepo dependency graph, PostgreSQL test database, and the repository's full API gates are not available in this session. GitHub repository inspection and branch/issue coordination remain available through the connected GitHub API.

Before moving ONB-013 to `REVIEW`, run on a normal checkout or CI:

- full API build/lint/test gates;
- DB-backed lifecycle checkpoint and retry-lineage tests;
- the Lichess worker-boundary integration test;
- the opt-in low-volume live Lichess canary over a maximum six-hour range;
- normal architecture/repository hygiene gates.

The live canary must not deliberately trigger Lichess rate limiting. HTTP 429 cooldown behavior is validated deterministically in the executor test.

## Current result

Implementation is materially advanced and is now persisted on the task branch, but intentionally remains `IN_PROGRESS`. No pull request, completion record, issue closure, merge, or destructive-safety claim is made by this progress report.
