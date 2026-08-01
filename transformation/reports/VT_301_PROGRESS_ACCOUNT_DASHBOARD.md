# VT-301 Progress Account Dashboard

Date: 2026-07-31

Issue: #132

Pull request: #196

Branch: `visual-transformation/vt-301-remaining-page-rollout`

Target: `main`

Disposition: implementation refreshed onto current `main`; exact-head repository CI and approval disposition required before merge

## Objective

Modernize `/progress` and `/progress/accounts/:accountId` using the production visual system while preserving account selection, statistics loading, rating filters, chart behavior, API ownership, and stale-response protection.

## Scope

- replace the page-local account metadata definition list with the proven `app-fact-grid` presentation contract;
- group Rating stats and Yearly highs into a responsive metric hierarchy;
- migrate account summary, rating cards, annual-high evidence, period-performance evidence, rating controls, loading overlays, tooltips, and chart chrome to production `--ui-*` roles;
- use semantic action, text, surface, border, focus, danger, typography, radius, and shadow roles;
- retain the established 980px workbench collapse and 640px compact breakpoints;
- use the production monospaced stack for numeric evidence where appropriate.

## Behavior preserved

- `/progress` default-account routing and fallback behavior;
- `/progress/accounts/:accountId` route and account switching;
- account, rating-statistics, performance-statistics, and rating-history API calls;
- rating range and speed filters;
- loading, error, empty, and populated states;
- request-id stale-response guards;
- chart series and domain-specific rating semantics;
- existing account and statistics component contracts.

## Architecture boundary

No new dependency, service, store, API, schema, route, chart library, or global presentation primitive is introduced. The page continues to compose standalone OnPush components and uses the existing shared `app-page-header`, `app-panel`, and `app-fact-grid` contracts.

## Refresh disposition

The original implementation branch was based on an earlier `main` and had diverged after unrelated rollout work landed. The implementation has been rebuilt from current `main` using the previously validated runtime blobs. Stale edits to the global Angular migration ledger were deliberately dropped; live rollout state remains owned by issue #132 and `transformation/STATUS.md`.

## Self-review disposition

A fresh diff review identified two issues in the refreshed implementation.

### Responsive composition

The persistent 240px desktop navigation rail could leave the new side-by-side metrics row substantially narrower than the viewport breakpoint implied, while Rating Stats still forced three fixed columns. Milestone rows could therefore overflow at tablet and small-desktop widths.

The branch now:

- stacks both the account overview and metrics composition at the established 980px workbench threshold;
- uses width-aware `auto-fit` rating cards with a bounded 210px minimum instead of a viewport-only three-column assumption;
- retains horizontal scrolling for the deliberately tabular yearly-highs evidence.

### Small-label contrast

Several newly migrated labels used `--ui-text-subtle` on muted or quiet surfaces. That role is too restrained for small normal text in these contexts. The changed account-switcher label, performance headings, yearly-highs headers, and chart axis/date labels now use `--ui-text-muted` or `--ui-text` according to their surface.

The existing shared `app-fact-grid` label treatment is unchanged because that contract predates this batch and belongs in the program-wide VT-302 accessibility review rather than a feature-local override.

No additional blocking issue was found in the changed TypeScript, template bindings, shared-component contracts, loading/error/empty-state preservation, focus treatment, or chart semantics. Route, data, filtering, and chart behavior remain unchanged. Direct browser validation remains necessary because connector-based review cannot observe actual rendered dimensions, text wrapping, contrast under platform rendering, or pointer interaction.

## Validation

- original implementation head CI #1480 passed the complete repository workflow;
- refreshed pre-review head CI #1733 passed lint, production build and Angular compilation, audits, architecture guardrails, migrations, and the full test suite;
- exact-head repository CI after the self-review fixes is required before approval;
- direct browser review remains required unless the user explicitly records a deferral;
- browser coverage should include account unavailable, populated and empty statistics, multiple accounts, rating range/speed changes, loading/error overlays, keyboard focus, widths immediately above and below 980px, 760px and 640px layouts, and mobile-navigation clearance.

## Explicit exclusions

- no Player Chess Profile or Settings change;
- no onboarding or default-account behavior change;
- no API, schema, database, route, filter, job, persistence, or ownership change;
- no chart-library or dependency change;
- no merge without explicit approval.
