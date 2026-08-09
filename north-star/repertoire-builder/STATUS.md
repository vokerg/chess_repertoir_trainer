# Repertoire Builder Program Status

Last updated: 2026-08-09

## Current state

**Program state:** the deterministic Repertoire Builder capability chain, static opening-knowledge service, focused Builder knowledge consumer, bounded opening-grounded game-review consumer, RB-025 opening-knowledge coverage scale, and RB-026 Builder Cockpit reintegration are complete in runtime. RB-016 remains independently blocked on sufficient real Builder/course usage and follow-up-game evidence.

**Runtime on `main`:** peer population/level resolution, deterministic opening classification, Player Chess Profile calculation and `/progress/profile`, versioned repertoire targets, profile-derived editable defaults, deterministic candidate evidence/ranking, bounded session/queue semantics, the authenticated Builder workbench, the three-zone Builder Cockpit composition, mandatory course preview/apply, exact existing-course entry points, static side-aware opening knowledge, focused target-side knowledge presentation, deterministic opening-knowledge coverage/editorial tooling, and the optional disabled-by-default generated interpretation prototypes are integrated.

**Opening-knowledge completion:** `OpeningKnowledgeService` contains 160 ordered reviewed rules at version `2026-08-knowledge-v3`. The pinned 3,733-entry / 3,167-name generated opening book resolves to 100% `AVAILABLE`: zero partial/unavailable entries, 100% concise and long descriptions, and 100% independent White/Black summary-plus-plan availability. Every runtime rule is exercised.

**Quality boundary:** 100% means complete strategic-knowledge coverage for the pinned generated opening book, not equal grandmaster-level depth for every obscure line. Major/specific openings retain detailed narrow rules; rare/offbeat families use explicit lower-confidence strategic orientation. Arbitrary opening names outside the pinned book remain `UNAVAILABLE`; no generic fallback was added.

**RB-025 integration:** PR #304 supplied the final 119-family completion layer and hard all-book regression gates, then merged into the #302 integration branch. PR #302 merged to `main` as `997d1ecc0ead422c696ec4460bdb914c47d2d848`; final canonical reconciliation PR #300 squash-merged as `0ae880e8cba60be69caba5aa55c5fb64112b48c1` and closed #290.

**RB-026 integration:** PR #311 reintegrated the selected Builder Cockpit direction and squash-merged to `main` as `fe0a5ada0205e1d2cf0e27017886d8e907ef4ff7`. Final runtime head `42e57a331cb99a2b8a88160bfec16704e1b96b73` passed exact-head CI #2253 (`31275215472`). PR #314 is completion-record reconciliation only; no additional Builder runtime implementation remains in it.

**Execution ownership:** RB-021 / #240 is complete through PR #244. RB-022 / #241 is complete through PR #255. RB-023 / #242 is complete through PR #262. RB-024 / #243 is complete through PR #268. RB-025 / #290 is complete through implementation PRs #302/#304 and reconciliation PR #300. RB-026 / #310 is runtime-complete through PR #311 and in canonical completion review through PR #314. Program tracker: #105.

## Completed capability chain

1. **Evidence foundations:** RB-001, RB-002, RB-003 and RB-018.
2. **Player profile:** RB-004 and RB-005.
3. **Target and decisions:** RB-006, RB-013 and RB-007.
4. **Interaction and lifecycle:** RB-008, RB-009 and RB-010.
5. **Course materialization:** RB-011 and RB-012.
6. **Specialized research and knowledge:** RB-014, RB-017, RB-015, RB-021, RB-022, RB-023, RB-024 and RB-025.
7. **Optional interpretation prototypes:** RB-019 and RB-020, plus RB-024 as a bounded game-review grounding enhancement.
8. **Builder workspace reintegration:** RB-026.

## Active and blocked work

- **RB-026:** runtime work is complete; PR #314 only reconciles the required closure report and canonical task/program/issue state. Issue #310 remains open in `REVIEW` until that reconciliation is approved and squash-merged.
- **RB-016:** independently blocked on real adoption and outcome evidence.

No dependency-satisfied Repertoire Builder implementation task is currently queued.

## Locked boundaries preserved

- Intrinsic classification, static opening knowledge, target-population behavior, player behavior and repertoire intent remain separate concepts.
- Candidate ranking, Builder reducers/queue and course preview/apply remain deterministic authorities.
- Opening knowledge is explanatory and does not alter ranking or course writes.
- Generated interpretation remains optional, explicit, gated and non-authoritative.
- Public opening-assessment theory is assembled from reviewed knowledge and validated structured claims, not free-form provider prose.
- RB-017 remains a research fixture rather than a production traps capability.
- Complete knowledge coverage does not erase explicit unknown/low-confidence classification dimensions.
- Editorial priority scores cannot enter runtime candidate ranking or course materialization.
- RB-026 changes Builder presentation and view-model organization only; it does not create a new recommendation, persistence, or course-write authority.

## Residual risks

- Strategic opening prose can overgeneralize and requires source/revision governance.
- Repository `REVIEWED` lifecycle means validated runtime-eligible project content; it does not imply independent grandmaster review.
- Rare/offbeat families deliberately carry lower-confidence broad guidance and may deserve narrower refinement when real demand appears.
- CI's migrated database has zero imported games, so real imported-game-weighted demand evidence remains unavailable in this environment.
- Opening-book upstream changes can introduce new families; the hard 100% tests will fail until those additions receive explicit knowledge.
- RB-016 outcome claims remain unavailable until real usage evidence exists.
- Authenticated desktop/tablet/mobile visual review of the final RB-026 Cockpit was not completed in the implementation session; that remains deferred product evidence and is not represented as a pass.
- Broader cross-route keyboard, screen-reader, responsive and state-consistency polish remains owned by active VT-302 / #133.

## Queue recommendation

Approve and squash-merge PR #314 to close RB-026's required completion protocol, then close issue #310 as completed. Keep RB-016 blocked until its real-use gate is satisfied. No dependency-satisfied Repertoire Builder implementation task should be inferred merely from numeric order; future Builder work should be opened from concrete product feedback, outcome evidence or a separately approved capability decision.
