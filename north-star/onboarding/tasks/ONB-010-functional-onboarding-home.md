# ONB-010 — Build functional onboarding and Home re-entry

Status: IN_PROGRESS

Priority: P1

Order: 100

Delivery class: Implementation

Planning maturity: Backend lifecycle dependencies are delivered; Angular implementation is in progress on draft PR #413

GitHub issue: [#195](https://github.com/vokerg/chess_repertoir_trainer/issues/195)

Claimed by: ChatGPT / onboarding implementation session

Claim branch: `onb-010/issue-195-functional-onboarding-home`

Claimed at: 2026-09-03

Claim scope: protected Angular onboarding route, typed readiness/command client, route-local server-authoritative store, first-run and lifecycle controls, truthful progress/reveal presentation, Home re-entry, and focused Angular coverage; no provider/worker/Prisma lifecycle ownership, no client-side workflow orchestration or ETA, no mobile UI, and no final VT-302 polish

## Outcome

Build the Angular first-run, progress, recovery, reveal, and Home re-entry experience on top of the server-owned onboarding contract without duplicating orchestration, evidence, progress estimation, or recommendation logic in the browser.

The implementation consumes [`../EXPERIENCE_BLUEPRINT.md`](../EXPERIENCE_BLUEPRINT.md) as the functional interaction standard, the ONB-007 report as the progress/ETA authority, and coordinates final craft with VT-302 / #133.

## Why this task exists

The product needs a usable functional flow after durable lifecycle and commands exist. Home must consume one authoritative preparation projection while direct protected navigation and the technical global job panel remain intact.

The current account Settings surface intentionally exposes many operational controls. First-run onboarding must not compress that surface into a wizard. It should present one dominant decision at a time, begin durable work quickly, expose truthful milestones, and reveal useful personal evidence before the complete analysis tail settles.

## Dependencies

- ONB-008 / #193 disposition/readiness projection.
- ONB-009 / #194 lifecycle commands.
- Functional import/preparation implementations produced from ONB-002 and ONB-003.
- ONB-007 / #154 exact-count, fixed-denominator, no-public-ETA, first-value, rate-limit, and stall policy.
- ONB-016 / #224 experience blueprint accepted.
- Coordinate implementation base and shared primitives with Visual Transformation #132 and VT-302 / #133.
- Reuse accepted Player Chess Profile, tactical-training, and Repertoire Builder contracts rather than duplicating them.

## In scope

### Functional skeleton

- Protected `/onboarding` route with resumable route-local presentation.
- Typed HTTP data access and feature store.
- Focused provider choice, public username handoff, account confirmation, and explicit default-recipe review.
- Start, skip, pause, resume, cancel, retry, and expansion controls from server-allowed actions.
- Exact provider-window, committed-game, selected, indexed, analysed, queued, running, failed, skipped, remaining, readiness, and warning presentation.
- Percentages only where the server supplies a fixed denominator.
- No weighted overall preparation percentage before or after import.
- No public ETA, countdown, expected-completion timestamp, or “almost done” copy in the initial release.
- `/home` full Start/Resume treatment before core readiness and compact preparation card afterward.
- Cross-session/device re-entry through server state.
- Coexistence with the root imported-game job panel.

### Lightweight experience contract

- One dominant action per focused surface; Back, Skip, Leave, and advanced detail are subordinate.
- Dedicated route flow rather than a blocking modal train; dialogs remain bounded confirmations only.
- No first-run onboarding tables or settings-style action clusters.
- Advanced recipe/account controls progressively disclosed and linked to Settings where appropriate.
- Product-language stages such as finding games, preparing openings, and analysing a first sample instead of implementation vocabulary.
- Real persisted milestone updates; percentages only for immutable batches or frozen scopes.
- Before the import denominator is known, use milestone/state language and exact committed counts rather than an overall progress bar.
- Rate-limited/retry-at, checked-empty, stalled, paused, cancelled, and needs-attention states use explicit server codes and deterministic actions.
- Meaningful status announcements without live-region noise on every poll.
- Reduced-motion-compatible state transitions and no timed auto-advance.

### Progressive value and reveal

- Import-only recent-game value as soon as it is authoritative.
- First indexed and first analysed milestones rendered without waiting for the tail.
- At most three evidence-labelled indexed/analysed insight cards in one reveal.
- Reveal eligibility, evidence state, sample, scope, metrics, and destinations supplied by canonical server/feature contracts.
- Optional evidence inspection without duplicating Player Chess Profile or opening-analysis calculations.
- Optional handoff to one eligible personal missed-shot scenario when tactical readiness exists.
- A checked-empty tactic state is valid and must not be held open until a tactic can be fabricated.
- Optional additional-account expansion after first value; the initial accepted run remains one account.
- Optional evidence-anchored Repertoire Builder entry only when the Builder destination contract is production-ready.
- Quiet core-ready transition that explicitly distinguishes usable recent evidence from deeper analysis still continuing.

## Out of scope

- Provider, worker, Prisma, or lifecycle business logic in Angular.
- Client-side batching, workflow advancement, readiness thresholds, statistical calculations, recommendation ranking, or timing estimation.
- Final product-wide visual/accessibility polish owned by VT-302 / #133.
- Native mobile onboarding UI.
- Automated repertoire or course generation/mutation.
- Multi-provider duplicate/identity policy not approved by its owning task.
- Fake, elapsed-time, smoothed, or arbitrarily weighted progress.
- Public ETA until a later server contract meets the ONB-007 telemetry eligibility gates.
- Direct adoption of generated ChatGPT Sites/Figma prototype framework code.

## Acceptance criteria

- Onboarding can be left and resumed from another route, session, or device.
- Signed-in users are not globally trapped behind onboarding.
- Login return URLs and existing protected routes remain valid.
- Home consumes the authoritative onboarding projection instead of independently deriving lifecycle.
- Skip and cancel are visibly and behaviorally distinct.
- Partial, rate-limited, stalled, checked-empty, and failure states expose deterministic actions.
- Technical child jobs remain available through the global job panel.
- Every focused surface has one visually dominant action and remains understandable without advanced detail.
- First meaningful value can appear before full import/index/analysis completion when its evidence contract permits it.
- Insight cards show sample/scope/evidence state and link to canonical evidence.
- No unsupported insight, puzzle, second-account, or Builder module occupies an empty placeholder.
- Additional accounts are offered as explicit expansion rather than a prerequisite for the first run.
- Core-ready presentation does not imply that deeper requested analysis is complete.
- Before import is terminal, no overall percentage is shown.
- Fixed-denominator percentages exactly match server counts and never advance from elapsed time or browser-local guesses.
- No ETA or completion promise is shown in the initial release.
- Responsive, keyboard, zoom, reduced-motion, and basic screen-reader behavior are validated, with final polish handed to #133.

## Required validation

### Focused automated coverage

- Angular store/component/router tests.
- Projection-to-presentation-state tests.
- Server-allowed action rendering tests.
- Unknown-denominator versus fixed-denominator progress tests.
- No-overall-percentage and no-ETA tests.
- Rate-limit/stall/checked-empty rendering tests.
- Reveal gating and absence tests.
- Leave/return and stale-response tests.
- Home/job-panel coexistence tests.

### Browser/state matrix

- first-run, active, no-data, partial-import, unknown-denominator import, fixed-window progress, partial-index, all-index-failed, skipped, core-ready, analysis-continuing, and returning scenarios;
- Lichess and Chess.com account paths;
- invalid/unavailable/rate-limited account;
- first import-only value;
- first indexed reveal;
- first analysed reveal;
- task/reconcile stalled and recovered;
- tactic ready and checked-empty tactic;
- second-account expansion;
- Builder unavailable and available;
- direct-route and login-returnUrl regressions;
- desktop, compact, narrow, keyboard, reduced motion, 200% zoom, and screen-reader smoke checks.

### Prototype handoff

- Validate against an accepted synthetic-data state prototype or equivalent reviewed interaction specification.
- Record component inventory, copy deck, responsive rules, motion/reduced-motion rules, focus behavior, token mapping, and all rejected generated assumptions.

## Completion

Report: none

Pull request: #413 (draft; implementation and validation in progress)

Completed at: none
