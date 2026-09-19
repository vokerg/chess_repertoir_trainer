# VT-204 Proven Shared UI Primitives Completion

Date: 2026-07-29

Issue: #130

Implementation pull request: #188

Squash commit: `ba45e1a0f1c300a3793cbf6e8d43dd6b5f40e616`

## Disposition

VT-204 is complete and integrated into `main`.

The user explicitly approved integration on 2026-07-29 without performing the direct browser regression checklist. Browser feedback is intentionally deferred for a later consolidated review rather than represented as observed validation.

## Delivered

- promoted `app-context-strip` into `shared/ui` after compatible read-only context use was proven by Study and Opening Analysis;
- promoted `app-fact-grid` into `shared/ui` after compatible semantic fact use was proven by Games responsive cards and Study line health;
- retained feature-owned source signals, DTOs, formatting, status derivation, commands, navigation, selection, and workflow state;
- retained the existing `app-page-header`, `app-panel`, and shell-action contracts rather than introducing another shell, card, or action abstraction;
- removed duplicated context and fact markup/styles from the four migrated consumers;
- added focused shared-component tests and retained affected consumer coverage;
- documented the shared contracts in Angular architecture, implementation patterns, migration guidance, design-token guidance, D-026, and the VT-204 implementation report.

## Preserved boundaries

- Games filter presentation, responsive-card hierarchy, result states, durable job state, pagination, review navigation, and row actions remain feature-owned;
- Study numbered workflow headers, training-plan scope/mode controls, asymmetric basket facts, mobile launcher, selection, eligibility, and marathon navigation remain feature-owned;
- Opening Analysis workbench slots, evidence ordering, analytical toggle state, board/engine behavior, position navigation, filters, and feature-scoped legacy-role bridge remain feature-owned;
- shared components contain no feature imports, router, HTTP, store access, workflow command, or output event;
- no backend, API, contract, schema, database, route, engine, training, imported-game job, mobile-navigation, or dependency change was included.

## Validation

CI #1425 passed the complete repository workflow on the implementation head.

CI #1432 passed the same complete workflow on the exact documentation head.

Both covered dependency installation, lint, full repository build and Angular template/type compilation, both opening audits, architecture guardrails, migrations, and the complete test suite, including the new shared-component and affected consumer tests.

## Deferred browser feedback

The unperformed regression checklist remains useful for the later consolidated feedback pass:

### Games

- responsive cards retain Control, Accuracy, Analysis, and Index facts;
- two-column tablet and one-column compact layouts;
- long control/status values and active job states;
- unchanged desktop table, actions, focus, and reduced-motion behavior.

### Study

- selection context retains repertoire, section, and selected-line meaning;
- context markers, long labels, and compact layout;
- line-health facts retain Coverage, Mastery, Weak, and Untrained values;
- selected/highlighted rows and independent checkbox, row-selection, Train, and Edit intents.

### Opening Analysis

- segmented context retains line, perspective, game-evidence, and visible-tool meaning;
- dynamic updates after perspective, filter, move, and widget-toggle changes;
- desktop, 980px two-column, and 640px one-column layouts;
- unchanged shared workbench, board, engine, evidence stacks, focus, and reduced-motion behavior.

These items are deferred product-review evidence, not blockers to the completed integration.
