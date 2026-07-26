# Visual Transformation Working Rules

Last updated: 2026-07-26

These rules apply to ChatGPT, Copilot, Codex, and human contributors working on the visual transformation.

## 1. Start from the persistent context

Before proposing or implementing transformation work:

1. Read root `TRANSFORMATION.md`.
2. Read `AGENTS.md`.
3. Read the relevant repository skill and architecture documentation.
4. Read `MASTER_PLAN.md`, `DECISIONS.md`, and `STATUS.md`.
5. Inspect the current repository implementation for the feature being changed.

Do not rely on prior chat memory, screenshots alone, the README alone, or assumptions about the codebase.

## 2. Branch discipline

- `visual_transformation` is the long-running integration branch for this program.
- Do not commit transformation work directly to `main`.
- Every implementation slice and every meaningful documentation checkpoint must use a short-lived branch created from `visual_transformation`.
- Merge the short-lived branch back through a reviewed pull request only after explicit approval.
- Use squash merge for transformation pull requests into `visual_transformation`.
- Do not open a transformation PR to `main` until explicitly requested.
- Never merge to `main` without explicit user approval.

## 3. No implementation without an approved checkpoint

Production transformation work has begun in narrow reviewed slices. The public landing page and authentication shell are integrated, but their completion does not approve the remaining master plan.

Do not infer that the entire master plan is an instruction to implement everything. Work only on the next explicitly approved checkpoint.

When the user approves a slice, keep it narrow and record its scope in `STATUS.md` before or with the change.

## 4. Preserve product behavior

Unless a change explicitly requires otherwise, preserve:

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

## 5. Follow repository frontend architecture

For Angular work:

- use standalone components;
- use `ChangeDetectionStrategy.OnPush`;
- prefer signals and computed state;
- use built-in `@if`, `@for`, and `@switch` control flow;
- track entities by stable identity;
- keep route pages focused on composition;
- keep feature state in feature stores/facades where appropriate;
- keep HTTP calls in typed data-access services;
- keep presentational components free of HTTP and workflow ownership;
- do not create cross-feature deep imports;
- use shared UI only for genuinely feature-agnostic patterns.

Existing legacy code may require narrow changes; do not reproduce legacy structure in new work.

## 6. Design-system discipline

- Use the analytical direction recorded in `DECISIONS.md`.
- Use the Node Branch concept; do not restart broad logo exploration unless the user explicitly reopens it.
- Use controlled SVG geometry for identity assets.
- Use live HTML text for the wordmark.
- Use global tokens for shared semantic roles.
- Keep feature-specific CSS colocated with the feature.
- Evolve `app-page-header`, `app-panel`, buttons, and shell primitives before inventing parallel systems.
- Avoid routine glassmorphism, heavy shadows, nested cards, and isolated hard-coded palettes.
- Preserve visible keyboard focus and accessible contrast.
- Test dense analytical pages, not only marketing compositions.

## 7. Dependency discipline

Do not add a dependency merely to achieve styling or layout that can be implemented with the existing Angular/CSS stack.

Explicit justification is required before adding:

- a UI framework;
- a design-system library;
- a global state library;
- an animation library;
- a custom icon package;
- a font package or font files;
- an illustration pipeline;
- a CMS;
- new backend infrastructure.

## 8. Use real product concepts

Public and onboarding visuals should be grounded in actual application capabilities:

- imported games;
- game review and analysis;
- tactical detections;
- courses and chapters;
- opening exploration;
- course gaps and continuation discovery;
- weak-line training;
- progress.

Do not invent capabilities or present experimental Labs as established core product features without explicit positioning.

## 9. Documentation is part of the change

For every meaningful slice:

- update `STATUS.md`;
- update `DECISIONS.md` when a decision changes state;
- update `MASTER_PLAN.md` when scope, sequence, or architecture changes;
- add a dated session-log entry;
- leave unresolved matters clearly marked as open.

Do not leave the documentation describing an older plan after the implementation changes.

## 10. Validation and reporting

Use the narrowest relevant repository checks. For significant web slices, expected checks normally include:

```text
npm run build:web
npm run test --workspace=apps/web
npm run lint
```

Run broader checks when the change crosses workspace or architecture boundaries.

Report exactly:

- commands run;
- commands skipped;
- failures;
- warnings;
- visual/responsive checks performed;
- residual risks.

Documentation-only setup does not require application build or test execution, but this must be stated.

## 11. Reviewable delivery

Prefer coherent slices over one enormous unreviewable rewrite.

A useful slice should have:

- an explicit user-approved goal;
- a clear before/after outcome;
- limited architectural scope;
- screenshots or visual proof where relevant;
- tests or validation appropriate to the change;
- updated transformation documentation.

## 12. Current stop condition

The Phase 0A public landing page and Phase 0B authentication shell are squash-merged into `visual_transformation`. The current approved slice is documentation reconciliation only.

Stop after the checkpoint-closure documentation and its pull request. Do not begin signed-in `/home` production implementation, navigation-rail implementation, production brand-asset extraction, global token migration, or authenticated workflow redesign without explicit approval.

The next recommended product checkpoint is a separate Phase 0C signed-in `/home` discovery and visualization slice. Authentication browser and Clerk interaction validation remains an explicit residual gap and must not be represented as completed until it is recorded.