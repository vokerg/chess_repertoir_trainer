# RB-005 — Player Chess Profile experience

Date: 2026-07-28

Issue: [#93](https://github.com/vokerg/chess_repertoir_trainer/issues/93)

Claim PR: [#138](https://github.com/vokerg/chess_repertoir_trainer/pull/138)

Implementation PR: [#139](https://github.com/vokerg/chess_repertoir_trainer/pull/139)

Implementation branch: `rb-005/issue-93-player-chess-profile-experience`

State: review

## Outcome

RB-005 now has a stacked Angular implementation for hands-on review on top of the unmerged RB-004 calculation branch.

The existing authenticated `/progress` entry opens a recalculable Chess Profile. Existing individual account dashboards remain at `/progress/accounts/:accountId`.

## Delivered presentation

- profile context filters for period, account subset, speed preset, colour, rated/casual status, and optional rating ranges;
- explicit `What you choose` and `What works` views;
- character, soundness, theoretical-status, theory-burden, and role dimensions;
- preference exposure bars and baseline-centred performance deltas;
- deterministic conclusion cards with sample and evidence strength;
- expandable contributing openings, metrics, and bounded recent games;
- selected-game WDL and score baseline;
- composite opening-positive, opening-trouble, and early-mistake rates from RB-004;
- accuracy, factual peer-band context, analysis coverage, classification coverage, low-confidence, unknown-dimension, omitted, and truncated evidence;
- loading, no-data, recalculation-error, and partial-analysis states;
- responsive layouts and native keyboard controls;
- a disabled, honestly labelled future repertoire-starting-point affordance.

## Accepted first-pass direction

The implementation deliberately stays simpler than a general-purpose chess identity dashboard.

- Opening preference and opening performance remain the centre of the experience.
- Existing composite tag metrics are shown without splitting success versus advantage, trouble versus disaster, or mistake versus blunder.
- No radar chart or single permanent archetype is used.
- Contradictory evidence can coexist because preference and performance are independent.
- The profile remains recalculated analysis rather than persisted identity.

These choices should now be tested through hands-on use before adding more metrics or contract fields.

## Architecture

The new feature follows the repository frontend boundary:

```text
apps/web/src/app/features/player-chess-profile/
  components/
  data-access/
  helpers/
  pages/
  state/
```

- The route page composes the workflow.
- A page-scoped signal store owns filters, request ordering, loading, errors, selected view/dimension, and evidence expansion.
- Typed data access owns `/me/accounts` and `/player-chess-profile` calls.
- Presentational components are HTTP-free and OnPush.
- Pure period and view-model helpers are separately testable.

## Validation

Final implementation-head GitHub Actions run: `30329120052` / CI #1124 — success.

Passed:

- dependency installation;
- API, web, and mobile TypeScript lint;
- complete monorepo production build;
- generated opening-classification audit;
- architecture guardrails;
- PostgreSQL migrations;
- imported-game opening-classification audit;
- complete repository test suite, including new profile helper, store, stale-request, filter, error, no-data, evidence-expansion, and component coverage.

Angular compilation validates templates and accessible names for native controls. CSS was reviewed for desktop and narrow layouts. A real browser session against populated personal data remains the intended hands-on review and was not available in the connector-only execution environment.

## Feedback and correction boundary

The current experience does not let a user edit factual calculations or store rejection/correction feedback. A later target workflow may accept, edit, or reject profile-derived defaults without changing the factual profile. This preserves the RB-013 distinction between descriptive evidence and intentional repertoire persona.

## RB-006 / RB-013 consumption

- RB-006 can define target intent independently from this UI and may later receive profile-derived defaults.
- RB-013 should treat those defaults as optional, editable suggestions.
- Manual target choices must take precedence without mutating profile evidence.
- The disabled repertoire affordance should only become active when a stable target handoff exists.

## Deliberate exclusions

No RB-004 calculation or contract change, tag-severity expansion, Prisma migration, persisted profile, correction storage, builder target setup, course write, LLM narrative, or global navigation redesign was added.

## Integration boundary

RB-005 is stacked on RB-004 because PR #136 remains unmerged. PR #139 must not be merged until RB-004 is accepted and the branch stack is reconciled. Issue #93 remains open during review.
