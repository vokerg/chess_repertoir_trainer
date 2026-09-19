---
applyTo: "apps/web/**/*"
---

# Angular web changes

- Follow `docs/frontend/angular-architecture.md`, `angular-patterns.md`, and the nearest feature pattern.
- Import migrated wire DTOs with `import type` from `@chess-trainer/contracts`; do not duplicate them.
- Keep Angular presentation/view models separate from API DTOs.
- Do not import Zod at runtime unless trust-boundary parsing is an explicit requirement.
- Keep HTTP in typed feature data-access services and page workflow state in feature stores/facades.
- Preserve responsive layouts and navigation.
- Do not import from `apps/mobile`; Angular and React Native UI remain independent clients.
- Validate with `npm run build:web` and relevant web tests.
