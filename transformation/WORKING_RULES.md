# Visual Transformation Working Rules

Last updated: 2026-08-05

These rules apply to ChatGPT, Copilot, Codex, agents, and human contributors working on the visual transformation.

## 1. Start from persistent context

Before proposing, claiming, or implementing transformation work:

1. read root `TRANSFORMATION.md`;
2. read `AGENTS.md`;
3. read the relevant repository skill and architecture documentation;
4. read `MASTER_PLAN.md`, `DECISIONS.md`, and `STATUS.md`;
5. inspect Visual Transformation Program issue #122;
6. inspect the selected execution issue, dependencies, comments, branches, pull requests, and current owning implementation.

Do not rely on prior chat memory, screenshots alone, README files alone, or assumptions about the codebase.

## 2. Source ownership

Repository documents own visual direction, architecture, phase outcomes, decisions, detailed acceptance criteria, integrated history, validation, residual risks, migration records, and reports.

GitHub Issues own the live queue, priority, order, readiness, dependencies, blockers, claim, branch, pull request, and completion state.

Do not duplicate the live queue in `STATUS.md`. Do not move architecture or design authority into issue comments.

## 3. Deterministic task selection

1. Continue the sole active `IN_PROGRESS` execution issue when accepted scope remains.
2. Otherwise consider only open child issues whose body says `Repository state: READY`.
3. Exclude unresolved dependencies and active claims.
4. Choose the highest priority, then the lowest numeric order.
5. Inspect open branches and pull requests for collision before claiming.
6. Do not replace the selected task with a preferred later issue.

Parallel work is allowed only when both issues are ready and a concrete file, decision, branch, and review collision check proves they can proceed independently.

## 4. Claim protocol

Before implementation, add an issue comment containing:

- claimant/session identity;
- exact scope;
- planned branch and `main` target;
- expected files/modules;
- open branch and pull-request collision check;
- explicit exclusions;
- known blockers or validation limitations.

Update the issue body to `IN_PROGRESS`, record the branch, and record the pull request after it opens. Do not claim a blocked issue or begin implementation before the claim is visible.

## 5. Branch and pull-request discipline

- `main` is the only current integration target.
- Never commit transformation work directly to `main`.
- Use short-lived branches created from current `main`.
- Open pull requests against `main`.
- Refresh from current `main` before final review when concurrent integration moved the base.
- Merge only after explicit user approval, using squash merge.
- The former `visual_transformation` branch is retired and must not be used as a base, target, or intermediate integration layer.

## 6. Issue closure and dependency release

Close an execution issue only after:

- its pull request is squash-merged into `main`;
- post-merge repository state is verified;
- required documentation is reconciled;
- validation and residual risks are recorded;
- parent issue state is updated;
- downstream dependencies are re-evaluated.

A merged pull request does not automatically make every downstream issue ready. Reinspect the dependency contract first.

## 7. Preserve product behavior

Unless an issue explicitly requires otherwise, preserve existing URLs, authentication and return URLs, APIs, ownership, filters, pagination, local UI context, durable jobs, status behavior, board mechanics, training behavior, and mobile functionality.

A visual transformation is not permission to rewrite working business logic.

## 8. Follow repository frontend architecture

For Angular work:

- inspect the closest current implementation first;
- use standalone components and `ChangeDetectionStrategy.OnPush`;
- prefer signals and computed state;
- use built-in control flow and stable identity tracking;
- keep route pages focused on composition;
- keep feature state in stores/facades where appropriate;
- keep HTTP calls in typed data-access services;
- keep presentational components free of HTTP and workflow ownership;
- do not create cross-feature deep imports;
- promote shared UI only after multiple compatible consumers prove a feature-agnostic contract.

Existing legacy code may require narrow changes; do not reproduce its structure in new work.

## 9. Design-system discipline

- Use the analytical graphite/mint direction recorded in `DECISIONS.md`.
- Use the locked Node Branch geometry; do not restart identity exploration.
- Use production `--ui-*` roles for transformed UI.
- Keep legacy short tokens as bounded compatibility only; never globally redefine them to the production system.
- Evolve existing page-header, panel, shell-action, context-strip, fact-grid, select-menu, and workbench boundaries before inventing parallel systems.
- Keep feature-specific responsive composition and domain semantics feature-owned.
- Avoid routine glassmorphism, heavy shadows, nested cards, and isolated palettes.
- Preserve visible focus, readable contrast, non-colour status cues, and reduced-motion behavior.

## 10. Dependency discipline

Do not add a UI framework, global state library, animation library, icon package, font package, font files, illustration pipeline, CMS, or backend infrastructure merely to achieve styling or layout available through the existing Angular/CSS stack. Any such dependency requires explicit issue approval and architectural justification.

## 11. Use real product concepts

Public, onboarding, and transformed workflow visuals must be grounded in current capabilities such as imported games, game review, analysis, tactical detections, courses, opening exploration, course gaps, continuation discovery, weak-line training, and progress. Do not invent capabilities or present Labs as established core features.

## 12. Documentation is part of the change

For every meaningful slice:

- update the execution issue throughout the work;
- update `STATUS.md` after integration or meaningful review;
- update `DECISIONS.md` when a decision changes state;
- update `MASTER_PLAN.md` only when scope, architecture, phases, sequence, or target outcomes change;
- add the required report;
- leave unresolved matters and skipped validation explicit.

Do not leave documentation describing an obsolete branch model, stale task order, or superseded implementation state.

## 13. Validation and reporting

Use the narrowest relevant repository checks and report exactly what ran, what was skipped, failures, corrections, warnings, browser evidence, and residual risks.

Significant web implementation slices normally include:

```text
npm run build:web
npm run test --workspace=apps/web
npm run lint
npm run check:architecture
```

Documentation/process-only checkpoints do not require application builds or tests when they change no runtime or configuration files. They still require issue, link, route or queue inventory, changed-file, Markdown, branch, pull-request, and CI-scope validation.

Never represent deferred or unavailable browser review as an observed pass.

## 14. Reviewable delivery

Prefer coherent slices with an approved issue, clear outcome, limited architecture scope, appropriate visual proof, relevant validation, and updated documentation. Do not silently expand into adjacent implementation work.

## 15. Current selection boundary

The repository records VT-301 page-family rollout and authenticated-route classification as complete through `VT_301_ROUTE_INVENTORY_AND_COMPLETION.md`. GitHub issue state remains authoritative for whether the reconciliation is still active or already integrated.

- Continue issue #132 while it remains open and `IN_PROGRESS`.
- Do not select issue #133 while #132 is open or while #133 is `BLOCKED`.
- Select issue #133 only after issue #132 is closed and issue #133 itself says `Repository state: READY`.
- After those states change, select subsequent work from the live queue rather than from a hard-coded branch or task number in this document.
