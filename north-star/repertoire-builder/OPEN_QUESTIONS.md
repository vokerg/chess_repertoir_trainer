# Repertoire Builder Open Questions

Last updated: 2026-07-26

Open questions are not decisions. Resolve them in the assigned task and update this document and `DECISIONS.md` together.

## Population evidence

### Resolved implementation facts

- The reusable implementation is the shared Opening Explorer module, not a builder-specific explorer.
- Rated population evidence is exposed through `/api/lichess-games-explorer` with source `LICHESS_GAMES`.
- PR #80 currently supports raw optional month, rating-group and speed selections.
- Multiple selected speeds and rating groups are sent to Lichess as one request and returned as one aggregate.
- The current cache stores each complete filter combination as one deterministic profile/snapshot.
- Masters evidence remains a separate endpoint/source.
- The current response does not directly expose all selected filters; it relies partly on profile identity.
- Imported games contain game-recorded user ratings and current account projections already cover bullet, blitz and rapid.
- PR #76 provides the current versioned normalization domain, but its 13 grades are not aligned directly to Lichess Explorer groups.

### Resolved product direction

- Product speed presets are `ALL`, `BLITZ_AND_SLOWER`, `BLITZ` and `BULLET`.
- UltraBullet is excluded.
- Product rating targets are all players, my peers, my peers plus one higher group, or one explicit Lichess group.
- The default is Blitz and slower plus My peers and above.
- One mixed Lichess aggregate is accepted; separate per-speed calls and weighting are not required.
- Public-game month controls are removed; period/cache policy is server-controlled.
- Lichess Explorer groups become the canonical benchmark bands in a new profile version.
- RB-001 provides an on-demand recent/all-history/default peer resolver.

### Remaining questions for RB-001

- What exact Chess.com bullet, blitz and rapid boundaries map into each Lichess-benchmark band?
- What new profile ID/version and stable band IDs should be used?
- What minimum evidence and coverage threshold defines the dominant contiguous peer interval?
- What tie-break rule applies when two intervals cover the same amount of evidence?
- Should game counts be capped or otherwise normalized so one very active account does not dominate unreasonably?
- How are duplicate imported games across owned accounts excluded from the distribution?
- Does the fixed rated-game source period remain unrestricted, or should the server apply one fixed recent cutoff?
- What exact response provenance should expose requested target, effective groups, resolver fallback and profile/policy versions?
- Is the old raw query contract removed immediately or retained briefly as an internal/backward-compatible path?

Owner task: RB-001.

## Multi-account player level

### Resolved direction

- RB-002 must consume the Lichess-benchmark profile and shared peer resolver from RB-001.
- RB-001 owns the bounded on-demand result needed by Opening Analysis.
- RB-002 owns durable storage/snapshot, confidence, exclusions and overrides.
- Raw Chess.com and Lichess ratings are never averaged directly.

### Remaining questions

- Is the durable result one dominant interval, per-speed bands, or both?
- Which owned accounts are included by default?
- How are inactive and low-volume accounts handled beyond the RB-001 fallback?
- Should durable evidence use every recent game, latest rating per pool, median rating, or another summary?
- How are multiple accounts in the same provider/speed pool combined?
- How are genuinely conflicting high-volume bands represented?
- How are normalization-source confidence and player-evidence confidence combined without conflating them?
- Where is the projection stored and what invalidates/recomputes it?
- What override is available during builder setup?
- How does a custom account selection differ from the default factual projection?

Owner task: RB-002.

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
- How is the durable RB-002 level referenced without making level a permanent style label?
- Can a user correct a profile conclusion, and is that stored as preference evidence or UI feedback?
- Which conclusions are descriptive versus prescriptive?

Owner tasks: RB-004 and RB-005.

## Repertoire target

- What is the minimum useful setup beyond the RB-001 speed/rating presets?
- Is factual peer evidence snapshotted to keep a draft reproducible?
- How are persona, objective, theory tolerance, risk tolerance and coverage represented?
- Can the user choose a different explicit benchmark group without changing the factual profile?
- Is `dubious` a persona, a soundness tolerance or both?
- Can one target have different policies for White and Black?
- How is target versioning handled when a draft resumes?

Owner tasks: RB-006 and RB-013.

## Candidate evidence and ranking

- How many engine lines are needed and at what analysis quality?
- How are mate scores, evaluation uncertainty and engine version represented?
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
