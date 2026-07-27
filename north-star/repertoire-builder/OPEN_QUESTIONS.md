# Repertoire Builder Open Questions

Last updated: 2026-07-27

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

- What is the stable identity of a named opening or variation?
- What taxonomy and side-aware dimensions are required?
- Which values are curated, derived, inherited or generated?
- How is confidence represented?
- How are opening families and deep named variations related?
- How are transpositions handled?
- How is every named entry guaranteed coverage?
- How are updates reviewed and versioned?

Owner task: RB-003. Planning is intentionally blank beyond these questions.

## Player Chess Profile

- What is the statistical baseline: all games, same speed preset, same color, same peer band or a hierarchy?
- Which conclusions are meaningful with indexed but unanalysed games?
- How should small samples shrink toward baseline?
- Which confidence model is understandable to users?
- How are opening outcome, result, accuracy, early errors and course adherence combined without double-counting?
- How should profile changes over time be compared?
- How should the completed factual peer interval and distribution be referenced without turning level into a permanent style label?
- Does the profile need a separately named player-level contract, or can it consume the existing resolver interface directly?
- Can a user correct a profile conclusion, and is that stored as preference evidence or UI feedback?
- Which conclusions are descriptive versus prescriptive?

Owner tasks: RB-004 and RB-005.

## Repertoire target

- What is the minimum useful setup beyond the RB-001 speed/rating presets?
- Is factual peer evidence snapshotted to keep a draft reproducible?
- How are persona, objective, theory tolerance and coverage represented in the setup dialog?
- Can the user choose a different explicit benchmark group without changing the factual profile?
- Is `dubious` a persona, a soundness tolerance or both?
- Can one target have different policies for White and Black?
- How is target versioning handled when a draft resumes?
- Which target/profile disagreement fields are required so the visual layer can explain the override without changing factual evidence?

Resolved by RB-008: setup is a focused dialog and the recursive builder launches as a routed workbench.

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
- What bounded resulting-position and preview-line data is required for the board-first workbench?
- How is opponent-response relevance converted into cumulative coverage without implying false precision?

Owner task: RB-007.

## Visual choice experience

### Resolved by RB-008

- Setup uses a focused dialog and closes before recursive work begins.
- The recursive builder is routed and board-first.
- One readable primary board is the default.
- Candidates switch the board and focused evidence.
- Opponent responses use a coverage queue with explicit pending, selected, deferred, ignored and completed states.
- Target fit and profile fit remain attached to candidates as separate concepts.
- Direction B's simultaneous candidate landscape is rejected as the default because it is too heavy.
- Mobile stacks the workbench rather than relying on a multi-card matrix.

### Deferred to production evidence

- Whether an explicit mini-board comparison mode is valuable enough for the MVP or a later slice.
- How many plies a bounded candidate preview should show.
- Exact cumulative-coverage semantics after RB-007/RB-009 contracts.
- Exact responsive placement of branch progress after the production shell is reinspected.
- Which candidate metrics remain always visible and which move into expandable evidence.

Owner tasks: RB-007, RB-009 and RB-010. RB-008 is complete.

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

- What qualifies as a trap rather than an ordinary tactical line or dubious gambit?
- What sources are available and legally usable?
- How are trigger position, tempting move, punishment, refutation, soundness and rating/speed relevance represented?
- Is a trap always tied to a named opening?
- How does the builder prevent misleading users about objective risk?

Owner task: RB-014.

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
