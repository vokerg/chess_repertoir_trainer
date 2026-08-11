# VT-302 source closeout audit

Date: 2026-08-11
Issue: #133
Branch: `visual-transformation/vt-302-source-closeout-audit`
Implementation-start base: `main` `67f738ad2f40286b245d0fcb2837e81399222bf6`
Refreshed review base: `main` `d8e096b068d3c1aaccb934af61396d5a6da86c55`

## Objective

Drive VT-302 to the end of the work that can be verified from repository source and automated checks without inventing onboarding behavior or claiming manual browser/assistive-technology evidence that was not observed.

This slice focuses on three residuals after the integrated Home-token cleanup in PR #332:

1. classify the current guarded route registry after later Onboarding work added `/admin`;
2. standardize remaining route-level generic asynchronous states on the already-proven `app-state-message` contract;
3. prove and remove the remaining obsolete global `.library-*` presentation compatibility block.

It does not implement the pending Onboarding lifecycle/UI sequence and does not claim authenticated visual or assistive-technology observation.

## Route checkpoint

The historical VT-301 completion report remains correct for the route registry that existed when VT-301 completed: 34 guarded URL entries and 29 unique guarded route components.

Current `apps/web/src/app/app.routes.ts` contains 35 guarded URL entries and 30 unique guarded route components because the Onboarding program later added:

- `/admin` → `AdminDiagnosticsPageComponent`.

The Admin route is already built on the transformed signed-in shell and exposes explicit `idle`, `loading`, `forbidden`, `unavailable`, and `ready` states. Loading uses polite status semantics; access failures are assertive alerts with retry. This later route is therefore classified under the current VT-302 contract and does not require reopening the historical VT-301 rollout.

No current guarded route component is left unclassified by this source audit.

## Generic route-state audit

The shared `StateMessageComponent` already owns the bounded generic `loading | empty | error` presentation contract:

- loading → `role="status"`, polite live region;
- error → `role="alert"`, assertive live region;
- empty → static non-live content.

Before this slice, Courses and Accounts consumed the complete generic boundary and Course Review consumed the shared loading/error semantics. Study scope/line components, Lichess settings, Line Editor, Home, and Admin also already had explicit state semantics through their existing feature-owned presentation.

A source scan for route-level generic loading/error presentation followed by direct inspection of each hit found eight guarded route surfaces still using visually styled local status paragraphs or local empty presentation for generic asynchronous route state:

- Progress Entry;
- Account Detail;
- Game Review;
- Free Analysis;
- focused line training;
- marathon training;
- Opening Struggles;
- Player Chess Profile.

Those route-level states now reuse `app-state-message`:

- Progress Entry: loading + error;
- Account Detail: account-list/account load errors + primary account loading;
- Game Review: game/AI errors + primary game loading;
- Free Analysis: route error + imported-game loading;
- focused line training: loading, terminal unavailable/empty recovery, and in-session error;
- marathon training: loading, terminal unavailable recovery, and in-session error;
- Opening Struggles: loading + error + generic initial/no-results empty outcomes;
- Player Chess Profile: account/profile errors + calculation loading + generic no-data/unavailable empty outcomes.

No store, API, route, filter, board, engine, training-session, navigation, persistence, or command ownership moved into `shared/ui`. Informational notes, partial-data warnings, training feedback, engine messages, workflow progress, and domain-specific evidence remain feature-owned.

The accessibility-contract script guards this exact migrated route set so the generic state semantics cannot silently regress while preserving the feature-owned notice boundary.

### Training-shell self-review corrections

The first review round found two state-consistency defects that were hidden by the old local presentation:

- Focused line training sets `loading=false` after an initialization failure while `sessionId` remains `0`. The old route therefore fell through to the normal workbench and could render an empty training session beneath an error. The route now renders a terminal `Training unavailable` panel with assertive error semantics and a Library recovery link whenever no session was established; in-session errors still render alongside an active session.
- Marathon training keeps `loaded=false` after initialization failure. The old fallback therefore rendered `Loading marathon training...` together with the error. The route now makes terminal error and loading branches mutually exclusive and provides the existing back-link recovery action on failure.

The same review also caught that replacing the marathon error paragraph initially dropped the structural `.marathon-error` grid-order class. The class is now carried by `app-state-message`, preserving desktop and compact ordering. Retired local `status-note`/`status-error` style blocks in focused training, marathon training, and Account Detail were removed after their last local consumers disappeared.

## Library compatibility proof

