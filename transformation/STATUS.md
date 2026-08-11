# Visual Transformation Status

Last updated: 2026-08-11

## Current state

**Repository checkpoint:** VT-301 authenticated page-family rollout and guarded-route classification are complete. VT-302 source-verifiable closeout is integrated through PR #337 / squash commit `11b22206173000fa29f3f9526eec926901c8808c`. The current route registry is classified at 35 guarded URLs / 30 guarded components, the remaining audited route-level generic async states use the shared `app-state-message` contract, the Home-local `--home-*` namespace is retired, and the obsolete global `.library-*` presentation namespace is removed with regression guards. Exact implementation head `ed1be6e064490e84746b425db5c5c1b69c60791e` passed CI #2537 (`31457402173`).

**Integration target:** `main`

**Former integration branch:** `visual_transformation` is retired for new work.

**Live execution authority:** [Visual Transformation Program issue #122](https://github.com/vokerg/chess_repertoir_trainer/issues/122) and its child issues.

Repository documents record integrated outcomes and completion evidence. GitHub Issues record whether remaining acceptance is active, blocked, in review, merged, or closed. Do not infer live branch or pull-request state from this file.

Issue #133 remains open, but ordinary source-verifiable implementation is exhausted at this checkpoint. Its remaining acceptance boundary is blocker-bound: functional onboarding is owned by ONB-008/#193, ONB-009/#194 and ONB-010/#195, while authenticated browser/screen-reader/keyboard/zoom/reflow/rendered-contrast/representative-device evidence remains unobserved in the repository-connector environment.

All transformation work uses short-lived branches, pull requests to `main`, explicit approval, and squash merge.

## Phase disposition

### Phase 0 — identity and visual proof

Core identity, public landing, authentication, and proof work is integrated. Unreproduced browser permutations remain documented risks rather than observed passes.

### Phase 1 — shell and entry points

Complete. The signed-in Home, Node Branch identity, production `--ui-*` token and typography contract, desktop rail, final mobile-primary navigation, and evidence-bounded browser disposition are integrated.

### Phase 2 — representative workflows

Complete through:

- VT-201 Games — PR #167 and reconciliation PR #176;
- VT-202 Study — PR #178 and reconciliation PR #180;
- VT-203 Opening Analysis — PR #183 and reconciliation PR #185;
- VT-204 proven shared primitives — PR #188 and reconciliation PR #190;
- VT-205 final mobile-primary navigation — PR #191 and reconciliation PR #192.

VT-204 promoted only `app-context-strip` and `app-fact-grid`. D-027 later locked `app-select-menu`. Feature-specific workflow composition, responsive hierarchy, state, and commands remain feature-owned.

### Phase 3 — rollout and polish

VT-301 page-family implementation and historical route inventory are complete. VT-302 source-verifiable implementation is complete through PR #337: accessibility/responsive foundations, repertoire-authoring detail-state consistency, Opening Analysis evidence-workbench refinement, workbench visual-semantic cleanup, shared async-state presentation, Lines/Library decoupling, Course Review async-status semantics, Home token cleanup, current 35/30 route classification, final audited route-state migration, and removal of the orphaned global Library presentation namespace are integrated.

Phase 3 is not closed as fully observed product evidence. Functional onboarding remains externally dependent on the Onboarding program, and authenticated browser/assistive-technology/zoom/reflow/contrast/representative-device evidence is still unobserved. Those items must be completed or explicitly dispositioned before issue #133/program closure; they must not be represented as source implementation work.

## VT-301 integrated batches

- [x] Batch 1 — Progress account dashboard, PR #196.
- [x] Batch 2 — Player Chess Profile, PR #206.
- [x] Batch 3 — Settings routes, PR #209, squash commit `875f9e65d5a28d1df310a3ec4c621b566b6ad6cc`; exact-head CI #2050 passed.
- [x] Batch 4a — marathon and focused line training, PR #211; reconciliation PR #212.
- [x] Batch 4b — Courses and Course Review, PR #215; reconciliation PR #217.
- [x] Batches 4c/4d — repertoire authoring, line editing, Lichess puzzles, and tactical scenarios, PR #221; reconciliation PR #229.
- [x] Batch 5 — shared single-choice filter menu, commit `a30303ffb9e59de4f4a99e1be936e4624ba13b63`.
- [x] Batch 6 — analytical workbench consumers, Game Review, Free Analysis, Opening Analysis evidence, and Opening Struggles, PR #235; reconciliation PR #236.
- [x] Batch 7a — Lab discovery, Top Opponents, Monthly Games, and Training Log, PR #252.
- [x] Batch 7b — Performance by Rating, PR #269.
- [x] Batch 7c — Tactical Detections, PR #277.

## Authenticated-route inventory result

The historical VT-301 completion report remains correct for the registry that existed at completion:

- 34 URL entries guarded by `authGuard`;
- 29 unique guarded route components after collapsing shared session routes;
- three unguarded compatibility redirects into guarded destinations: `/settings`, `/accounts`, and `/accounts/:accountId`.

The current registry contains 35 guarded URL entries and 30 unique guarded components because `/admin` → `AdminDiagnosticsPageComponent` was added later by the Onboarding program. PR #337 audited and classified that current route, and no current guarded route component remains unclassified.

The historical exact inventory, owning route component, integration evidence, redirects, and residual debt are recorded in [`reports/VT_301_ROUTE_INVENTORY_AND_COMPLETION.md`](./reports/VT_301_ROUTE_INVENTORY_AND_COMPLETION.md). The current 35/30 checkpoint is recorded in [`reports/VT_302_SOURCE_CLOSEOUT_AUDIT.md`](./reports/VT_302_SOURCE_CLOSEOUT_AUDIT.md).

## Accepted residual debt

Completion of source-verifiable transformation work does not mean all manual product evidence exists or all short compatibility roles should be deleted.

- Home no longer retains a local `--home-*` presentation namespace; PR #332 migrated the complete audited consumer boundary to production `--ui-*` roles.
- `apps/web/src/styles.css` still owns the explicitly retained short legacy visual roles required by known compatibility consumers and the established `--space-*` scale. They must not be globally redefined or copied into new transformed presentation without complete-consumer evidence.
- The former `apps/web/src/workbench.css` visual-semantic debt is resolved through integrated PR #309 together with the remaining Repertoire Builder workbench/setup/explanation surfaces. The shared spacing scale remains intentionally unchanged.
- The global `.library-*` presentation namespace is removed through PR #337 after a complete current Study/Angular consumer audit proved it orphaned. Architecture guardrails reject its reintroduction in global and Angular presentation.
- Route-level generic async-state migration is source-complete for the audited remaining surfaces through PR #337. Informational notes, partial-data warnings, workflow progress, engine/training feedback, and domain-specific evidence intentionally remain feature-owned.
- Direct authenticated browser review was explicitly deferred or unavailable for multiple accepted batches. Deferred evidence is not represented as observed validation.
- Functional onboarding remains owned by the Onboarding program; VT-302 must not invent a parallel lifecycle or Home re-entry flow while ONB-008/009/010 remain unresolved.
- Keyboard and screen-reader review, rendered contrast, zoom/reflow, and representative responsive verification remain unobserved where direct authenticated evidence is unavailable.

## Validation status

Implementation batches passed their recorded exact-head CI runs, including full build, Angular template/type compilation, tests, architecture guardrails, audits, and migrations where applicable. The focused reports and pull requests remain the detailed validation authority for each batch.

The VT-302 workbench compatibility slice passed final CI #2250 on PR #309 head `24070675ab30f1589ad489b3927449f2f9c88428` and is integrated as squash commit `7e519b3a07f2df36b0ead5d4136b6ebdc8d5687d`.

The VT-302 shared async-state presentation slice passed final CI #2272 on PR #313 head `efce9cb652b4d052fc6afe456a5861868e0ce9a1` and is integrated as squash commit `0571b387c601907ada1e901833d36560dbdf135b`.

The VT-302 Lines/Library compatibility slice passed exact-head CI #2285 on PR #315 head `0e0074855c01b4619cc4b433293c4ab3b77ea613` and is integrated as squash commit `3e1f9d373fb85f946e29677e4f4445deaba643d3`.

The VT-302 Course Review async-status accessibility slice passed exact-head CI #2298 (`31320653117`) on final PR #316 head `9650aaa573dbe80f1c911e895e5795285bd1d8d4`. Lint, full build, architecture guardrails, database migrations, all audits, and the complete test step succeeded. PR #316 is integrated as squash commit `050f9c80a11f08498089ca6bcd1834c60e6ba700`.

The VT-302 Home-token cleanup slice passed exact-head CI #2469 on PR #332 head `2d9044e97213ea323b88ed9e02756100266b1c25` and is integrated as squash commit `67f738ad2f40286b245d0fcb2837e81399222bf6`.

The VT-302 source-closeout audit passed exact-head CI #2537 (`31457402173`) on PR #337 head `ed1be6e064490e84746b425db5c5c1b69c60791e`. The repository workflow completed successfully across lint/template compilation, production build, opening audits, architecture guardrails, repository hygiene, migrations/imported-game audits, and the complete test step. PR #337 is integrated as squash commit `11b22206173000fa29f3f9526eec926901c8808c`.

Local checkout-based commands and authenticated browser/assistive-technology/device observation are not claimed by the source-closeout report where the execution environment did not provide them.

## Selection disposition

- Issues #123–#132 are complete.
- Issue #133 remains open, but no ordinary source-verifiable VT-302 implementation slice is justified by the audited residuals after PR #337.
- Functional onboarding remains externally owned by ONB-008/#193, ONB-009/#194 and ONB-010/#195; authenticated browser/AT/device evidence remains a manual observation boundary.
- Do not keep #133 artificially `IN_PROGRESS` by inventing source changes. Its live issue state should record the blocker/review disposition until those acceptance boundaries change.
- If new concrete source defects are found, re-open executable VT-302 scope explicitly before claiming a branch.
- The historical `visual-transformation/vt-302-onboarding-accessibility-polish` branch is stale/diverged from current `main` and is not a valid task base or source of current implementation truth.

## Open work after source closeout

VT-302 has no identified ordinary source implementation residual at this checkpoint. Remaining acceptance is limited to functional onboarding from the dedicated Onboarding program, authenticated manual accessibility/responsive/contrast evidence, and final program-level disposition once those dependencies are satisfied or explicitly accepted as residual risk.

## Session log

### 2026-08-11 — VT-302 source-verifiable closeout integration and reconciliation

- Continued the sole active issue #133 after the Home-token cleanup and audited the current 35 guarded URL / 30 component route registry rather than reopening the historical VT-301 34/29 checkpoint.
- Migrated the final audited route-level generic loading/error/empty states across Progress Entry, Account Detail, Game Review, Free Analysis, focused and marathon training, Opening Struggles, and Player Chess Profile to the proven `app-state-message` contract while preserving feature-owned workflow state and actions.
- Self-review found and fixed focused-training initialization fallthrough, marathon simultaneous loading/error presentation, and lost marathon grid ordering before final review.
- Proved the global `.library-*` presentation namespace had no live Angular consumer, removed the orphaned block, and extended architecture guardrails so the retired namespace cannot return.
- Preserved the global short visual-role/`--space-*` compatibility layer because the source audit did not prove a safe global removal boundary.
- Exact implementation head `ed1be6e064490e84746b425db5c5c1b69c60791e` passed CI #2537 (`31457402173`) and PR #337 was squash-merged as `11b22206173000fa29f3f9526eec926901c8808c`.
- Post-merge verification confirmed `main` at that integration point before this documentation reconciliation was claimed.
- Functional onboarding remains owned by proposed ONB-008/#193, ONB-009/#194 and ONB-010/#195. Authenticated browser, screen-reader, keyboard, zoom/reflow, rendered contrast and representative-device evidence remains unobserved and is not claimed.
- No further ordinary source-verifiable VT-302 slice is identified; issue #133 must remain open or blocked until those remaining acceptance boundaries are completed or explicitly dispositioned.

### 2026-08-09 — VT-302 Course Review async-status accessibility slice

- Continued the claimed Course Review slice from issue #133 and refreshed `visual-transformation/vt-302-course-review-status-semantics` onto current `main` `85688c392f937b67007d5404b9b088c99f259d69`, preserving integrated PR #315 and the later disjoint landing-copy correction.
- Re-inspected `AGENTS.md`, the Angular frontend skill, Angular architecture/patterns, transformation entry point and working rules, the shared `StateMessageComponent`, the Course Review page/store, current issue state, pull-request collisions, and the complete PR diff.
- Replaced only the store-owned Course Review error and the two no-result-yet loading paragraphs with the integrated shared `app-state-message`; no store, API, filter, result, conflict, route, backend, contract, schema, persistence, layout, or motion behavior changed.
- Added an accessibility-contract regression guard requiring the assertive shared error announcement and both polite loading announcements while preventing those exact states from regressing to local non-announcing status paragraphs.
- Added [`reports/VT_302_COURSE_REVIEW_STATUS_SEMANTICS.md`](./reports/VT_302_COURSE_REVIEW_STATUS_SEMANTICS.md) with scope, ownership, validation limits, and residual VT-302 work.
- Review round 1 verified the store transitions and shared live-region contract and found no runtime defect. Exact-head CI #2288 passed the initial four-file review head.
- Review round 2 found a delivery-process defect: this status record had not been updated for the meaningful review and issue #133 did not yet record the opened pull request, contrary to the transformation working rules. The documentation/issue bookkeeping was corrected before the slice was treated as review-complete.
- Required-doc review found that the Angular migration ledger would otherwise remain stale after Course Review became another `app-state-message` consumer; the ledger and focused report were reconciled while `docs/frontend/design-tokens.md` remained intentionally unchanged because no token contract changed.
- The reviewed six-file head `c676e9420b03fc4ccd4c0897ea88e4dc2c42297b` passed exact-head CI #2295. A final pre-merge review then found stale canonical validation wording; it was corrected, one unrelated punctuation drift from the large status rewrite was removed, and final head `9650aaa573dbe80f1c911e895e5795285bd1d8d4` passed exact-head CI #2298.
- PR #316 was squash-merged as `050f9c80a11f08498089ca6bcd1834c60e6ba700`; post-merge verification confirmed `main` at that commit. GitHub briefly auto-closed #133 during merge, and the issue was reopened because this slice is explicitly partial VT-302 work.
- Post-merge documentation reconciliation is tracked by PR #323. It aligns `TRANSFORMATION.md`, this status record, the focused report, and parent issue #122 with the integrated state and explicitly excludes the stale/diverged historical broad VT-302 branch. No runtime change is part of that reconciliation.
- Direct authenticated browser or screen-reader evidence remains unobserved and is not claimed. This partial slice does not complete VT-302 or close issue #133.

### 2026-08-09 — VT-302 line-training / Library presentation compatibility slice

- Continued issue #133 from current `main` `0571b387c601907ada1e901833d36560dbdf135b` after PR #313 integrated the shared state-message foundation.
- Inspected the recorded `.library-*` compatibility debt, global Library presentation, current Lines training templates, the existing Lines status-panel action pattern, production design-system overrides, open pull requests and the parallel Course Review VT-302 claim.
- Repository search found the `library-button-link` definition plus exactly two non-Library template consumers: `line-training-session.component.html` with two link instances and `training-marathon-page.component.html` with one fallback link instance.
- Replaced all three training link instances with the already-established `compact-action secondary` contract used elsewhere in Lines; router targets, labels, conditions and training commands are unchanged.
- Added an architecture guard across all Lines `.html` and `.css` files so Library-owned `library-*` presentation classes cannot be reintroduced through another Lines component.
- Kept the global `.library-*` block in `styles.css` intact because this slice proves only the non-Library consumer boundary, not that every Study/library consumer is ready for relocation.
- Recorded the implementation and residual boundary in [`reports/VT_302_TRAINING_LIBRARY_COMPATIBILITY.md`](./reports/VT_302_TRAINING_LIBRARY_COMPATIBILITY.md), the Angular migration ledger and the design-token documentation.
- Coordinated with the parallel `visual-transformation/vt-302-course-review-status-semantics` claim: runtime files are disjoint and `STATUS.md` is the only anticipated documentation overlap to recheck before final review.
- No training store/API/session behavior, Library redesign, route, backend, schema, new shared component or ONB-010 behavior is part of this slice. It does not complete VT-302 or close issue #133.

### 2026-08-09 — VT-302 shared async-state presentation slice

- Continued issue #133 from `main` `fe0a5ada0205e1d2cf0e27017886d8e907ef4ff7` after verifying no open pull-request collision and after the disjoint RB-026 Builder Cockpit merge advanced `main`.
- Inspected the dedicated Onboarding and data-lifecycle program before selection. Functional onboarding remains separately owned there, while Visual Transformation explicitly retains visual, empty-state, responsive, and accessibility polish ownership.
- Verified that current `shared/ui` had no common loading/empty/error primitive while Courses and Accounts independently rendered all three generic async states.
- Added standalone OnPush `app-state-message` with bounded `loading | empty | error` tones, production `--ui-*` presentation, polite loading status semantics, static non-live empty content, and assertive error semantics.
- Migrated only Courses and Accounts while preserving feature-store ownership; self-review additionally made the Accounts empty message conditional on no active load error so failed initial loads do not also claim that no accounts are configured.
- Self-review removed `aria-busy="true"` from the loading live region because the transient status never transitions that attribute to false; focused tests and the accessibility guard now require the loading announcement to remain unsuppressed.
- During self-review, `main` advanced through disjoint ONB-023 completion reconciliation; the corrected branch was refreshed onto `57a864a6b7424174aac538f29ee793ce8754992e` with those onboarding records preserved.
- Removed the migrated Accounts-local empty/error CSS and added focused component tests plus accessibility-contract regression checks for both consumers.
- Recorded the boundary and residual work in [`reports/VT_302_SHARED_STATE_PRESENTATION.md`](./reports/VT_302_SHARED_STATE_PRESENTATION.md) and the Angular migration ledger.
- Explicitly excluded the stale divergent historical `visual-transformation/vt-302-onboarding-accessibility-polish` branch, RB-026 Builder files, ONB-010 functional onboarding behavior, APIs, stores, routes, schemas, persistence, Home aliases, `.library-*`, and broad all-route migration.
- Local checkout remains unavailable because the runner cannot resolve `github.com`; GitHub Actions on PR #313 is the validation authority. This partial slice does not complete VT-302 or close issue #133.

### 2026-08-08 — VT-302 workbench visual-token compatibility slice

- Continued issue #133 after PR #308 integrated and verified that no other Visual Transformation execution issue superseded the active VT-302 boundary.
- Audited the documented compatibility debt, `apps/web/src/workbench.css`, the shared analysis/line-editor usage boundary, Repertoire Builder workbench presentation, production token definitions, and open pull-request collisions.
- Migrated `workbench.css` plus the Repertoire Builder workbench, setup dialog, and candidate-explanation presentation from legacy amber-era visual-semantic names to production `--ui-*` roles without changing the existing shared `--space-*` scale.
- Replaced unresolved Builder aliases such as `--surface-2`, `--surface-3`, `--on-accent`, and `--shadow-lg` with defined production roles and standardized explicit focus treatment on `--ui-focus-outline`.
- Added an architecture guard that rejects reintroduction of the bounded legacy visual-token names in the migrated files.
- Exact-head CI #2242 passed on the initial implementation head. After `main` advanced through a disjoint Repertoire Builder documentation commit, the branch was rebuilt on `main` `0ae880e8cba60be69caba5aa55c5fb64112b48c1`; the resulting comparison remained five runtime/guard files ahead and zero commits behind before documentation reconciliation.
- Added the bounded implementation and residual-risk report at [`reports/VT_302_WORKBENCH_TOKEN_COMPATIBILITY.md`](./reports/VT_302_WORKBENCH_TOKEN_COMPATIBILITY.md).
- No route, API, store, schema, board, engine, persistence, dependency, Home alias, or `.library-*` change is part of this slice. It does not complete VT-302 or close issue #133.

### 2026-08-08 — VT-302 Opening Analysis evidence workbench review slice

- Claimed a bounded issue #133 continuation from `main` `22f40016499d7491a82e3ebd64f18f6afe1171bb` after checking the live issue, comments, open pull requests, and complete workbench/Stockfish consumer boundary.
- Refreshed the completed slice without conflict through current `main` `07d19790a20beedf79bb094fead2c48c76404912` after Builder inheritance PR #306 and the administrator diagnostics UI PR #307 landed in disjoint files.
- Replaced four independent optional-evidence toggles with one typed, lazy, keyboard-accessible Position evidence tab set while keeping personal Next moves first and My openings below it.
- Removed the redundant context strip and retained one compact current-line toolbar by extending the established copyable-line boundary with an optional segmented rewind mode.
- Kept Engine visible by default and retained its header toggle, evaluation bar, arrow, and lines. Opening Analysis alone opts into first-move Stockfish-row selection; all other consumers keep the original non-interactive contract.
- Preserved production typography and `--ui-*` roles; no navigation, API, backend, schema, filter, Challenge Bot, or unrelated workflow behavior changed.
- Added the bounded implementation and residual-risk record at [`reports/VT_302_OPENING_ANALYSIS_EVIDENCE_WORKBENCH.md`](./reports/VT_302_OPENING_ANALYSIS_EVIDENCE_WORKBENCH.md).
- Focused Angular coverage, the complete 436-test web suite, the production web build, lint, architecture checks, and diff checks pass. Direct authenticated visual review is not claimed because the available in-app browser has no signed-in local session.

### 2026-08-05 — VT-301 authenticated-route inventory reconciliation

- Claimed the remaining issue #132 checkpoint from `main` `fa5f477bab5cf50d3c94a8d911d4e0dd0d6605c3`.
- Inspected the exact Angular route registry, the VT-301 report directory and focused line-training report, current status/migration records, representative live route components, shared Lab wrappers, Home presentation, Game Detail/workbench composition, token ownership, and open pull requests.
- Counted 34 guarded URL entries and 29 unique guarded route components; all map to integrated route-family work.
- Recorded three unguarded compatibility redirects that lead into guarded destinations without treating them as independent page families.
- Found no orphaned guarded route family and no active pull-request collision with the documentation branch.
- Identified the remaining debt as Home token aliases, legacy global/workbench compatibility roles, training globals, deferred browser evidence, and VT-302 cross-route polish.
- Corrected stale program entry points that still named VT-104 or VT-103-era work as current.
- Added the final VT-301 route-inventory/completion report. The previously referenced draft `VT_301_REMAINING_PAGE_INVENTORY.md` is not present on the inspected `main`; the final report supersedes that historical reference.
- Preserved all runtime behavior and kept downstream selection dependent on live issue state rather than branch-specific repository wording.

### Earlier integrated checkpoints

The detailed implementation and validation history remains in the reports directory and the associated pull requests. Key integrated pull requests include #78, #79, #87, #88, #112, #120, #137, #158, #162, #167, #178, #183, #188, #191, #196, #206, #209, #211, #215, #221, #235, #252, #269, and #277, plus their recorded reconciliation pull requests.