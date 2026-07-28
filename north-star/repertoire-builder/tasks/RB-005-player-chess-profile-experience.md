# RB-005 — Deliver Player Chess Profile experience

Status: REVIEW

Priority: P1

Order: 60

Delivery class: Standalone

Planning maturity: Implemented

GitHub issue: `#93`

Claimed by: ChatGPT session

Claim branch: `rb-005/issue-93-player-chess-profile-experience`

Claimed at: 2026-07-28

Claim scope: implement a routed Angular Player Chess Profile page on top of the RB-004 review contract, including profile filters, explicit `What you choose` and `What works` views, evidence-backed conclusions, supporting opening/game evidence, coverage and insufficient-data states, responsive presentation, feature-local signal store/data access/helpers/components, and focused tests. Explicitly exclude RB-004 calculation changes, tag-severity contract expansion, persistence, profile-correction storage, builder target setup, course writes, LLM narrative, and global visual redesign.

Implementation PR: `#139`

Final implementation-head CI: run `30329120052` / CI #1124 — success

## Outcome

Deliver a recalculable, evidence-backed Player Chess Profile experience that helps a player understand preferences, strengths, weaknesses, and context shifts without requiring the repertoire builder.

The experience should also provide a clear future entry point: use these findings as suggested defaults for a new repertoire target.

## Why this task exists

A standalone profile validates whether opening classification, level resolution, tags, and profile calculations produce conclusions that users find credible. It delivers immediate product value and reduces risk before those conclusions influence move recommendations.

## Current repo anchors inspected

- current account detail and performance pages;
- game filter and period selector patterns;
- performance-by-rating breakdown and store patterns;
- shared page header and panel primitives;
- Angular architecture and feature-module rules;
- RB-004 contract, tests, and report.

## Dependencies

RB-004 remains in review through PR #136 and is not merged to `main`.

The user approved a stacked hands-on implementation based on `rb-004/issue-92-player-chess-profile-engine`. PR #139 remains stacked through the RB-005 claim branch and must not be merged until RB-004 is accepted and the stack is reconciled.

RB-013 and later builder setup can consume approved profile interactions.

## Delivered

- the authenticated `/progress` entry presents the Player Chess Profile while `/progress/accounts/:accountId` preserves single-account dashboards;
- recent, all-time, and custom periods;
- all or selected connected accounts;
- fixed speed presets, White/Black context, rated/casual status, and optional player/opponent rating ranges;
- explicit `What you choose` and `What works` views;
- character, soundness, theoretical-status, theory-burden, and role breakdowns;
- deterministic conclusion cards with sample size and evidence strength;
- expandable contributing openings, metrics, and bounded recent games;
- score/WDL baseline, peer context, composite opening-positive/trouble and early-mistake rates, accuracy, and coverage;
- low-confidence, unknown-dimension, omitted/truncated, no-data, error, loading, and partial-analysis states;
- responsive feature-local OnPush components, typed data access, signal store, pure helpers, and focused tests;
- an honest disabled repertoire-starting-point affordance until target setup exists.

## Deliberate exclusions

- RB-004 formula or contract changes;
- splitting opening tag composites into severity distributions;
- stored profile snapshots or correction feedback;
- automatically writing courses;
- full builder setup;
- LLM narrative;
- permanent archetype labels;
- global visual redesign.

## UX principles applied

- Lead with specific evidence-backed statements, not a horoscope-like permanent identity.
- Keep preference and performance independent so contradictory findings can coexist.
- Let the user inspect openings and games behind a conclusion.
- Treat profile output as recalculated analysis, not immutable personal data.
- Keep uncertainty and omitted evidence visible.

## Acceptance review

Implemented for review:

- period and filter recalculation;
- visible account/speed/colour/rating context and analysis coverage;
- separate preference and performance presentation;
- expandable conclusions and breakdown evidence;
- understandable confidence, insufficient-data, partial-analysis, and no-data states;
- White/Black and speed-context support;
- desktop/narrow responsive CSS and native keyboard controls;
- page/store/data-access/component boundaries;
- tests for defaults, filters, stale request handling, error/no-data states, evidence expansion, and presentational interaction.

Hands-on review against populated personal data remains the acceptance gate. A browser session was not available in the connector-only implementation environment.

## Required validation

Completed through CI #1124:

- web and complete monorepo build;
- focused Angular tests and complete repository tests;
- TypeScript lint and architecture checks;
- database migrations and opening-classification audits.

Static responsive and accessible-name review was completed. Real desktop/mobile browser review remains part of user acceptance.

## Completion updates

The report records the accepted first-pass presentation, correction boundary, and RB-006/RB-013 handoff direction.

## Completion

Report: `../reports/RB-005-2026-07-28-player-chess-profile-experience.md`

Completed at: pending user review, accepted RB-004 integration, stack reconciliation, merge, and final closure update
