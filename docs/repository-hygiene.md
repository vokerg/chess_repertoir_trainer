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

`legacyOpaqueResponseSchema` has been retired from API consumers. `scripts/check-repository-hygiene.mjs` keeps a zero-use baseline and scans API source so any future consumer fails the guard immediately. Cross-workspace payloads must use concrete schemas in `packages/contracts`; feature-local responses may use concrete API-local schemas when they are not shared.

The guard is intentionally narrow and does not replace route-level review. Code review must still reject newly introduced unconstrained response schemas or contracts that do not match the real service/repository output.

The Analysis routes use `@chess-trainer/contracts/analysis` for position-analysis cache responses plus imported-game analysis read/create/ply-mutation responses; the API preserves the existing service outputs and error behavior, and Angular consumes the shared imported-game analysis DTOs while retaining its broader local position-cache state model.

The statistics routes use schemas from `@chess-trainer/contracts/training` for aggregate summary, line/chapter/course statistics, and subline-status responses, and the Angular Lines client consumes the inferred DTOs instead of duplicate handwritten response interfaces.

Lab routes use `@chess-trainer/contracts/lab` for shared Lab wire DTOs, including monthly games, training log, and tactical-detection responses; the API explicitly serializes persistence dates to ISO date-time strings, and Angular consumes the shared types instead of maintaining duplicate response models.

Imported-game routes use shared response contracts for opening-analysis core/performance/top-games alongside the existing imported-game DTOs, and Angular consumes the inferred opening-analysis DTOs instead of maintaining duplicate response interfaces.

Scenario-training routes use `@chess-trainer/contracts/scenario-training` for session, history, attempt-result, and dislike response DTOs; Fastify validates every successful response against those schemas, and Angular consumes the inferred response types instead of maintaining handwritten copies. The contract preserves source-game deletion semantics by requiring `importedGameId` with a nullable value.

Courses routes use `@chess-trainer/contracts/courses` for position suggestions, chapter resources, line resource/list/tree and move-node mutation responses, plus chapter analysis-reintegration preview/apply/error responses. Reintegration contracts include the recursive preview tree and structured conflict details emitted by the merge planner; Fastify validates those payloads without changing status or error behavior, and Angular consumes the shared reintegration response DTOs instead of maintaining handwritten copies.

External Accounts routes use `@chess-trainer/contracts/external-accounts` for the current application user/session response, account list/create/get/update/delete, default-progress-account, workflow summary, rating-history, rating-stats, and performance responses. The API explicitly converts Prisma user/account dates to ISO strings before validation where needed, and Angular auth/account/profile consumers derive their wire DTOs from the shared contracts. `GET /api/me` was the final production `legacyOpaqueResponseSchema` consumer; its migration reduces the repository opaque-response baseline to zero.

CI runs the hygiene guard independently from the architecture guardrails so cleanup-specific constraints stay visible and can expand without turning the architecture script into a general lint bucket.

## Cleanup sequence

1. Inventory and classify suspected residue as referenced, dynamically referenced, generated, tooling-only, historical, or proven zero-reference.
2. Remove only proven zero-reference artifacts, with focused tests or build coverage for the owning area.
3. Keep response contracts concrete and shared when payloads cross workspace boundaries.
4. Refactor oversized modules only along existing domain boundaries.
5. Reconcile canonical docs, feature tests, Web/Mobile/MCP capability ownership, and operational scripts after the code change is verified.

A cleanup change must not introduce unrelated redesigns, dependency upgrades, storage/queue/job infrastructure, migration squashing, or speculative abstractions.

## Validation

At minimum, changes touching shared contracts must run contract tests plus API and Web builds. Repository-wide cleanup PRs should also run the root lint, build, test, architecture, and hygiene commands. CI remains the final repository-level verification when local execution is unavailable.
