# Repertoire Builder Open Questions

Last updated: 2026-07-28

Open questions are not decisions. Resolve them in the assigned task and update this document and `DECISIONS.md` together.

## Population evidence and factual player level

### Resolved implementation facts

- The reusable implementation is the shared Opening Explorer module, not a builder-specific explorer.
- Rated population evidence is exposed through `/api/lichess-games-explorer` with source `LICHESS_GAMES`.
- Product queries accept `fen`, `speedPreset`, `ratingTarget` and conditional `ratingGroup`.
- Speed presets are `ALL`, `BLITZ_AND_SLOWER`, `BLITZ` and `BULLET`; ultraBullet is excluded.
- Rating targets are all players, my peers, my peers plus one higher group, or one explicit Lichess group.
- Defaults are Blitz and slower plus My peers and above.
- Multiple effective speeds and groups are sent to Lichess in one request and returned as one mixed aggregate.
- The cache stores one deterministic public snapshot per effective population; personal resolver evidence is attached after cache access and is not persisted.
- Public-game month controls are removed; the rated source is unrestricted by month and uses the existing 30-day cache/stale lifecycle.
- Masters remains a separate endpoint/source and is unchanged.
- The response directly exposes requested/effective population and peer-resolution provenance.
- Active normalization profile `2026-07-lichess-bands-v1` uses the nine Lichess Explorer groups and versioned Chess.com mappings.
- The former `2026-07-product-v1` profile remains preserved as historical calibration evidence.
- Factual peer resolution uses recent three-month evidence, then all history, then the generic 1400–1599 fallback.
- Resolver policy `dominant-contiguous-window-v1` selects the narrowest one-to-three-group window containing at least 70% of evidence, with documented deterministic tie-breaks.
- Provider and speed are resolved before ratings are classified; raw Chess.com and Lichess values are not averaged into the factual cross-provider result.
- Multiple accounts contribute through grouped account/provider/speed/rating evidence weighted by game count.
- The result includes the complete band distribution, selected interval, eligible-game count, evidence period, contributions and profile/policy versions.
- The raw `since`, `until`, `ratings` and `speeds` product query is replaced rather than maintained as a second public path.
- RB-001 and RB-002 have no remaining player-level formula question.

### Deferred only on demonstrated need

- Cross-account duplicate-game handling should change only if a consumer or measured defect shows material distortion.
- Activity caps, decay, outlier suppression or alternative weighting require evidence and a new resolver policy version.
- Better empirical Chess.com boundary calibration requires a future versioned normalization-profile change.
- Whether mixed Lichess populations are materially misleading across speeds should be evaluated during candidate/ranking work before weighted fetching is reconsidered.
- Extraction into a separately named player-level module or endpoint belongs to the first genuine second consumer.

These are not blockers and do not reopen RB-002.

## Opening classification

### Resolved by RB-003

- Classification uses deterministic, versioned, ordered regex rules over generated opening names.
- Broad family rules provide defaults; narrower subfamily and line rules override scalar values.
- Safe lexical modifiers may add traits such as sharp/tactical but do not infer soundness from a word such as `Gambit`.
- White and Black receive independent profiles for soundness, character, theoretical status, theory burden, roles and confidence.
- Stable rule IDs and matched-rule provenance remain available to consumers.
- Unmatched dimensions remain explicit `UNKNOWN` values.
- Rules are stored separately from `openingBook.generated.ts`; no database row per generated entry is required.
- Runtime LLM calls, Stockfish auditing and engine-assisted classification are excluded.
- The Evans Gambit and Benko Gambit demonstrate that offerer and acceptor assessments may differ by side.

### Resolved by RB-018

- The active rule version is `2026-07-rules-v2`.
- The pinned generated book has 3,733 matched entries out of 3,733 and 3,167 matched unique names out of 3,167 through 114 active ordered rules.
- One hundred percent rule-match coverage means every pinned name has characteristics and provenance; it does not require every dimension to be high-confidence or non-unknown.
- Rare heterogeneous families may safely expose only surprise/role/burden traits with low confidence while retaining `UNKNOWN` soundness.
- The measured generated backlog is grouped by root family and ranked by affected entry count rather than alphabetically.
- Broad families are processed before narrow exceptions; exceptions are justified when family inheritance would misrepresent soundness, theoretical status or side-specific gambit roles.
- Generated-name and actual-game coverage are separate metrics.
- Actual-game weighting uses existing `ImportedGame.openingName` and `openingEco` values through an on-demand database audit; it adds no persistence or background job.
- Upstream opening-book changes surface through grouped backlogs, unused-rule reporting, CI artifacts and a regression that fails on newly unmatched pinned entries.
- Confidence remains profile-level for v2. Dimension-specific confidence is deferred until consumer evidence demonstrates a concrete need.

