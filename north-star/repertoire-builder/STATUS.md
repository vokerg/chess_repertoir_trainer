# Repertoire Builder Program Status

Last updated: 2026-08-07

## Current state

**Program state:** the deterministic Repertoire Builder capability chain, static opening-knowledge service, focused Builder knowledge consumer and bounded opening-grounded game-review consumer are complete. RB-025 has reached 100% strategic-knowledge coverage of the pinned generated opening book and is in review through stacked PRs #302 and #304. RB-016 remains independently blocked on sufficient real Builder/course usage and follow-up-game evidence.

**Runtime on `main`:** peer population/level resolution, deterministic opening classification, Player Chess Profile calculation and `/progress/profile`, versioned repertoire targets, profile-derived editable defaults, deterministic candidate evidence/ranking, bounded session/queue semantics, the authenticated Builder workbench, mandatory course preview/apply, exact existing-course entry points, static side-aware opening knowledge, focused target-side knowledge presentation, and the optional disabled-by-default generated interpretation prototypes are integrated. The RB-025 completion remains review-only until its PRs merge.

**Opening-knowledge review head:** `OpeningKnowledgeService` contains 160 ordered reviewed rules at version `2026-08-knowledge-v3`. The pinned 3,733-entry / 3,167-name generated opening book resolves to 100% `AVAILABLE`: zero partial/unavailable entries, 100% concise and long descriptions, and 100% independent White/Black summary-plus-plan availability. Every runtime rule is exercised.

**Quality boundary:** 100% means complete strategic-knowledge coverage for the pinned generated opening book, not equal grandmaster-level depth for every obscure line. Major/specific openings retain detailed narrow rules; rare/offbeat families use explicit lower-confidence strategic orientation. Arbitrary opening names outside the pinned book remain `UNAVAILABLE`; no generic fallback was added.

**RB-025 review:** PR #302 supplies coverage/audit/editorial infrastructure and the first 16-rule runtime expansion. PR #304 is stacked on #302 and supplies the remaining 119-family completion layer plus hard all-book regression gates. PR #302 exact-head CI #2192 passed. PR #304 implementation head `6acbcbe08797e059ca9d31b281de0425935c8e55` passed CI #2208 with 3,733/3,733 generated entries and 3,167/3,167 unique names available.

**Execution ownership:** RB-021 / #240 is complete through PR #244. RB-022 / #241 is complete through PR #255. RB-023 / #242 is complete through PR #262. RB-024 / #243 is complete through PR #268. RB-025 / #290 is in review through PRs #302/#304. Program tracker: #105.

## Completed capability chain

1. **Evidence foundations:** RB-001, RB-002, RB-003 and RB-018.
2. **Player profile:** RB-004 and RB-005.
3. **Target and decisions:** RB-006, RB-013 and RB-007.
4. **Interaction and lifecycle:** RB-008, RB-009 and RB-010.
5. **Course materialization:** RB-011 and RB-012.
6. **Specialized research and knowledge:** RB-014, RB-017, RB-015, RB-021, RB-022, RB-023 and RB-024.
7. **Optional interpretation prototypes:** RB-019 and RB-020, plus RB-024 as a bounded game-review grounding enhancement.

## Review and blocked work

- **RB-025:** generated-book strategic-knowledge completion target reached; stacked PRs #302/#304 remain in review.
- **RB-016:** independently blocked on real adoption and outcome evidence.

No other dependency-satisfied Repertoire Builder task is currently queued.

## Locked boundaries preserved

- Intrinsic classification, static opening knowledge, target-population behavior, player behavior and repertoire intent remain separate concepts.
- Candidate ranking, Builder reducers/queue and course preview/apply remain deterministic authorities.
- Opening knowledge is explanatory and does not alter ranking or course writes.
- Generated interpretation remains optional, explicit, gated and non-authoritative.
- Public opening-assessment theory is assembled from reviewed knowledge and validated structured claims, not free-form provider prose.
- RB-017 remains a research fixture rather than a production traps capability.
- Complete knowledge coverage does not erase explicit unknown/low-confidence classification dimensions.
- Editorial priority scores cannot enter runtime candidate ranking or course materialization.

## Residual risks

- Strategic opening prose can overgeneralize and requires source/revision governance.
- Repository `REVIEWED` lifecycle means validated runtime-eligible project content; it does not imply independent grandmaster review.
- Rare/offbeat families deliberately carry lower-confidence broad guidance and may deserve narrower refinement when real demand appears.
- CI's migrated database has zero imported games, so real imported-game-weighted demand evidence remains unavailable in this environment.
- Opening-book upstream changes can introduce new families; the new hard 100% tests will fail until those additions receive explicit knowledge.
- RB-016 outcome claims remain unavailable until real usage evidence exists.

## Queue recommendation

Review stacked PRs #302 and #304. After acceptance, treat opening-knowledge breadth as complete for the pinned book and prioritize depth/quality refinement from real Builder/game-review use, low-confidence classification cases, and future opening-book updates. Keep RB-016 blocked until its real-use gate is satisfied.
