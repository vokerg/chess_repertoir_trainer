# RB-031 Progress — Cockpit Evidence Hierarchy V2

**Task:** RB-031  
**Issue:** #321  
**Branch:** `repertoire-builder/rb-031-cockpit-evidence-v2`  
**Base:** `67f738ad2f40286b245d0fcb2837e81399222bf6`  
**Date:** 2026-08-10

## Initial implementation slice

The first RB-031 slice keeps the RB-026 three-zone Cockpit and changes only how existing authoritative Candidate Decision evidence is presented.

- candidate rows foreground engine quality, target-population frequency/position-relative result, Masters frequency/position-relative result, factual personal evidence, and meaningful existing-course relationship;
- primary Target/Profile fit chips are removed from the normal candidate row;
- opponent rows retain RB-029 Recommended/Optional and selected-coverage behavior;
- the Decision Brief leads with deterministic ranking/preparation evidence and dominant existing reason codes before opening classification/knowledge;
- opening name, character, reviewed knowledge and plans remain secondary explanatory context;
- ECO is removed from the normal Builder surface while the underlying contract remains unchanged;
- no ranking/scoring/recommendation logic is added to Angular;
- manual move, engine, queue, defer/ignore/stop, generated interpretation, Builder reducer/session, and course preview/apply boundaries are unchanged.

## Collision boundary

RB-030 / #320 is concurrently active on draft PR #335. This slice deliberately does not change Builder setup, launch helpers, target construction, profile launch, or page-composition files. RB-031 can reconcile any final setup/context copy only after #335 is integrated.

## Validation plan

- focused view-model tests for corpus metrics, dominant reason filtering, personal evidence and course relationship;
- Angular lint/build/template compilation through repository CI;
- source review proving no normal Cockpit ECO/primary target-profile fit presentation remains;
- preserve responsive hierarchy: target population remains visible at tablet width, Masters yields first, compact rows collapse to rank/move while the full Decision Brief remains stacked below;
- authenticated populated browser review at representative desktop/tablet/mobile widths, keyboard and zoom when available; unavailable browser evidence must be recorded as skipped rather than claimed.
