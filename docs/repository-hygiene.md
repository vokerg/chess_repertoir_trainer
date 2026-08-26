# Repository hygiene

Repository cleanup is intentionally incremental and behavior-preserving. The objective is to reduce obsolete code, duplicated contracts, stale presentation residue, and documentation drift without deleting files based only on naming, age, or simple text-reference counts.

## Safety rules

Before deleting a source file, template, style, asset, script, or configuration entry, prove that it has no runtime or tooling consumer. Check the owning Angular route and dependency-injection path, Fastify route/module registration, MCP registration, Prisma/model usage, scripts and CI, template/style references, dynamic imports, and generated-code inputs before classifying an item as dead.

Applied Prisma migrations are history and are not cleanup candidates. Generated source is not edited manually; cleanup must identify its source and generator first. Large files are refactoring candidates only when a cohesive responsibility can be extracted without changing behavior.

## Hygiene guardrail

Run:

```bash
npm run check:hygiene
```

The guard currently ratchets use of `legacyOpaqueResponseSchema`. `scripts/check-repository-hygiene.mjs` records the exact reviewed token count for every remaining consumer file, including its import and route response references. New consumer files and net increases in an existing file fail the check; migrating or deleting a usage requires reducing that file's baseline in the same change, and removing the last usage requires removing the file entry entirely.

This is intentionally a debt-count ratchet rather than a parser or identity-level route allowlist. A one-for-one replacement of one legacy response with another inside the same file would leave the count unchanged, so code review must still reject newly introduced opaque responses. The guard prevents unnoticed growth; it does not replace route-level review.

The Analysis routes are no longer part of that baseline. `@chess-trainer/contracts/analysis` owns position-analysis cache responses plus imported-game analysis read/create/ply-mutation responses; the API preserves the existing service outputs and error behavior, and Angular consumes the shared imported-game analysis DTOs while retaining its broader local position-cache state model.

The statistics routes are no longer part of that baseline. Their aggregate summary, line/chapter/course statistics, and subline-status responses use schemas from `@chess-trainer/contracts/training`, and the Angular Lines client consumes the inferred DTOs instead of duplicate handwritten response interfaces.

Lab routes are no longer part of the opaque-response baseline. `@chess-trainer/contracts/lab` owns the shared Lab wire DTOs, including monthly games, training log, and tactical-detection responses; the API explicitly serializes persistence dates to ISO date-time strings, and Angular consumes the shared types instead of maintaining duplicate response models.

Imported-game routes are no longer part of the opaque-response baseline. The opening-analysis core and performance routes now use shared response contracts alongside the existing imported-game DTOs, the top-games route uses the same shared contract family, and Angular consumes the inferred opening-analysis DTOs instead of maintaining duplicate response interfaces.

Scenario-training routes are no longer part of the opaque-response baseline. `@chess-trainer/contracts/scenario-training` owns session, history, attempt-result, and dislike response DTOs; Fastify validates every successful response against those schemas, and Angular consumes the inferred response types instead of maintaining handwritten copies. The contract preserves source-game deletion semantics by requiring `importedGameId` with a nullable value.

Course position suggestions, chapter resource responses, line resource/list/tree responses, and move-node create/update responses now use concrete shared `@chess-trainer/contracts/courses` schemas. The chapter, line, and persisted move-node routes explicitly serialize Prisma dates to ISO date-time strings before validation, line-list training statistics reuse the canonical training-status literal, and active Angular line/list/tree/node projections derive from the shared contracts where their wire shapes are exact. The Courses baseline has dropped from 14 to 5 occurrences; only the `legacyOpaqueResponseSchema` import plus analysis-reintegration response references remain in this file's RH-003 debt.

The stable External Accounts resource/read-model surface is now concrete. `@chess-trainer/contracts/external-accounts` owns account list/create/get/update/delete, default-progress-account, rating-history, and rating-stats responses; the API explicitly converts Prisma account dates to ISO strings before validation, and Angular account/profile consumers derive their DTOs from the shared contract. The External Accounts hygiene baseline is intentionally retained at five occurrences: one import plus `/api/me`, synchronous account sync, workflow-candidate ID arrays, and raw cursor reset. Those remaining responses have separate lifecycle/cutover ownership and were not stabilized opportunistically in this slice.

CI runs the hygiene guard independently from the architecture guardrails so cleanup-specific constraints stay visible and can expand without turning the architecture script into a general lint bucket.

## Cleanup sequence

1. Inventory and classify suspected residue as referenced, dynamically referenced, generated, tooling-only, historical, or proven zero-reference.
2. Remove only proven zero-reference artifacts, with focused tests or build coverage for the owning area.
3. Migrate transitional response contracts endpoint-by-endpoint and reduce the exact hygiene baseline in the same change.
4. Refactor oversized modules only along existing domain boundaries.
5. Reconcile canonical docs, feature tests, Web/Mobile/MCP capability ownership, and operational scripts after the code change is verified.

A cleanup change must not introduce unrelated redesigns, dependency upgrades, storage/queue/job infrastructure, migration squashing, or speculative abstractions.

## Validation

At minimum, changes touching shared contracts must run contract tests plus API and Web builds. Repository-wide cleanup PRs should also run the root lint, build, test, architecture, and hygiene commands. CI remains the final repository-level verification when local execution is unavailable.