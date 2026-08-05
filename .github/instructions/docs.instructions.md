---
applyTo: "docs/**/*.md,README.md,AGENTS.md,CHANGELOG.md,TRANSFORMATION.md,.agents/**/*.md,.github/**/*.md,north-star/**/*.md,transformation/**/*.md"
---

# Documentation changes

- Describe current behavior accurately; label unimplemented direction as target, research, prototype, or migration work.
- Update code and its canonical topic document together.
- Keep relative links valid and update `docs/README.md` when adding canonical documents.
- Keep OpenAPI documentation aligned with the single Fastify route-schema source.
- Distinguish responsive Angular mobile layouts from the supported native Expo client; do not describe either one as retired or future-only without checking current code.
- Keep `docs/skills` as human-readable working guides. Actual reusable agent skills live in `.github/skills`.
- Keep root and program entry points stable: link to volatile `STATUS.md`, task queues, and GitHub issues instead of copying a next-task claim that will quickly become stale.
- When a capability moves from planned to implemented, update every entry point that still describes the old delivery boundary.