RB-018 is complete. Future naming additions or judgment corrections are normal versioned rule maintenance, not an unresolved roadmap task.

## Player Chess Profile

### Resolved by RB-004 calculation

- The statistical baseline is the complete selected personal game set after account, period, speed, colour, rated-status and rating-context filters.
- Preference exposure and performance remain separate response sections and are never inferred from one another.
- Result score uses all selected recognized results; opening-quality, early-error and accuracy metrics use analysed-game coverage and separate denominators.
- The profile consumes the existing peer resolver directly and exposes its distribution/provenance rather than introducing a second player-level formula.
- Result evidence bands are fewer than 5 `INSUFFICIENT`, 5–14 `LOW`, 15–39 `MEDIUM`, and 40+ `HIGH`.
- Analysis evidence is unavailable below five analysed games or below 50% coverage, then uses the same analysed-game bands.
- Small samples are qualified rather than silently shrunk toward a hidden estimate.
- Score, opening-positive, opening-trouble, early-mistake and accuracy metrics remain independent; deterministic conclusions use explicit minimum samples and five-percentage-point deltas.
- Multiple owned accounts are supported. Cross-provider duplicate copies remain a disclosed residual risk because the repository has no stable cross-provider game identity.
- Exact generated-book matches and stored name/ECO rule matching expose separate classification source, rule provenance, confidence and unknown-dimension coverage.
- The calculation is bounded to 100 opening/ECO/colour groups plus 1–10 supporting games and exposes omitted/truncated coverage.
- Conclusions are descriptive and correlational; they do not prove a permanent style or causal rating effect.
- RB-004 adds no persisted profile, permanent personality label, correction record, course write, candidate rank or LLM dependency.

### Resolved by the RB-005 review implementation

- `/progress` preserves the existing default/active account redirect and `/progress/accounts/:accountId` remains the account-performance dashboard.
- `/progress/profile` is a separate authenticated lazy route, exposed beside `Account performance` under the existing Progress submenu.
- The profile page uses recent/all-time/custom period, account, speed preset, colour, rated/casual and optional rating-range filters.
- `What you choose` and `What works` remain explicit independent views.
- Character, soundness, theoretical status, theory burden and role are selectable breakdown dimensions.
- Deterministic conclusions and breakdown rows expand into metrics, contributing openings and bounded recent games.
- Supporting games are matched by colour plus opening identity; unrelated global games are not substituted when bounded evidence has no match.
- Low-confidence, unknown-dimension, incomplete-analysis and truncated evidence remain visible through the coverage presentation.
- Loading, no-data, stale-request, invalid-recalculation, recalculation-error and partial-analysis states are handled.
- The page uses the existing composite opening-positive, opening-trouble and early-mistake metrics. It does not pre-emptively split success/advantage, trouble/disaster or mistake/blunder.
- A previous-period comparison is not shown because RB-004 does not return a paired period. It may be added through two explicit requests only if hands-on use justifies the complexity.
- Users cannot edit factual conclusions or persist rejection/correction feedback in RB-005.
- `Use as repertoire starting point` remains an honest disabled affordance until a stable RB-006/RB-013 handoff exists.
- Final user-facing terms distinguish preference, performance relative to baseline, opening-positive positions and trouble areas without assigning one permanent archetype.
- The Angular implementation uses a lazy composition page, page-scoped signal store with private writable state, typed HTTP-only data access, feature-local display models, focused pure helper modules, shared breakpoint alignment, native control semantics, and route/store/component tests.

### Remaining review questions

- Does the page feel credible and useful against populated personal data across both desktop and mobile widths?
- Are the five opening dimensions understandable enough without extra explanatory copy?
- Do hands-on examples demonstrate a need to split composite opening and early-error tag severities?
- Which profile-derived values should eventually initialize RB-006 target setup, and how should RB-013 expose acceptance or override?

RB-004 and RB-005 remain in review through PRs #136 and #139. No separate calculation or broader-metrics task is currently required.

## Repertoire target

- What is the minimum useful setup beyond the fixed speed/rating presets?
- Is factual peer evidence snapshotted to keep a draft reproducible?
- How are persona, objective, theory tolerance, risk tolerance and coverage represented?
- Can the user choose a different explicit benchmark group without changing the factual profile?
- Is `dubious` a persona, a soundness tolerance or both?
- Can one target have different policies for White and Black?
- How is target versioning handled when a draft resumes?
- Which target/profile disagreement fields are required so the visual layer can explain the override without changing factual evidence?

Owner tasks: RB-006 and RB-013.

## Candidate evidence and ranking

