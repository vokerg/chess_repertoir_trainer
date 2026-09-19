---
name: architecture-review
description: "Use before larger refactors, feature reviews, duplicated-code analysis, boundary checks, repo organization changes, skill/instruction changes, or when the requested implementation is unclear. Produces an inspection-first plan before code edits."
---

# Architecture Review

Use this skill when the task is about design, structure, refactoring, feature boundaries, duplication, or unclear implementation direction.

## Inspection first

Before proposing changes:

* Map the relevant files/modules.
* Identify current data flow.
* Identify ownership boundaries.
* Identify duplicated logic or inconsistent patterns.
* Identify tests/build scripts related to the area.
* Check whether the requested change belongs in frontend, backend, shared domain, or multiple layers.

Do not start editing before understanding the current structure.

## Review output

When reviewing, produce:

* Current structure summary.
* Main problems.
* Recommended target structure.
* Step-by-step implementation plan.
* Risks and validation commands.

## Decision rules

Prefer:

* small feature-local changes;
* clear ownership;
* explicit typed contracts;
* pure helpers for domain logic;
* stores/facades for UI workflows;
* thin API routes and explicit backend services.

Avoid:

* global abstractions created too early;
* deep cross-feature imports;
* duplicated chess/repertoire logic;
* route/page components that own too much workflow;
* backend handlers that mix validation, orchestration, persistence, and domain decisions.

## Before finishing

If code was changed, report:

* files changed;
* validation run;
* warnings or skipped checks;
* remaining risks.
