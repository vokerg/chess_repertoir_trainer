# ONB-016 — Define lightweight onboarding product and experience blueprint

Status: IN_PROGRESS

Priority: P1

Order: 75

Delivery class: Research/product design

Planning maturity: Claimed by explicit user direction

GitHub issue: [#224](https://github.com/vokerg/chess_repertoir_trainer/issues/224)

Claimed by: ChatGPT/Codex research session for `vokerg`

Claim branch: `onb-016/issue-224-lightweight-experience-blueprint`

Claimed at: 2026-07-30

Claim scope: product/UX research and onboarding documentation only

## Outcome

Define the canonical lightweight interaction model that turns the already-approved progressive data lifecycle into a professional first-value experience without building a competing runtime, visual system, or recommendation engine.

## Why this task exists

ONB-001 and ONB-002 resolved the durable lifecycle and import contract. ONB-003 and ONB-007 own orchestration and performance. ONB-010 describes a functional Angular route, but the program does not yet define the intended choreography: focused actions, staged account connection, real progress, early insight reveals, personal-game tactics, reusable profile modules, and the future Repertoire Builder handoff.

The current account-management page exposes provider, account, sync, indexing, analysis, cursor, activation, default-account, and deletion controls together. That is appropriate for an advanced settings surface but not for a calm first-use journey.

## Current repository anchors to inspect

- `north-star/onboarding/`
- `apps/web/src/app/features/accounts/`
- `apps/web/src/app/features/home/`
- `apps/web/src/app/features/player-chess-profile/`
- `apps/web/src/app/features/scenario-training/`
- `apps/web/src/app/core/jobs/`
- `apps/api/src/services/lichessImportService.ts`
- `apps/api/src/services/chessComImportService.ts`
- `apps/api/src/modules/imported-games/`
- `docs/imported-game-job-processing.md`
- `docs/tactical-detections.md`
- `transformation/reports/VT_301_PLAYER_CHESS_PROFILE.md`
- `north-star/repertoire-builder/`

## Dependencies and coordination

- Consumes accepted ONB-001 and ONB-002 contracts.
- Runs in parallel with ONB-003 and ONB-007; it must not decide their physical wave, priority, pipeline, capacity, or ETA policies.
- Informs ONB-008 readiness projection, ONB-009 allowed actions, and ONB-010 Angular experience.
- Coordinates with Visual Transformation VT-302 / #133 for final presentation and accessibility.
- Reuses Player Chess Profile and tactical-training calculations rather than duplicating them.
- Provides an optional future entry point into Repertoire Builder #105 without generating or mutating a repertoire.

## In scope

- Idea-to-current-program coverage matrix.
- Lightweight and progressive-disclosure interaction standards.
- First-run, progress, reveal, background, return, expansion, and recovery journey.
- One dominant action per focused surface.
- One selected account for the first preparation run plus later multi-account expansion.
- Lichess-first acceleration where truthful provider behavior and user choice permit it.
- Exact, granular, per-account progress without fabricated movement or unapproved ETA.
- Evidence-gated import-only, indexed, and analysed insight moments.
- Player Chess Profile reuse.
- Personal-game tactical scenario handoff.
- Optional Repertoire Builder handoff.
- Competitor review focused on opening-repertoire products.
- Safe ChatGPT Sites/Codex/Figma prototype-to-Angular workflow.
- State, failure, recovery, privacy, performance, analytics, and accessibility implications.
- ONB-010 refinement and bounded follow-up recommendations.

## Out of scope

- Production Angular, API, Prisma, worker, route, provider, migration, or deployment changes.
- Final visual styling or accessibility acceptance owned by VT-302.
- ONB-003 orchestration schema or scheduling decisions.
- ONB-007 benchmark results or ETA policy.
- Automatic repertoire/course generation or mutation.
- A second browser-owned lifecycle or recommendation engine.
- Publishing real user chess data or application secrets through a generated prototype.
- Treating ChatGPT Sites-generated source as approved production architecture.

## Questions owned

- What is the minimum calm first-use journey that still communicates meaningful work?
- Which moments deserve a dedicated focused surface versus a persistent Home card?
- How should multiple accounts be introduced without delaying first value?
- Which facts are safe and useful at import-only, indexed, and analysed evidence levels?
- How should progress feel active while remaining numerically truthful?
- How should onboarding reuse Player Chess Profile and tactical-training modules?
- What is the correct optional handoff to the Repertoire Builder?
- How should ChatGPT Sites and Codex/Figma be used as design tools without introducing a second stack?

## Acceptance criteria

- Every material product idea is classified as already covered, compatible extension, delegated decision, or conflict.
- The experience remains persisted, resumable, navigable, and non-blocking.
- Focused surfaces have one dominant action and avoid onboarding tables or settings-style action clusters.
- First value does not wait for full import or full engine analysis.
- Progress uses exact persisted facts and fixed denominators only.
- Multi-account expansion is supported after the first run without changing the one-account initial recipe.
- Insight claims expose evidence strength and reuse canonical calculations.
- Personal tactics and Builder entry are optional continuations, not onboarding-completion gates.
- Prototype workflow uses synthetic fixtures, narrow access, saved review versions, and explicit Angular reinterpretation.
- ONB-010 and cross-program coordination are materially more implementable.

## Required validation

- Reconcile recommendations against all locked onboarding decisions.
- Inspect current account, Home, profile, tactical, job, and Builder anchors.
- Verify current ChatGPT Sites and Codex/Figma behavior through official OpenAI documentation.
- Verify competitor claims through current first-party or store sources.
- Walk first-run, no-account, invalid-account, no-games, slow-provider, partial import, partial index, all-index-failed, first-insight, first-analysis, multi-account expansion, skip, leave/return, and recovery scenarios.
- Documentation consistency review across task queue, roadmap, status, decisions, open questions, issue mapping, ONB-010, and the final report.

## Completion updates

- Report: pending
- Pull request: pending
- Validation: pending
- Completed at: pending