Earlier VT-302 work removed `.library-*` presentation usage from Lines but intentionally kept the global block until the complete Study/library consumer boundary was inspected.

The current Study route is feature-local:

- `LibraryBrowserPageComponent` composes `study-browser`, `study-*` scope/list/basket presentation;
- Study scope and line child components own external feature-local styles;
- repository searches for current `class="library-..."` presentation found no runtime consumer;
- representative former selectors including `library-row`, `library-column`, `library-status-pill`, `library-actions`, and `library-button-link` resolved only to the global compatibility block and historical documentation, not a live Angular consumer.

The remaining `.library-*` block in `apps/web/src/styles.css` was therefore orphaned presentation CSS and has been removed. The unrelated `.detail-grid` responsive rule that shared the same tail section remains intact.

Architecture guardrails now reject the retired `library-*` presentation namespace in:

- global `apps/web/src/styles.css`;
- all Angular HTML/CSS under `apps/web/src/app/`.

Current Study remains feature-local; the existing global short visual-token and `--space-*` compatibility layer is not removed or redefined by this slice.

## Compatibility disposition after this slice

Source-verified VT-302 presentation compatibility cleanup now covers:

- workbench visual-semantic roles → production `--ui-*` roles;
- Lines → no `.library-*` presentation coupling;
- Home → no local `--home-*` token namespace;
- global/Angular presentation → no retired `.library-*` class namespace.

Accepted compatibility that remains is narrower:

- `apps/web/src/styles.css` still owns short legacy visual roles required by known remaining compatibility consumers and the established `--space-*` scale;
- feature-local chess/chart/evaluation colours remain feature-owned where they express domain semantics rather than a shared UI role.

This audit does not authorize a global short-token search/replace.

## Main refresh and collision review

The slice began from integrated Home-cleanup head `67f738ad2f40286b245d0fcb2837e81399222bf6`. During review, `main` advanced by two commits to `d8e096b068d3c1aaccb934af61396d5a6da86c55`, including cleanup PR #338 and a new repository-hygiene CI gate.

The intervening `main` changes do not touch any of this slice's 25 files. The branch was therefore rebuilt as one commit on the current `main` tree rather than merged, preserving all new contract/hygiene changes underneath the unchanged closeout patch. The refreshed compare is one commit ahead, zero behind.

## Remaining VT-302 blockers

### Functional onboarding

The dedicated Onboarding program still owns the lifecycle/UI path required for coherent first-run and returning-user guidance. At this audit checkpoint:

- ONB-008 / #193 is `PROPOSED`;
- ONB-009 / #194 is `PROPOSED`;
- ONB-010 / #195 is `PROPOSED` and owns the Angular onboarding state/re-entry experience.

VT-302 must not invent a competing onboarding lifecycle or duplicate those contracts. Functional onboarding acceptance therefore remains externally dependent on that program.

### Manual authenticated evidence

Source review and automated checks cannot honestly prove the remaining observational acceptance items:

- authenticated browser traversal;
- screen-reader behavior;
- keyboard traversal across complete live workflows;
- browser zoom/reflow;
- contrast-tool observation of rendered combinations;
- representative desktop/tablet/compact/narrow-phone rendering;
- the small Home elevation normalization from PR #332.

These remain unobserved evidence unless a later session actually performs and records them. Deferred or unavailable observation must not be represented as a pass.

## Validation

The execution runner still cannot resolve `github.com` for a local checkout (`Could not resolve host: github.com`), so GitHub Actions is the validation authority. Before this slice can be treated as review-ready, its exact refreshed head must pass the repository CI workflow, including lint/template compilation, production build, opening audits, architecture guardrails, the repository-hygiene guard, migrations/imported-game audits, and the complete test step.

The architecture guard specifically validates that the retired Library presentation namespace cannot return. The accessibility contract validates the shared state-message semantics and the exact eight newly migrated route-state consumers.

No authenticated browser, screen-reader, zoom, contrast-tool, or representative-device pass is claimed by this report.

## Closeout disposition

This slice is intended to eliminate the remaining **source-verifiable** generic route-state and documented Library-presentation compatibility gaps while reconciling the current 35-route/30-component registry.

If exact-head CI and review are clean, the remaining barriers to closing issue #133 should be explicit rather than hidden source debt: functional onboarding owned by the Onboarding program, manual authenticated accessibility/responsive evidence, and final post-merge transformation reconciliation/approval.

Issue #133 must remain open until those remaining acceptance boundaries are either completed or explicitly dispositioned through the normal transformation review process.