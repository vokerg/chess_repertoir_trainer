# Repertoire Builder Open Questions

Last updated: 2026-07-26

Open questions are not decisions. Resolve them in the assigned task and update this document and `DECISIONS.md` together.

## Population evidence

- What contract will the parallel Lichess speed/rating explorer expose?
- Which speed categories and rating ranges are available from the source?
- How are sparse positions and ranges represented?
- Can population responses be compared consistently across selected speeds?
- What weighting should a speed combination use by default?
- Should users edit weights directly or choose understandable presets?
- How should General mode be weighted?
- How should provider-specific and general evidence coexist?

Owner task: RB-001.

## Multi-account player level

- Is level resolved once per player, once per speed, once per provider, or all three?
- Which accounts are included by default?
- How are inactive and low-volume accounts handled?
- Should the calculation use latest rating, median recent rating, weighted recent rating, or another measure?
- How do selected analysis periods affect level?
- How are normalized-grade boundaries and soft padding used?
- How is confidence calculated?
- What override is available during builder setup?
- How is a target such as `my level plus two grades` converted back into source ranges?

Owner task: RB-002.

## Opening classification

- What is the stable identity of a named opening or variation?
- What taxonomy and side-aware dimensions are required?
- Which values are curated, derived, inherited, or generated?
- How is confidence represented?
- How are opening families and deep named variations related?
- How are transpositions handled?
- How is every named entry guaranteed coverage?
- How are updates reviewed and versioned?

Owner task: RB-003. Planning is intentionally blank beyond these questions.

## Player Chess Profile

- What is the statistical baseline: all games, same speed, same color, same rating band, or a hierarchy?
- Which conclusions are meaningful with indexed but unanalysed games?
- How should small samples shrink toward baseline?
- Which confidence model is understandable to users?
- How are opening outcome, result, accuracy, early errors, and course adherence combined without double-counting?
- How should profile changes over time be compared?
- Can a user correct a profile conclusion, and is that correction stored as preference evidence or only UI feedback?
- Which conclusions are descriptive versus prescriptive?

Owner tasks: RB-004 and RB-005.

## Repertoire target

- What is the minimum useful setup?
- How are persona, objective, theory tolerance, risk tolerance, and coverage represented?
- Is `dubious` a persona, a soundness tolerance, or both?
- Can one target have different policies for White and Black?
- Are target weights editable during a build?
- How is target versioning handled when a draft resumes?

Owner tasks: RB-006 and RB-013.

## Candidate evidence and ranking

- How many engine lines are needed and at what analysis quality?
- How are mate scores, evaluation uncertainty, and engine version represented?
- How are master and population score interpreted from the choosing side's perspective?
- How is practical popularity balanced against objective quality?
- How is course learning burden estimated?
- What is a transposition bonus?
- How are unavailable datasets handled?
- Which ranking reasons are stable enough for contracts?
- Should ranking scores be returned, or only ordered candidates and reason components?

Owner task: RB-007.

## Visual choice experience

- Does each candidate need its own mini-board?
- Can one main board preview candidates quickly enough?
- How are evidence density and board size balanced?
- How is opponent coverage shown visually?
- How are deferred branches and branch progress represented?
- What works on mobile?
- How does a user compare two resulting structures several plies ahead?
- Which explanation is always visible and which is expandable?

Owner task: RB-008.

## Builder session and queue

- Does the MVP need persistence or can it prove the flow in route state/local state first?
- What is the immutable target snapshot of a draft?
- How are accepted, pending, deferred, ignored, and stale decisions represented?
- How are transpositions shared across branches?
- How is a draft invalidated when source courses or evidence change?
- What is the maximum bounded work returned by one endpoint?
- How are concurrent edits handled?

Owner task: RB-009.

## Course writing

- Is the existing analysis-reintegration tree sufficient for builder drafts?
- When should a builder create a course, chapter, line, or merge at an anchor?
- How are conflicts and duplicate transpositions presented?
- How are deferred branches preserved after accepted material is written?
- How are generated names and chapter organization reviewed?

Owner task: RB-011.

## Existing-course adaptation

- Which current findings are safe entry points first?
- How does the user choose between extending, replacing, and creating an alternative line?
- How are course target metadata and original intent represented?
- Can the same course be retargeted without losing its previous persona?

Owner task: RB-012.

## Traps

- What qualifies as a trap rather than an ordinary tactical line or dubious gambit?
- What sources are available and legally usable?
- How are trigger position, tempting move, punishment, refutation, soundness, and rating/speed relevance represented?
- Is a trap always tied to a named opening?
- How does the builder prevent misleading users about objective risk?

Owner task: RB-014.

## LLM

- What user problem cannot be solved adequately with deterministic templates?
- What context size and privacy boundaries apply?
- What generated claims require source references?
- Can the LLM be removed without breaking the workflow?
- Is generated text stored, regenerated, or purely transient?

Owner task: RB-015.

## Outcome feedback

- How is repertoire adoption detected?
- What constitutes recall versus coincidental move choice?
- How is opening improvement separated from rating or opponent changes?
- Which metrics should feed profile recalculation?
- When is a deferred branch promoted because it appears in new games?

Owner task: RB-016.
