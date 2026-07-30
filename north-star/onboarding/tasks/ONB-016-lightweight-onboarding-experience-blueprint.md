# ONB-016 — Define lightweight onboarding product and experience blueprint

Status: REVIEW

Priority: P1

Order: 75

Delivery class: Research/product design

Planning maturity: Research complete; awaiting user review and explicit merge instruction

GitHub issue: [#224](https://github.com/vokerg/chess_repertoir_trainer/issues/224)

Claimed by: ChatGPT/Codex research session for `vokerg`

Claim branch: `onb-016/issue-224-lightweight-experience-blueprint`

Claimed at: 2026-07-30

Claim scope: product/UX research and onboarding documentation only

## Outcome

Define the canonical lightweight interaction model that turns the already-approved progressive data lifecycle into a professional first-value experience without building a competing runtime, visual system, or recommendation engine.

## Why this task exists

ONB-001 and ONB-002 resolved the durable lifecycle and import contract. ONB-003 and ONB-007 own orchestration and performance. ONB-010 describes a functional Angular route, but the program did not define the intended choreography: focused actions, staged account connection, real progress, early insight reveals, personal-game tactics, reusable profile modules, and the future Repertoire Builder handoff.

The current account-management page exposes provider, account, sync, indexing, analysis, cursor, activation, default-account, and deletion controls together. That is appropriate for an advanced settings surface but not for a calm first-use journey.

## Current repository anchors inspected

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
- Runs in parallel with ONB-003 and ONB-007; it does not decide their physical wave, priority, pipeline, capacity, or ETA policies.
- Informs ONB-008 readiness projection, ONB-009 allowed actions, and ONB-010 Angular experience.
- Coordinates with Visual Transformation VT-302 / #133 for final presentation and accessibility.
- Reuses Player Chess Profile and tactical-training calculations rather than duplicating them.
- Provides an optional future entry point into Repertoire Builder #105 without generating or mutating a repertoire.

## Delivered scope

- Idea-to-current-program coverage matrix.
- Lightweight and progressive-disclosure interaction standards.
- First-run, progress, reveal, background, return, expansion, and recovery journey.
- One dominant action per focused surface.
- One selected account for the first preparation run plus later multi-account expansion.
- Lichess-first acceleration only where measured provider behavior and user choice permit it.
- Exact, granular, per-account progress without fabricated movement or unapproved ETA.
- Evidence-gated import-only, indexed, and analysed insight moments.
- Player Chess Profile reuse.
- Personal-game tactical scenario handoff.
- Optional Repertoire Builder handoff.
- Competitor review focused on opening-repertoire products.
- Safe ChatGPT Sites/Codex/Figma prototype-to-Angular workflow.
- State, failure, recovery, privacy, performance, analytics, and accessibility implications.
- ONB-010 refinement and bounded follow-up recommendations mapped to existing owners.

## Explicit exclusions preserved

- No production Angular, API, Prisma, worker, route, provider, migration, or deployment changes.
- No final visual styling or accessibility acceptance owned by VT-302.
- No ONB-003 orchestration schema or scheduling decision.
- No ONB-007 benchmark result or ETA policy.
- No automatic repertoire/course generation or mutation.
- No second browser-owned lifecycle or recommendation engine.
- No real user chess data or application secrets in a generated prototype.
- No ChatGPT Sites-generated source treated as approved production architecture.

## Resolved questions

- The minimum calm first-use journey is route-based, persisted, non-blocking, and exposes one dominant action at a time.
- Focused account connection, recipe acceptance, progress, reveal, personal tactic, expansion, and completion moments are defined in `EXPERIENCE_BLUEPRINT.md`.
- Multiple accounts are introduced as explicit expansion after first value rather than a first-run prerequisite.
- Import-only, indexed, partially analysed, and analysed evidence levels are separated.
- Real milestones and exact counts create activity; fabricated percentages do not.
- Player Chess Profile and tactical training remain canonical reusable modules.
- Repertoire Builder receives only an optional evidence anchor and retains human decision authority.
- ChatGPT Sites and Codex/Figma are private synthetic-data prototype/handoff tools; Angular remains production.

## Acceptance criteria assessment

- Every material product idea is classified in the report: satisfied.
- Persisted, resumable, navigable, non-blocking experience: specified.
- One dominant action and no onboarding tables/action clusters: locked in decisions and ONB-010.
- First value before full import/analysis: specified through progressive evidence reveals.
- Exact persisted progress/fixed denominators only: preserved and strengthened.
- Multi-account expansion after first run: specified.
- Evidence strength/canonical calculation reuse: specified.
- Personal tactics and Builder as optional continuations: specified.
- Synthetic prototype and Angular reinterpretation workflow: specified.
- ONB-010 and cross-program coordination: materially refined.

## Validation performed

- Reconciled recommendations against locked onboarding decisions.
- Inspected current account, Home, profile, tactical, job, provider-import, and Builder anchors.
- Verified current ChatGPT Sites and Codex/Figma behavior through official OpenAI documentation.
- Verified competitor claims through current first-party or store sources.
- Modelled first-run, no-account, invalid-account, no-games, slow-provider, partial import, partial index, all-index-failed, first-insight, first-analysis, multi-account expansion, skip, leave/return, personal tactic, Builder, and recovery scenarios.
- Reconciled task queue, decisions, open questions, issue mapping, ONB-010, program index, report, and draft PR.
- Build, tests, lint, architecture checks, browser automation, provider calls, migrations, and benchmarks intentionally skipped because the branch changes documentation only.

## Completion updates

- Blueprint: `north-star/onboarding/EXPERIENCE_BLUEPRINT.md`
- Report: `reports/ONB-016-2026-07-30-lightweight-onboarding-experience-blueprint.md`
- Pull request: [#225](https://github.com/vokerg/chess_repertoir_trainer/pull/225) — draft
- Validation: documentation/research validation recorded in the report
- Queue impact: ONB-003 remains the deterministic next critical-path task
- Completed at: pending user acceptance and squash merge
