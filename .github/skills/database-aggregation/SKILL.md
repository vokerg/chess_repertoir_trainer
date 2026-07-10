---
name: database-aggregation
description: Use for counts, summaries, facets, averages, or grouped imported-game statistics in the Fastify/Prisma API.
---

# Database aggregation

1. Identify the owning repository and existing filter/ownership predicate.
2. Prove the current path does not load every matching record.
3. Apply `where` before Prisma `count`, `aggregate`, or `groupBy` operations.
4. Return only bounded aggregate groups to Node. Never temporarily add unbounded `findMany` plus reduction.
5. Preserve null handling, weighted-average denominators, rounding, and deterministic ordering.
6. Test mixed categories, both colors/sides, null data, ties, and representative filters.
7. Inspect query plans only when evidence requires deeper performance work.

For imported games, reuse `buildImportedGameWhere`; loading matching game rows for summary is a regression.
