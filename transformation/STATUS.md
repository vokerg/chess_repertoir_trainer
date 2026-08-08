# Visual Transformation Status

Last updated: 2026-08-08

## Current state

**Repository checkpoint:** VT-301 authenticated page-family rollout and guarded-route classification are complete. VT-302 continues through issue #133 with accessibility foundations and repertoire-detail state consistency integrated; later bounded review slices remain live-issue owned.

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

VT-301 page-family implementation and route inventory are complete in repository records. VT-302 is in progress through live issue #133. Accessibility/responsive foundations and repertoire-authoring detail-state consistency are integrated; functional onboarding, wider state review, authenticated browser/assistive-technology evidence, and final program reconciliation remain open.

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
- `apps/web/src/styles.css` remains the explicit amber-era compatibility layer. It must not be globally redefined or copied into new transformed UI.
- `apps/web/src/workbench.css` and a bounded set of shared analytical/training consumers still reference legacy short roles. Their full consumer set must be migrated together; this is compatibility debt, not an untransformed route family.
- Some global `.library-*` presentation remains while shared line-training surfaces still consume it.
- Direct authenticated browser review was explicitly deferred for several accepted batches. Deferred evidence is not represented as observed validation.
- Cross-route onboarding, empty/loading/error/recovery consistency, keyboard and screen-reader review, contrast, focus, reduced motion, zoom, and representative responsive verification remain VT-302 scope.

## Validation status

Implementation batches passed their recorded exact-head CI runs, including full build, Angular template/type compilation, tests, architecture guardrails, audits, and migrations where applicable. The focused reports and pull requests remain the detailed validation authority for each batch.

The final route reconciliation changes documentation only. It does not change Angular runtime, routes, stores, APIs, contracts, schemas, migrations, dependencies, or application behavior. Documentation-only validation still verifies the literal guard count, route/component mapping, redirect classification, report links, changed-file scope, branch/base state, Markdown structure, issue coordination, and pull-request CI.

A local checkout was not available in the reconciliation runtime because `github.com` DNS resolution failed. No local command is represented as passed.

## Selection disposition

- Issues #123–#132 are complete.
- Issue #133 is the sole active VT-302 execution boundary; its live body and comments own current branch, review, and remaining-scope state.
- Continue only a claimed, collision-checked #133 slice from current `main`; do not infer a branch or completion claim from this status file.

## Open work after VT-301

VT-302 owns coherent onboarding, empty/loading/error/recovery states, accessibility review, responsive polish, reduced-motion and appearance refinement, and final residual-risk disposition. It must build on the integrated system rather than introduce a second identity or reopen completed route-family rollout.

## Session log

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
