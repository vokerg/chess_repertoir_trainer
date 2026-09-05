# ONB-010 functional onboarding and Home re-entry implementation report

Date: 2026-09-05

Issue: #195

Pull request: #413

Branch: `onb-010/issue-195-functional-onboarding-home`

Status: review candidate pending final exact-head CI and PR acceptance

## Outcome

ONB-010 implements the first functional Angular onboarding experience and Home re-entry over the existing server-owned onboarding readiness and lifecycle command contracts. The browser does not own workflow advancement, readiness thresholds, progress estimation, or recommendation logic.

The route can be left and revisited without trapping signed-in users. Durable work continues independently of the page, Home consumes the same authoritative readiness projection, and the root imported-game job panel remains available for technical work visibility.

## Delivered implementation

### Route and state ownership

- protected lazy `/onboarding` route without a global onboarding guard;
- typed onboarding readiness and lifecycle-command client;
- route-local `OnboardingStore` that restores server state, delegates mutations, polls only while durable preparation remains active, and rejects stale readiness responses;
- readiness remains usable when account-list discovery fails, with account errors represented independently;
- leave/return behavior is projection-driven rather than browser-session-driven.

### First run and account handoff

- focused Lichess/Chess.com provider and public-username handoff through the canonical Accounts API;
- persisting an account does not implicitly start preparation;
- an existing or newly persisted account is explicitly selected before the dominant `Start preparation` command;
- skip remains available independently of account setup when the server permits it;
- the default recipe is presented in product language as recent three months, standard chess, blitz and rapid, rated and unrated;
- additional accounts are offered only as explicit `ADD_ACCOUNT` expansion and never replace the accepted first run.

The current account service persists provider/username identity but does not expose a separate provider-profile preflight endpoint. ONB-010 therefore does not fabricate ratings, recent activity, or remote-account validation that the canonical account contract does not supply.

### Truthful progress and recovery

- product stages are expressed as finding recent games, preparing opening evidence, and analysing a first sample;
- exact committed/found, provider-window, selected, indexed/opening-prepared, analysed, queued, running, failed, skipped, and remaining counts are displayed from the readiness projection;
- provider-window and fixed-coverage percentages are shown only when the server supplies a fixed denominator;
- there is no weighted overall preparation percentage, elapsed-time progress, ETA, countdown, completion promise, or “almost done” language;
- technical task counts remain progressively disclosed under `Preparation details`;
- rate-limit, stalled reconciliation, checked-empty, paused, cancellation, retry/restart, older-history expansion, and other lifecycle actions are rendered from server-allowed actions with product-facing labels;
- skip guidance and cancel preparation remain distinct operations.

### Progressive value and evidence

- first import/index/analysis milestones are read from persisted server state;
- reveal cards are gated by server-provided reveal records and are absent when no authoritative reveal exists;
- reveal contract includes sample count, evidence state, account scope, title/detail, and canonical destination;
- backend reveal projection fences evidence to the current target account and suppresses zero-sample/unscoped reveal records;
- Home distinguishes pending onboarding, core-ready background continuation, and skipped guidance without re-deriving lifecycle state.

### Home and shell behavior

- before core readiness, Home presents a strong onboarding re-entry while keeping normal Home content usable;
- after core readiness, preparation is represented compactly and deeper analysis can truthfully remain active;
- skipped guidance is never reinterpreted as preparation completion;
- readiness failure fails open so Home remains usable;
- overlapping Home readiness requests are request-fenced so an older response cannot overwrite newer state;
- `/home` and `/onboarding` retain the root imported-game job panel; standalone login does not.

## Interaction handoff

### Component inventory

- `OnboardingPageComponent` — route composition, focused first-run handoff, progress, attention, reveals, expansion, and server actions;
- `OnboardingStore` — projection/state restoration, canonical commands, account selection/handoff, polling, stale-response fencing;
- `OnboardingApiService` — typed readiness and lifecycle HTTP boundary;
- `HomePageComponent` — authoritative onboarding re-entry projection alongside existing Home content;
- root `AppComponent` — unchanged ownership of the imported-game job panel outside the route outlet.

