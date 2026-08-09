# Visual Transformation Status

Last updated: 2026-08-09

## Current state

**Repository checkpoint:** VT-301 authenticated page-family rollout and guarded-route classification are complete. VT-302 continues through issue #133. Opening Analysis evidence-workbench refinement, the bounded workbench visual-semantic compatibility cleanup, the shared loading/empty/error presentation foundation, and the Lines/Library presentation decoupling are integrated. The current review slice applies the shared async-state accessibility semantics to Course Review errors and long-running loading states without changing review behavior; it does not complete VT-302.

**Integration target:** `main`

**Former integration branch:** `visual_transformation` is retired for new work.

**Live execution authority:** [Visual Transformation Program issue #122](https://github.com/vokerg/chess_repertoir_trainer/issues/122) and its child issues.

Repository documents record integrated outcomes and completion evidence. GitHub Issues record whether the final reconciliation is still in review, merged, or closed. Do not infer live branch or pull-request state from this file.

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

VT-301 page-family implementation and route inventory are complete in repository records. VT-302 is in progress through live issue #133. Accessibility/responsive foundations, repertoire-authoring detail-state consistency, Opening Analysis evidence-workbench refinement, the workbench visual-semantic compatibility cleanup, the shared async-state foundation from PR #313, and the Lines/Library presentation decoupling from PR #315 are integrated. The current review slice extends the shared async-state semantics to Course Review. Functional onboarding, wider state/recovery review, authenticated browser/assistive-technology evidence, remaining compatibility disposition, and final program reconciliation remain open.

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

The inspected `apps/web/src/app/app.routes.ts` defines:

- 34 URL entries guarded by `authGuard`;
- 29 unique guarded route components after collapsing shared session routes;
- three unguarded compatibility redirects into guarded destinations: `/settings`, `/accounts`, and `/accounts/:accountId`.

Every guarded route component maps to an integrated Phase 1, Phase 2, or VT-301 implementation record. No guarded route family remains unclassified or requires another page-family rollout batch.

The exact inventory, owning route component, integration evidence, redirects, and residual debt are recorded in [`reports/VT_301_ROUTE_INVENTORY_AND_COMPLETION.md`](./reports/VT_301_ROUTE_INVENTORY_AND_COMPLETION.md).

## Accepted residual debt

Completion of route-family rollout does not mean all legacy CSS is removed or all browser evidence exists.

- Home retains its calibrated local `--home-*` role aliases. Their values match the approved graphite/mint direction, but the namespace predates the production `--ui-*` contract.
- `apps/web/src/styles.css` remains the explicit amber-era compatibility layer for known remaining consumers and the established `--space-*` scale. It must not be globally redefined or copied into new transformed visual presentation.
- The former `apps/web/src/workbench.css` visual-semantic debt is resolved through integrated PR #309 together with the remaining Repertoire Builder workbench/setup/explanation surfaces. The shared spacing scale remains intentionally unchanged.
- Global `.library-*` presentation remains a bounded Study/library compatibility layer, but Lines no longer consumes it after integrated PR #315. Removing or relocating that Library-owned block requires its own complete consumer inspection.
- Direct authenticated browser review was explicitly deferred for several accepted batches. Deferred evidence is not represented as observed validation.
- Cross-route onboarding and broader empty/loading/partial/error/recovery/retry consistency remain VT-302 scope. PR #313 addresses only the first bounded shared loading/empty/error presentation contract for Courses and Accounts; the current Course Review slice extends that proven presentation contract to one additional workflow without claiming an all-route migration.
- Keyboard and screen-reader review, contrast, focus, reduced motion, zoom, and representative responsive verification remain VT-302 scope where direct evidence is still missing.

## Validation status

Implementation batches passed their recorded exact-head CI runs, including full build, Angular template/type compilation, tests, architecture guardrails, audits, and migrations where applicable. The focused reports and pull requests remain the detailed validation authority for each batch.

The VT-302 workbench compatibility slice passed final CI #2250 on PR #309 head `24070675ab30f1589ad489b3927449f2f9c88428` and is integrated as squash commit `7e519b3a07f2df36b0ead5d4136b6ebdc8d5687d`.

The VT-302 shared async-state presentation slice passed final CI #2272 on PR #313 head `efce9cb652b4d052fc6afe456a5861868e0ce9a1` and is integrated as squash commit `0571b387c601907ada1e901833d36560dbdf135b`.

The VT-302 Lines/Library compatibility slice passed exact-head CI #2285 on PR #315 head `0e0074855c01b4619cc4b433293c4ab3b77ea613` and is integrated as squash commit `3e1f9d373fb85f946e29677e4f4445deaba643d3`.

For the current Course Review async-status slice, the accessibility guard requires the shared assertive error message and both shared polite loading messages. The reviewed six-file head `c676e9420b03fc4ccd4c0897ea88e4dc2c42297b` passed exact-head CI #2295, including lint, full build, architecture guardrails, migrations, audits, and the complete test step. A final pre-merge self-review found no runtime, state-ownership, diff-scope, review-thread, or branch-freshness defect; it found only stale validation wording in this status/report, corrected as a documentation-only reconciliation. The pull-request head must remain green before merge. Local checkout-based commands remain unavailable because the execution runner cannot resolve `github.com`, so no local build/test result is claimed. Direct authenticated browser or assistive-technology review is also not claimed unless separately observed and recorded.

## Selection disposition

- Issues #123–#132 are complete.
- Issue #133 is the sole active VT-302 execution boundary; its live body and comments own current branch, review, and remaining-scope state.
- Continue only a claimed, collision-checked #133 slice from current `main`; do not infer a branch or completion claim from this status file.

## Open work after VT-301

VT-302 owns coherent onboarding, broader empty/loading/partial/error/recovery/retry consistency, accessibility review, responsive polish, reduced-motion and appearance refinement, and final residual-risk disposition. It must build on the integrated system rather than introduce a second identity or reopen completed route-family rollout.

## Session log

### 2026-08-09 — VT-302 Course Review async-status accessibility slice

- Continued the claimed Course Review slice from issue #133 and refreshed `visual-transformation/vt-302-course-review-status-semantics` onto current `main` `85688c392f937b67007d5404b9b088c99f259d69`, preserving integrated PR #315 and the later disjoint landing-copy correction.
- Re-inspected `AGENTS.md`, the Angular frontend skill, Angular architecture/patterns, transformation entry point and working rules, the shared `StateMessageComponent`, the Course Review page/store, current issue state, pull-request collisions, and the complete PR diff.
- Replaced only the store-owned Course Review error and the two no-result-yet loading paragraphs with the integrated shared `app-state-message`; no store, API, filter, result, conflict, route, backend, contract, schema, persistence, layout, or motion behavior changed.
- Added an accessibility-contract regression guard requiring the assertive shared error announcement and both polite loading announcements while preventing those exact states from regressing to local non-announcing status paragraphs.
- Added [`reports/VT_302_COURSE_REVIEW_STATUS_SEMANTICS.md`](./reports/VT_302_COURSE_REVIEW_STATUS_SEMANTICS.md) with scope, ownership, validation limits, and residual VT-302 work.
- Review round 1 verified the store transitions and shared live-region contract and found no runtime defect. Exact-head CI #2288 passed the initial four-file review head.
- Review round 2 found a delivery-process defect: this status record had not been updated for the meaningful review and issue #133 did not yet record the opened pull request, contrary to the transformation working rules. The documentation/issue bookkeeping was corrected before the slice was treated as review-complete.
- Required-doc review found that the Angular migration ledger would otherwise remain stale after Course Review became another `app-state-message` consumer; the ledger and focused report were reconciled while `docs/frontend/design-tokens.md` remained intentionally unchanged because no token contract changed.
- The reviewed six-file head `c676e9420b03fc4ccd4c0897ea88e4dc2c42297b` passed exact-head CI #2295. The final pre-merge self-review found no runtime/state/diff/review-thread defect and only corrected stale validation wording in this status/report; the resulting documentation-only head requires green PR CI before merge.
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
