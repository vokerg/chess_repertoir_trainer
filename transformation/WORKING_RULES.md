# Visual Transformation Working Rules

Last updated: 2026-07-27

These rules apply to ChatGPT, Copilot, Codex, agents, and human contributors working on the visual transformation.

## 1. Start from persistent context

Before proposing, claiming, or implementing transformation work:

1. read root `TRANSFORMATION.md`;
2. read `AGENTS.md`;
3. read the relevant repository skill and architecture documentation;
4. read `MASTER_PLAN.md`, `DECISIONS.md`, and `STATUS.md`;
5. open [Visual Transformation Program issue #122](https://github.com/vokerg/chess_repertoir_trainer/issues/122);
6. inspect the selected execution issue, dependencies, comments, branches, pull requests, and current owning implementation.

Do not rely on prior chat memory, screenshots alone, the README alone, or assumptions about the codebase.

## 2. Source ownership

Repository documents own:

- visual direction and identity;
- architecture and phase outcomes;
- locked, provisional, rejected, and open decisions;
- detailed acceptance criteria and explicit exclusions;
- integrated checkpoint history;
- migration records, validation evidence, residual risks, and reports.

GitHub Issues own:

- the live execution queue;
- priority and numeric order;
- `READY`, `BLOCKED`, and `IN_PROGRESS` state;
- dependencies and active blockers;
- task claim and owner;
- implementation branch and pull request;
- completion state.

Do not duplicate the live queue in `STATUS.md`. Do not move architectural or design authority into issue comments.

## 3. Deterministic task selection

Select the next task only from open child issues linked by issue #122.

Apply this algorithm:

1. consider only issues whose body says `Repository state: READY`;
2. exclude issues with unresolved dependencies;
3. exclude issues with an active claim that has not been released or superseded;
4. choose the highest priority: P0, then P1, P2, P3;
5. within the same priority, choose the lowest numeric `Order`;
6. inspect current branches and open PRs for collision before claiming;
7. do not replace the selected task with a personally preferred later issue.

Parallel work is allowed only when both issues are `READY` and a concrete file, decision, branch, and review collision check shows they can proceed independently.

## 4. Claim protocol

Before implementation, add an issue comment containing:

- claimant/session identity;
- exact scope for this claim;
- planned branch;
- planned target branch;
- planned pull request state;
- files/modules expected to change;
- open branches and pull requests checked for collision;
- explicit exclusions;
- known blockers or validation limitations.

Then update the issue body to `Repository state: IN_PROGRESS`, record the implementation branch, and record the PR when opened.

Do not claim a blocked issue. Do not create implementation code before the claim is visible.

## 5. Branch and pull-request discipline

- `visual_transformation` is the long-running integration branch.
- Do not commit transformation work directly to `main`.
- Every implementation slice and meaningful documentation checkpoint uses a short-lived branch created from the current `visual_transformation` head.
- Use the branch recorded in the issue unless a collision forces a documented revision.
- Open the PR against `visual_transformation`.
- Keep the issue updated with PR number, validation, blockers, and review state.
- Merge only after explicit approval.
- Use squash merge into `visual_transformation`.
- Do not open a transformation PR to `main` until explicitly requested.
- Never merge to `main` without explicit user approval.

## 6. Issue closure and dependency release

Close an execution issue only after:

- its PR is squash-merged into `visual_transformation`;
- post-merge repository state is verified;
- required documentation is reconciled;
- validation and residual risks are recorded;
- the parent issue checklist is updated;
- directly dependent issues are reviewed and changed from `BLOCKED` to `READY` only when all dependencies are actually complete.

A merged PR does not automatically make every downstream issue ready. Reinspect the dependency contract first.

## 7. No implementation without an approved issue

The master plan is not an instruction to implement everything. Work only on a claimed `READY` issue or an explicitly approved documentation checkpoint.

Do not silently expand scope because adjacent work seems convenient. Create or update an issue when a newly discovered task has independent acceptance criteria or sequencing consequences.

## 8. Preserve product behavior

Unless an issue explicitly requires otherwise, preserve:

- existing URLs;
- authentication and return-URL behavior;
- API contracts;
- ownership behavior;
- filters and pagination;
- selected rows and local UI context;
- job/status behavior;
- board and training behavior;
- mobile functionality.

A visual transformation is not permission to rewrite working business logic.

## 9. Follow repository frontend architecture

For Angular work:

- inspect the closest current implementation first;
- use standalone components and `ChangeDetectionStrategy.OnPush`;
- prefer signals and computed state;
- use built-in `@if`, `@for`, and `@switch` control flow;
- track entities by stable identity;
- keep route pages focused on composition;
- keep feature state in feature stores/facades where appropriate;
- keep HTTP calls in typed data-access services;
- keep presentational components free of HTTP and workflow ownership;
- do not create cross-feature deep imports;
- use shared UI only for genuinely feature-agnostic, proven patterns.

Existing legacy code may require narrow changes; do not reproduce legacy structure in new work.

## 10. Design-system discipline

- Use the analytical graphite/mint direction recorded in `DECISIONS.md`.
- Use the locked Node Branch geometry; do not restart logo exploration.
- Use controlled SVG geometry and live HTML wordmark text.
- Use global tokens for shared semantic roles only after their owning issue is integrated.
- Keep feature-specific CSS colocated with the feature.
- Evolve existing shared page-header, panel, button, and shell primitives before inventing parallel systems.
- Avoid routine glassmorphism, heavy shadows, nested cards, and isolated hard-coded palettes.
- Preserve visible keyboard focus and accessible contrast.
- Test dense analytical pages, not only marketing compositions.

## 11. Dependency discipline

Do not add a dependency merely to achieve styling, layout, or motion available through the existing Angular/CSS stack.

Explicit justification and issue approval are required before adding:

- a UI framework or design-system library;
- a global state library;
- an animation library;
- a custom icon package;
- a font package or font files;
- an illustration pipeline;
- a CMS;
- new backend infrastructure.

## 12. Use real product concepts

Public, onboarding, and transformed workflow visuals must be grounded in current capabilities such as imported games, game review, analysis, tactical detections, courses, opening exploration, course gaps, continuation discovery, weak-line training, and progress.

Do not invent capabilities or present Labs as established core features without explicit positioning.

## 13. Documentation is part of the change

For every meaningful slice:

- update the execution issue throughout the work;
- update `STATUS.md` after integration or meaningful review;
- update `DECISIONS.md` when a decision changes state;
- update `MASTER_PLAN.md` only when scope, architecture, phases, sequence, or target outcomes change;
- add the required report;
- add a dated session-log entry;
- leave unresolved matters and skipped validation explicit.

Do not leave documentation describing an older integrated state.

## 14. Validation and reporting

Use the narrowest relevant repository checks. Significant web slices normally include:

```text
npm run build:web
npm run test --workspace=apps/web
npm run lint
npm run check:architecture
```

Run broader checks when a change crosses workspace or architecture boundaries.

Report exactly:

- commands run;
- commands skipped and why;
- failures and corrections;
- warnings;
- visual/responsive checks performed;
- residual risks.

Documentation/process-only checkpoints do not require application build or test execution when they change no runtime or configuration files. They still require issue, link, queue, changed-file, Markdown, branch, PR, and CI-scope validation.

## 15. Reviewable delivery

Prefer coherent slices over enormous rewrites. A useful slice has:

- an explicitly approved and claimed issue;
- a clear before/after outcome;
- limited architectural scope;
- screenshots or visual proof where relevant;
- tests and validation appropriate to the change;
- updated issue state and transformation documentation.

## 16. Current stop condition

Phase 1D is integrated through PR #120. The active approved checkpoint is VT-000 on `visual-transformation/vt-000-issue-driven-queue`.

Stop after:

- program issue #122 and execution issues #123–#133 exist;
- priorities, order, readiness, dependencies, branches, scope, acceptance criteria, exclusions, and validation are explicit;
- Phase 1D is reconciled as integrated;
- D-022 locks the hybrid documentation/issues model;
- `TRANSFORMATION.md`, `STATUS.md`, and these rules point to the live issue queue;
- the VT-000 report and reviewed process-only PR are complete.

Do not implement #123, #124, or later issues on the VT-000 branch. Do not modify Angular, CSS, routes, dependencies, APIs, schemas, databases, or backend behavior in this checkpoint.