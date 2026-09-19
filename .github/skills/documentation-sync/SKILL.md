---
name: documentation-sync
description: Use when code changes architecture, routes, contracts, queries, workspaces, setup, product delivery state, or agent workflow guidance.
---

# Documentation synchronization

1. Identify the canonical current-state document in `docs/README.md`.
2. Inspect runtime code and tests before changing current-state prose.
3. Update current-state documentation in the same change as code.
4. Mark incomplete direction as target, research, prototype, or migration rather than current fact.
5. Update root and program entry points when a capability moves between planned, implemented, blocked, or retired states.
6. Keep volatile queue details in `STATUS.md`, task documents, and GitHub issues; entry points should route to those sources instead of duplicating them.
7. Update migration ledgers and agent instructions when preferred patterns change.
8. Remove stale commands, paths, diagrams, and obsolete statements, including unverified claims that a current client or workspace is retired.
9. Check relative links, documented commands, and the documentation index.
10. When changelog conventions change, update the `update changelog` command procedure and its single routing line in `AGENTS.md`.
