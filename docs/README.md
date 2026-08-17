# Documentation index

Canonical documents in `docs/` describe current runtime architecture and operations. Program workspaces may describe targets, research, prototypes, or queued implementation; their status files must be checked before treating those claims as current behavior.

## Current architecture

- [Architecture](architecture.md): workspace and runtime boundaries.
- [Angular architecture](frontend/angular-architecture.md): Angular ownership and composition.
- [Frontend navigation](frontend/navigation.md): route and navigation ownership.
- [Native mobile architecture](mobile/architecture.md): Expo workspace, Chessground DOM boundary, offline persistence, synchronization, and rollout scope.
- [Activity Feed](activity-feed.md): current daily-aggregate ledger/API foundation and the boundary to pending producers and Home presentation.
- [Position analysis cache](position-analysis-cache.md): compact/rich analysis persistence.
- [Persistent imported-game job processing](imported-game-job-processing.md): durable worker architecture and operational behavior.
- [Data preparation execution](data-preparation-execution.md): durable preparation parent/batch admission, progressive reconciliation, control acknowledgement, and operational wake/stall behavior.
- [Opening Explorer](opening-explorer.md): Masters and rated-game APIs, shared integration, and cache behavior.
- [Imported-game query reuse](imported-games-query-reuse.md): shared filter and query ownership.
- [Opening struggles](opening-struggles.md): report modes, course coverage semantics, and performance boundary.
- [Player Chess Profile](player-chess-profile.md): deterministic preference/performance calculation, evidence grades, classification coverage, and API boundary.
- [Player Chess Profile experience](player-chess-profile-experience.md): `/progress/profile` presentation, evidence expansion, coverage states, and Angular ownership.
- [Rating normalization](rating-normalization.md): cross-pool grade ranges, evidence, product adjustments, FIDE reference semantics, versioning, and agent change procedure.
- [Lichess puzzles](lichess-puzzles.md): provider boundary, rating semantics, position normalization, persistence, and rollout status.
- [AI widgets](ai-widgets.md): optional provider boundary, game-review context, feature flags, privacy, and removal procedure.
- [Course and training performance](performance/course-training-optimisation.md): measurements and structural regression constraints.

## Operational guides

- [API conventions](api-conventions.md): route and service conventions.
- [API contracts](api-contracts.md): shared HTTP schema ownership.
- [OpenAPI](openapi.md): generated documentation rules.
- [Repository hygiene](repository-hygiene.md): cleanup safety rules, transitional-debt ratchets, and validation expectations.
- [Deployment](deployment.md): environment and hosting setup.
- [Manual Docker deployment](docker-manual-deployment.md): Compose testing, multi-platform publishing, VM update, and rollback.
- [Mobile development](mobile/development.md): Expo setup, device networking, validation, and release gates.
- [MCP](mcp.md): backend MCP transport.
- [Project working guides](skills/README.md): detailed human-readable change guides.

## Product and delivery status

- [Product overview](../README.md): current user-facing capabilities, setup, and known limitations.
- [Daily development changelog](../CHANGELOG.md): one feature-level snapshot per calendar day.
- [Repertoire Builder status](../north-star/repertoire-builder/STATUS.md): integrated capability chain and residual evidence gate.
- [Onboarding status](../north-star/onboarding/STATUS.md): accepted contracts, current implementation, and next queue state.
- [Activity Feed program](../north-star/activity-feed/README.md): ACT task boundary and current issue queue.
- [Visual Transformation status](../transformation/STATUS.md): integrated rollout, validation, and remaining phases.

## Agent entry points

- [Repository instructions](../AGENTS.md): canonical branch, merge, architecture, validation, program, and command routing.
- [`update changelog`](../.agents/commands/update-changelog.md): exact daily-history reconciliation procedure.
- [Repertoire Builder agent protocol](../north-star/repertoire-builder/AGENTS.md).
- [Onboarding agent protocol](../north-star/onboarding/AGENTS.md).
- [Visual Transformation entry point](../TRANSFORMATION.md).

## Migration references

- [Angular migration](frontend/angular-migration.md): frontend convergence history and remaining migration context.

Topic documents not listed here remain feature references, but new canonical architecture or operational documents must be added to this index and labelled by role.
