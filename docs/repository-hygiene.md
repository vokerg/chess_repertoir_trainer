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

The guard currently ratchets use of `legacyOpaqueResponseSchema`. Existing transitional consumers are explicitly enumerated in `scripts/check-repository-hygiene.mjs`, and the allowlist must exactly match the current consumers. New consumers fail the check; migrating or deleting a consumer requires removing its allowance in the same change, so stale exceptions cannot remain.

The statistics routes are no longer part of that allowlist. Their aggregate summary, line/chapter/course statistics, and subline-status responses use schemas from `@chess-trainer/contracts/training`, and the Angular Lines client consumes the inferred DTOs instead of duplicate handwritten response interfaces.

CI runs the hygiene guard independently from the architecture guardrails so cleanup-specific constraints stay visible and can expand without turning the architecture script into a general lint bucket.

## Cleanup sequence

1. Inventory and classify suspected residue as referenced, dynamically referenced, generated, tooling-only, historical, or proven zero-reference.
2. Remove only proven zero-reference artifacts, with focused tests or build coverage for the owning area.
3. Migrate transitional response contracts endpoint-by-endpoint and shrink the hygiene allowlist in the same change.
4. Refactor oversized modules only along existing domain boundaries.
5. Reconcile canonical docs, feature tests, Web/Mobile/MCP capability ownership, and operational scripts after the code change is verified.

A cleanup change must not introduce unrelated redesigns, dependency upgrades, storage/queue/job infrastructure, migration squashing, or speculative abstractions.

## Validation

At minimum, changes touching shared contracts must run contract tests plus API and Web builds. Repository-wide cleanup PRs should also run the root lint, build, test, architecture, and hygiene commands. CI remains the final repository-level verification when local execution is unavailable.
