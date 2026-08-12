# RB-031 Closure — Cockpit Evidence Hierarchy V2

**Task:** RB-031  
**Issue:** #321  
**PR:** #336  
**Branch:** `repertoire-builder/rb-031-cockpit-evidence-v2`  
**Base:** `67f738ad2f40286b245d0fcb2837e81399222bf6`  
**Date:** 2026-08-10

## Delivered

RB-031 keeps the RB-026 three-zone, board-first Cockpit and changes only the hierarchy and wording of existing authoritative Candidate Decision evidence.

- candidate rows foreground engine quality/cost, target-population frequency and position-relative result, Masters frequency/support, factual personal familiarity/results, and meaningful existing-course relationship;
- primary Target/Profile fit chips are removed from normal candidate rows;
- opponent rows retain RB-029 Recommended/Optional preparation priority, editable response selection and computed selected target-population coverage;
- the Decision Brief leads with deterministic ranking/preparation evidence and a concise subset of authoritative reason codes before opening classification and knowledge;
- opening name, character, reviewed knowledge and plans remain secondary explanatory context and do not acquire ranking authority;
- ECO is removed from the normal Builder presentation while remaining available in the underlying evidence contract;
- no ranking, scoring or recommendation model is recreated in Angular;
- manual move entry, engine flow, generated interpretation boundary, RB-009 session/branch actions, queue/defer/ignore/stop, responsive stacking and course preview/apply boundaries are preserved.

## Authority review

The current domain ranking implementation was re-read during PR review. Preset `USER_MOVE` ranking uses objective engine evidence, selected target-population evidence and Masters evidence; personal, target-fit, profile-fit and course components are zero on that empirical preset path. RB-031 therefore presents personal/course data as factual context rather than implying that those facts caused preset ranking.

For `OPPONENT_RESPONSE`, the UI continues to consume RB-029's authoritative reason codes, policy version, recommendation semantics and coverage contributions. The new view-model helpers only format evidence and filter existing deterministic reason codes for presentation.

## Collision review

RB-030 / #320 was active on draft PR #335 during RB-031 final review. At that checkpoint, #335 changed setup, launch, target, profile and Builder page-composition files; RB-031 changed the workbench, its evidence view-model/tests and task/report files. There was no changed-file overlap, and `main` remained at the RB-031 base while the review completed.

RB-030 subsequently passed exact-head CI #2478 and squash-merged through PR #335 as `9bfcf3f5b4337c827719f5ee170bcd5f67b6f3c2`. That later integration does not alter the RB-031 workbench boundary.

## PR review

Two self-review passes were completed against the full PR diff.

1. **Correctness and policy boundary:** verified that the UI does not calculate rank/recommendation, that personal/profile semantics are not promoted into preset ranking authority, that opponent preparation remains RB-029-owned, and that unavailable course state is not promoted into a compact primary chip.
2. **Presentation/regression boundary:** verified ECO removal from normal workbench markup, removal of primary Target/Profile fit chips, preservation of engine/manual/generated/queue/action wiring, and responsive CSS ordering so target-population evidence survives tablet compression, Masters yields first, and compact mobile rows collapse while the full Decision Brief remains available below.

No external PR reviews, review threads or PR comments were outstanding at the time of final review.

## Validation

Exact implementation head `9a410681b5fb9cb9c10d530e76d640b6b7e82451` passed CI run #2483 (`31421699741`) including install, lint, Angular build/template compilation, opening classification and knowledge audits, architecture guardrails, migrations, imported-game audits and the full test step.

The documentation-adjusted final PR head `a7ed94bdad896bc852685ad25de1dc87bee89e8f` then passed exact-head CI #2486 (`31422515093`) before PR #336 was squash-merged to `main` as `e6c024afec1753838dec900181ca4023d6114676`.

Focused view-model tests cover:

- target-population and Masters metric formatting;
- position-relative result copy;
- empirical/preparation reason filtering without Target/Profile primary reasons;
- factual personal familiarity/result presentation;
- meaningful course relationship labels.

### Visual/accessibility evidence

Authenticated populated browser review at representative desktop/tablet/mobile sizes, keyboard interaction and zoom was **not executable in this repository-connector environment because no authenticated application browser/session is available**. This is recorded as skipped evidence rather than claimed as completed visual testing.

Source-level review nevertheless verified:

- the existing desktop three-zone grid and existing 1420/980 responsive stacking remain intact;
- the RB-031 evidence stylesheet is loaded after existing workbench styles and only adjusts candidate evidence columns plus the dominant-reason border;
- at 760px target-population evidence remains visible while Masters is hidden first;
- at 640px existing compact-row rules hide metrics/chips and the RB-031 override collapses the row to rank plus move;
- existing `button`, `summary` and `select` focus-visible rules and interaction handlers are unchanged.

## Scope boundaries

No API, contract, Prisma schema/migration, persistence, queue/job, Builder reducer/session, course-write or LLM-authority change is part of RB-031. RB-030 setup/context work remained separate and is now integrated through PR #335.

## Post-merge disposition

RB-031 is fully integrated. Together with RB-027–RB-030 it completes the defined Builder V2 decision/presentation delivery chain. The remaining Builder issue RB-016 / #104 is not a V2 implementation continuation; it stays blocked until sufficient post-V2 real usage exists for adoption/outcome analysis.
