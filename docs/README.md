# Documentation index

## Current architecture

- [Architecture](architecture.md): workspace and runtime boundaries.
- [Frontend architecture](frontend/angular-architecture.md): Angular ownership and composition.
- [Native mobile architecture](mobile/architecture.md): Expo workspace, Chessground DOM boundary, offline persistence, synchronization, and current rollout scope.
- [Position analysis cache](position-analysis-cache.md): compact/rich analysis persistence.
- [Persistent imported-game job processing](imported-game-job-processing.md): target architecture and staged migration from browser/in-memory orchestration to durable jobs.
- [Masters Explorer](masters-explorer.md): system-wide Lichess Masters position statistics and persistent cache behavior.
- [Imported-game query reuse](imported-games-query-reuse.md): shared filter and query ownership.
- [Opening struggles](opening-struggles.md): report modes, course coverage semantics, and performance boundary.
- [Course and training performance](performance/course-training-optimisation.md): phase measurements and structural regression constraints.

## Operational guides

- [API conventions](api-conventions.md): route and service conventions.
- [API contracts](api-contracts.md): shared HTTP schema ownership.
- [OpenAPI](openapi.md): generated documentation rules.
- [Deployment](deployment.md): environment and hosting setup.
- [Manual Docker deployment](docker-manual-deployment.md): local Compose testing, manual multi-platform GHCR publishing, and VM update/rollback operations.
- [Mobile development](mobile/development.md): Expo setup, device networking, validation, and release gates.
- [MCP](mcp.md): backend MCP transport.
- [Project working guides](skills/README.md): detailed human-readable change guides.

## Migration references

- [Angular migration](frontend/angular-migration.md): current frontend convergence work.

Topic documents not listed here remain valid feature references. New canonical architecture or operational documents must be added to this index and labeled by role.
