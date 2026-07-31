# ONB-010 — Build functional onboarding and Home re-entry

Status: PROPOSED

Priority: P1

Order: 100

Delivery class: Implementation

Planning maturity: Decisioned by ONB-001 and ONB-016; blocked on functional backend lifecycle

GitHub issue: [#195](https://github.com/vokerg/chess_repertoir_trainer/issues/195)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Build the Angular first-run, progress, recovery, reveal, and Home re-entry experience on top of the server-owned onboarding contract without duplicating orchestration, evidence, or recommendation logic in the browser.

The implementation consumes [`../EXPERIENCE_BLUEPRINT.md`](../EXPERIENCE_BLUEPRINT.md) as the functional interaction standard and coordinates final craft with VT-302 / #133.

## Why this task exists

The product needs a usable functional flow after durable lifecycle and commands exist. Home must consume one authoritative preparation projection while direct protected navigation and the technical global job panel remain intact.

The current account Settings surface intentionally exposes many operational controls. First-run onboarding must not compress that surface into a wizard. It should present one dominant decision at a time, begin durable work quickly, expose truthful milestones, and reveal useful personal evidence before the complete analysis tail settles.

## Dependencies

- ONB-008 / #193 disposition/readiness projection.
- ONB-009 / #194 lifecycle commands.
- Functional import/preparation implementations produced from ONB-002 and ONB-003.
- ONB-007 progress and first-value evidence where timing or ETA language is involved.
- ONB-016 / #224 experience blueprint accepted.
- Coordinate implementation base and shared primitives with Visual Transformation #132 and VT-302 / #133.
- Reuse accepted Player Chess Profile, tactical-training, and Repertoire Builder contracts rather than duplicating them.

## In scope

### Functional skeleton

- Protected `/onboarding` route with resumable route-local presentation.
- Typed HTTP data access and feature store.
- Focused provider choice, public username handoff, account confirmation, and explicit default-recipe review.
- Start, skip, pause, resume, cancel, retry, and expansion controls from server-allowed actions.
- Exact stage/count/readiness/warning presentation without fabricated progress or unapproved ETA.
- `/home` full Start/Resume treatment before core readiness and compact preparation card afterward.
- Cross-session/device re-entry through server state.
- Coexistence with the root imported-game job panel.

### Lightweight experience contract

- One dominant action per focused surface; Back, Skip, Leave, and advanced detail are subordinate.
- Dedicated route flow rather than a blocking modal train; dialogs remain bounded confirmations only.
- No first-run onboarding tables or settings-style action clusters.
- Advanced recipe/account controls progressively disclosed and linked to Settings where appropriate.
- Product-language stages such as finding games, preparing openings, and analysing a first sample instead of implementation vocabulary.
- Real persisted milestone updates; percentages only for fixed denominators.
- Meaningful status announcements without live-region noise on every poll.
- Reduced-motion-compatible state transitions and no timed auto-advance.

### Progressive value and reveal

- Import-only recent-game value as soon as it is authoritative.
- At most three evidence-labelled indexed/analysed insight cards in one reveal.
- Reveal eligibility, evidence state, sample, scope, metrics, and destinations supplied by canonical server/feature contracts.
- Optional evidence inspection without duplicating Player Chess Profile or opening-analysis calculations.
- Optional handoff to one eligible personal missed-shot scenario when tactical readiness exists.
- Optional additional-account expansion after first value; the initial accepted run remains one account.
- Optional evidence-anchored Repertoire Builder entry only when the Builder destination contract is production-ready.
- Quiet core-ready transition that explicitly distinguishes usable recent evidence from deeper analysis still continuing.

## Out of scope

- Provider, worker, Prisma, or lifecycle business logic in Angular.
- Client-side batching, workflow advancement, readiness thresholds, statistical calculations, or recommendation ranking.
- Final product-wide visual/accessibility polish owned by VT-302 / #133.
- Native mobile onboarding UI.
- Automated repertoire or course generation/mutation.
- Multi-provider duplicate/identity policy not approved by its owning task.
- Fake, elapsed-time, or arbitrarily weighted overall progress.
- Direct adoption of generated ChatGPT Sites/Figma prototype framework code.

## Acceptance criteria

- Onboarding can be left and resumed from another route, session, or device.
- Signed-in users are not globally trapped behind onboarding.
- Login return URLs and existing protected routes remain valid.
- Home consumes the authoritative onboarding projection instead of independently deriving lifecycle.
- Skip and cancel are visibly and behaviorally distinct.
- Partial and failure states expose deterministic actions.
- Technical child jobs remain available through the global job panel.
- Every focused surface has one visually dominant action and remains understandable without advanced detail.
- First meaningful value can appear before full import/index/analysis completion when its evidence contract permits it.
- Insight cards show sample/scope/evidence state and link to canonical evidence.
- No unsupported insight, puzzle, second-account, or Builder module occupies an empty placeholder.
- Additional accounts are offered as explicit expansion rather than a prerequisite for the first run.
- Core-ready presentation does not imply that deeper requested analysis is complete.
- Progress never advances from elapsed time or browser-local guesses.
- Responsive, keyboard, zoom, reduced-motion, and basic screen-reader behavior are validated, with final polish handed to #133.

## Required validation

### Focused automated coverage

- Angular store/component/router tests.
- Projection-to-presentation-state tests.
- Server-allowed action rendering tests.
- Fixed-denominator progress tests.
- Reveal gating and absence tests.
- Leave/return and stale-response tests.
- Home/job-panel coexistence tests.

### Browser/state matrix

- first-run, active, no-data, partial-import, partial-index, all-index-failed, skipped, core-ready, analysis-continuing, and returning scenarios;
- Lichess and Chess.com account paths;
- invalid/unavailable account;
- first import-only value;
- first indexed reveal;
- analysed reveal;
- tactic ready and no tactic available;
- second-account expansion;
- Builder unavailable and available;
- direct-route and login-returnUrl regressions;
- desktop, compact, narrow, keyboard, reduced motion, 200% zoom, and screen-reader smoke checks.

### Prototype handoff

- Validate against an accepted synthetic-data state prototype or equivalent reviewed interaction specification.
- Record component inventory, copy deck, responsive rules, motion/reduced-motion rules, focus behavior, token mapping, and all rejected generated assumptions.

## Completion

Report: none

Pull request: none

Completed at: none
