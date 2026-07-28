# RB-005 — Deliver Player Chess Profile experience

Status: CLAIMED

Priority: P1

Order: 60

Delivery class: Standalone

Planning maturity: Outlined

Claimed by: ChatGPT session

Claim branch: `rb-005/issue-93-player-chess-profile-experience-claim`

Claimed at: 2026-07-28

Claim scope: implement a routed Angular Player Chess Profile page on top of the RB-004 review contract, including profile filters, explicit `What you choose` and `What works` views, evidence-backed conclusions, supporting opening/game evidence, coverage and insufficient-data states, responsive presentation, feature-local signal store/data access/helpers/components, and focused tests. Explicitly exclude RB-004 calculation changes, tag-severity contract expansion, persistence, profile-correction storage, builder target setup, course writes, LLM narrative, and global visual redesign.

## Outcome

Deliver a recalculable, evidence-backed Player Chess Profile experience that helps a player understand preferences, strengths, weaknesses, and context shifts without requiring the repertoire builder.

The experience should also provide a clear future entry point: use these findings as suggested defaults for a new repertoire target.

## Why this task exists

A standalone profile validates whether opening classification, level resolution, tags, and profile calculations produce conclusions that users find credible. It delivers immediate product value and reduces risk before those conclusions influence move recommendations.

## Current repo anchors to inspect

- current account detail and performance pages;
- game filter and period selector patterns;
- opening analysis breakdowns and performance widgets;
- finding cards and expandable evidence patterns;
- current visual-transformation state and shared UI primitives;
- Angular feature data-access/store/page conventions;
- RB-004 contract and examples.

## Dependencies

RB-004 remains in review through PR #136 and is not merged to `main`.

The user approved a stacked hands-on implementation based on `rb-004/issue-92-player-chess-profile-engine`. The RB-005 implementation must remain based on that branch until RB-004 is accepted and integrated; neither branch may be merged without explicit user approval.

RB-013 and later builder setup can consume approved profile interactions.

## In scope

- a routed authenticated profile page or approved placement in an existing account/player area;
- period selection including at least recent, all-time, and custom ranges consistent with existing filters;
- account, speed, and color selection;
- clear separation of `What you choose` and `What works`;
- contextual comparisons for peers/stronger opposition when RB-001/RB-002 evidence supports them;
- confidence and data coverage presentation;
- expandable evidence listing contributing openings and bounded supporting games;
- differences by White/Black and selected speeds;
- comparison with a prior period if supported by RB-004;
- a non-binding action such as `Use as repertoire starting point` only when target setup exists or as a disabled/planned affordance with honest wording;
- loading, no-data, insufficient-data, and partial-analysis states;
- responsive and accessible implementation;
- focused store/component tests.

## Out of scope

- changing the player's profile conclusions manually unless a separate preference/feedback decision is approved;
- automatically writing courses;
- full builder setup;
- LLM narrative as a requirement;
- hiding sample size or uncertainty behind simplified archetype labels;
- global visual redesign.

## UX principles

- Lead with specific evidence-backed statements, not a horoscope-like permanent identity.
- Use phrases such as `in selected blitz games` and `medium confidence`.
- Make contradictory findings possible: preferred but underperforming, successful but rarely chosen, good opening positions but poor final results.
- Let the user inspect the games and openings behind a conclusion.
- Treat profile output as recalculated analysis, not immutable personal data.

## Acceptance criteria

- The user can choose a period and recompute the profile.
- The selected accounts, speeds, colors, rating context, and analysis coverage are visible.
- Preference and performance are separate.
- At least one conclusion can be expanded to contributing openings and games.
- Confidence and insufficient-data states are understandable.
- Contradictory profile findings render without forcing one global label.
- White and Black differences are supported.
- The page is usable at desktop and mobile widths.
- The architecture follows Angular feature data-access/store/component boundaries.
- Tests cover filter changes, stale request handling, loading/error/no-data states, and evidence expansion.

## Required validation

- web build;
- focused Angular tests;
- lint and architecture checks;
- responsive browser review;
- keyboard and accessible-name review;
- API contract integration tests where needed.

## Completion updates

The report must record which profile presentation patterns were accepted, whether users can correct or only override profile implications, and how RB-006/RB-013 should consume profile defaults.

## Completion

Report: none

Completed at: none