- How many engine lines are needed and at what analysis quality?
- How are mate scores, evaluation uncertainty and engine version represented?
- How are master and population score interpreted from the choosing side's perspective?
- Is the one-mixed-population approach sufficiently stable for ranking across every speed preset?
- How is practical popularity balanced against objective quality?
- How is course learning burden estimated?
- What is a transposition bonus?
- How are unavailable datasets handled?
- Which ranking reasons are stable enough for contracts?
- Should ranking scores be returned, or only ordered candidates and reason components?
- What bounded resulting-position and preview-line data is required for the accepted board-first presentation?
- How is opponent-response relevance converted into cumulative coverage without implying false precision?

Owner task: RB-007.

## Visual choice experience

### Resolved by RB-008

- A focused setup dialog launches the substantial workflow.
- **Start building** closes the dialog and opens a routed workbench.
- The recursive workbench uses one large primary board, candidate switching, focused evidence, a response queue and branch progress.
- Candidate moves remain visually connected to resulting positions.
- Profile fit and selected-target fit remain separate and may disagree visibly.
- Opponent responses expose selected, pending, deferred, ignored and completed states.
- A coverage queue is the default narrow-screen and production presentation.
- Simultaneous candidate mini-boards are rejected as the default.
- An explicit mini-board comparison mode is deferred unless later evidence justifies it.

### Remaining implementation questions

- Which candidate metrics stay always visible and which move into expandable evidence?
- How far ahead should a production preview line navigate before it becomes a separate analysis workflow?
- What stable semantics should cumulative first-pass coverage use?

Owners: RB-006, RB-007, RB-009 and RB-010.

## Builder session and queue

- Does the MVP need persistence or can it prove the flow in route/local state first?
- What is the immutable target snapshot of a draft?
- How are accepted, pending, deferred, ignored and stale decisions represented?
- How are transpositions shared across branches?
- How is a draft invalidated when source courses or evidence change?
- What is the maximum bounded work returned by one endpoint?
- How are concurrent edits handled?

Owner task: RB-009.

## Course writing

- Is the existing analysis-reintegration tree sufficient for builder drafts?
- When should a builder create a course, chapter, line or merge at an anchor?
- How are conflicts and duplicate transpositions presented?
- How are deferred branches preserved after accepted material is written?
- How are generated names and chapter organization reviewed?

Owner task: RB-011.

## Existing-course adaptation

- Which current findings are safe entry points first?
- How does the user choose between extending, replacing and creating an alternative line?
- How are course target metadata and original intent represented?
- Can the same course be retargeted without losing its previous persona?

Owner task: RB-012.

## Traps

### Resolved and approved through RB-014

- A trap combines a reproducible trigger, practical temptation, bounded punishment, explicit safe alternatives, and separate setup soundness.
- Trap occurrence identity uses normalized trigger FEN and ordered move transitions, not opening name or ECO.
- Transposed routes reaching the same legal trigger may be one occurrence; related non-identical triggers belong to a family.
- Practical temptation and objective soundness remain separate evidence dimensions.
- Suitable reusable sources include CC0 Lichess games, puzzles, evaluated positions, and `lichess-org/chess-openings` labels.
- User-created studies, videos, blogs, books, and unlicensed collections are discovery leads only.
- A trustworthy source requires versioned engine evidence, rating/speed population evidence, editorial review, and provenance.
- RB-006 and RB-007 require no forward-compatible contract changes now.
- The approved next step is the bounded RB-017 data/validator pilot, not a production traps capability.

### RB-017 pilot questions

- Which exact Stockfish profile provides a useful reproducibility/cost balance?
- Which minimum population sample rules should produce `INSUFFICIENT` rather than a percentage claim?
- Which 20–50 examples provide enough soundness, outcome, family, transposition, and refutation diversity?
- Which evidence fields belong in the canonical source record versus derived snapshots?
- How is occurrence identity hashed without collapsing positions that differ in castling or en-passant rights?
- Who owns editorial review, downgrade, rejection, deprecation, and refutation decisions during the pilot?
- What evidence upgrades confidence from low to medium or high?
- When should a famous trap be classified as refuted rather than merely dubious or practically obsolete?
- How are live Explorer refreshes isolated from deterministic tests and rate limits?
- Does the pilot justify any later optional RB-006/RB-007 extension, or should traps remain separate?

Owner task: RB-017. Execution issue: #114.

## LLM

- What user problem cannot be solved adequately with deterministic templates?
- What context size and privacy boundaries apply?
- What generated claims require source references?
- Can the LLM be removed without breaking the workflow?
- Is generated text stored, regenerated or transient?

Owner task: RB-015.

## Outcome feedback

- How is repertoire adoption detected?
- What constitutes recall versus coincidental move choice?
- How is opening improvement separated from rating or opponent changes?
- Which metrics should feed profile recalculation?
- When is a deferred branch promoted because it appears in new games?

Owner task: RB-016.