### Copy deck and stage language

Primary product stages:

1. `Ready to prepare`
2. `Finding your recent games`
3. `Preparing opening evidence`
4. `Analysing a first sample`

Lifecycle/attention codes are translated to user-facing action/state labels. Raw worker/task identifiers are not used as the primary onboarding narrative. Technical exact counters remain available as advanced detail.

### Responsive rules

- content max width: 1180px with fluid `clamp()` page padding;
- at 980px, six technical counters collapse to three columns;
- at 820px, headings/target rows stack, progress and reveal grids move to two columns, and account handoff fields become one column;
- at 520px, primary grids and technical counters become one column with compact page padding.

No viewport-specific workflow logic is introduced; responsive behavior is presentation-only.

### Motion and reduced motion

The only onboarding motion is a short reveal-card hover transition, and it is declared exclusively inside `prefers-reduced-motion: no-preference`. There is no timed auto-advance or motion-dependent state transition.

### Focus and keyboard behavior

Native buttons, selects, inputs, summary disclosure, navigation links, server action links, and reveal links remain keyboard-native. `:focus-visible` uses the shared `--ui-focus-outline` token with a visible offset, including the advanced-detail summary.

### Token mapping

The onboarding surface uses the established `--ui-*` token layer (`--ui-canvas-soft`, `--ui-text`, `--ui-text-muted`, `--ui-surface`, `--ui-surface-muted`, `--ui-border`, `--ui-border-strong`, `--ui-action`, `--ui-action-soft`, `--ui-action-strong`, `--ui-focus-outline`, `--ui-shadow-soft`) rather than introducing a parallel theme system.

### Rejected assumptions

The implementation intentionally rejects:

- client-side workflow advancement or duplicated readiness thresholds;
- fake/smoothed/elapsed-time progress;
- weighted overall percentages or public ETA;
- a global route trap or blocking modal train;
- automatic preparation immediately after account persistence;
- requiring a second account before first value;
- client-generated insight/recommendation calculations;
- fabricated provider identity/rating/activity data;
- automatic Repertoire Builder or course mutation;
- replacing the root technical job panel with onboarding-specific job UI.

## Validation

Focused automated coverage includes:

- protected route and return-url behavior;
- store initialization, polling, stale-response ordering, loading ownership, account-list degradation, skip/cancel semantics, older-history expansion, and account handoff/`ADD_ACCOUNT` expansion;
- browser-backed onboarding rendering for rate-limited, stalled, checked-empty, unknown-denominator, fixed-denominator, milestone-stage, reveal-present/reveal-absent, exact technical-counter, and additional-account states;
- Home pending/core-ready/skipped/fail-open projection behavior and stale-response fencing;
- Home/onboarding/global-job-panel shell coexistence;
- API reveal provenance and shared onboarding contract validation.

The CSS and semantic implementation encode desktop/compact/narrow, keyboard-focus, and reduced-motion behavior. Literal assistive-technology smoke operation and final 200% zoom visual craft remain part of VT-302 / #133 final product-wide accessibility/responsive polish; ONB-010 does not claim a manual screen-reader session was executed from this GitHub-connector environment.

A local repository checkout is unavailable in this execution environment because GitHub DNS resolution fails with `Could not resolve host: github.com`. GitHub Actions is therefore the executable build/test authority. The exact final PR head must pass the complete CI workflow before acceptance or squash merge; immutable run/head evidence is recorded on the PR itself.

## Review disposition

The implementation is ready for exact-head CI and adversarial PR review. The task remains `REVIEW`, not `DONE`, until the runtime PR is accepted and squash-merged. Final product-wide visual/accessibility polish remains owned by VT-302 / #133 rather than expanding ONB-010 into a redesign task.
