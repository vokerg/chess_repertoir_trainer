# Repertoire Builder Open Questions

Last updated: 2026-07-30

Open questions are not decisions. Resolve them in the assigned task and update this document and `DECISIONS.md` together when a product decision becomes locked, revised or rejected.

## Population evidence and factual player level

### Resolved implementation facts

- The reusable implementation is the shared Opening Explorer module, not a builder-specific extractor.
- Rated population evidence is exposed through `/api/lichess-games-explorer` with source `LICHESS_GAMES`.
- Product queries accept one fixed speed preset and one rating target.
- Speed presets are `ALL`, `BLITZ_AND_SLOWER`, `BLITZ` and `BULLET`; ultraBullet is excluded.
- Rating targets are all players, my peers, my peers plus one higher group, or one explicit Lichess benchmark group.
- Multiple effective speeds and groups are sent to Lichess in one request and returned as one mixed aggregate.
- The cache stores one deterministic public snapshot per effective population; personal resolver evidence is attached after cache access and is not persisted.
- Public-game month controls are removed; the rated source uses the existing cache/stale lifecycle.
- Masters remains a separate source.
- Active normalization profile `2026-07-lichess-bands-v1` uses the nine Lichess Explorer groups and versioned Chess.com mappings.
- Factual peer resolution uses recent three-month evidence, then all eligible history, then the generic 1400–1599 fallback.
- Resolver policy `dominant-contiguous-window-v1` selects the narrowest one-to-three-group window containing at least 70% of evidence, with deterministic tie-breaks.
- Provider and speed are resolved before ratings are classified; raw Chess.com and Lichess values are not averaged.
- Multiple accounts contribute through grouped account/provider/speed/rating evidence weighted by game count.
- RB-001 and RB-002 have no remaining player-level formula question.
- RB-010 requests peer resolution only when a peer target is selected. Explicit benchmark groups do not masquerade as peer evidence.

### Deferred only on demonstrated need

- Cross-account duplicate-game handling should change only if a consumer or measured defect shows material distortion.
- Activity caps, decay, outlier suppression or alternative weighting require evidence and a new resolver-policy version.
- Better empirical Chess.com boundary calibration requires a future versioned normalization-profile change.
- Mixed-population weighting should be reconsidered only if real candidate decisions show the current Lichess aggregate is materially misleading.

These are not current blockers.

## Opening classification

### Resolved by RB-003 and RB-018

- Classification uses deterministic, versioned, ordered regex rules over generated opening names.
- Broad family rules provide defaults; narrower subfamily and line rules override scalar values.
- Safe lexical modifiers may add traits but do not infer soundness from words such as `Gambit`.
- White and Black receive independent profiles for soundness, character, theoretical status, theory burden, roles and confidence.
- Stable rule IDs and matched-rule provenance remain available.
- Uncertain dimensions remain explicit `UNKNOWN` values.
- Runtime LLM calls, Stockfish auditing and automatic semantic inference are excluded.
- Active rule version is `2026-07-rules-v2`.
- All 3,733 pinned entries and 3,167 unique names match at least one of 114 active ordered rules.
- Rule-match coverage is not fabricated semantic certainty.
- Generated-name and actual-game coverage remain separate metrics.
- Upstream naming changes surface through audits, backlogs, unused-rule reporting and CI.

Future naming additions and judgment corrections are normal versioned maintenance, not unresolved roadmap work.

## Player Chess Profile

### Resolved by the RB-004 calculation implementation

- Preference exposure and performance remain separate.
- The statistical baseline is the complete selected personal game set after explicit filters.
- Result and analysis evidence retain separate denominators and coverage.
- Evidence bands and deterministic conclusions use explicit minimum samples.
- Small samples are qualified rather than hidden behind a generic confidence score.
- Multiple owned accounts are supported; cross-provider duplicate copies remain a disclosed risk.
- Classification source, rule provenance, confidence and unknown-dimension coverage remain visible.
- Calculation is bounded and adds no stored profile, permanent personality label, correction record, course write or LLM dependency.

### Resolved by the RB-005 review implementation

- `/progress` remains the existing account-performance entry.
- `/progress/profile` is a separate lazy route under the Progress navigation.
- Recent, all-time, custom, account, speed, colour, rated-status and rating-range filters are supported.
- `What you choose` and `What works` remain independent views.
- Evidence expands into metrics, openings and bounded games.
- Loading, no-data, stale-request, error, partial-analysis, low-confidence, unknown and truncated states are handled.
- Profile conclusions cannot be edited or persisted in RB-005.
- `Use as repertoire starting point` remains unavailable until a reviewed handoff exists.

### Remaining review questions

- Does the page feel credible and useful against populated personal data across desktop and mobile widths?
- Are the five opening dimensions understandable without additional copy?
- Do real examples justify splitting composite quality/error metrics?
- Which profile-derived values should RB-013 offer as editable target defaults?

Owners: RB-004, RB-005 and RB-013.

## Repertoire target

### Resolved by RB-006 and the RB-010 integration

- One target applies to one build/session snapshot.
- The target contains side, starting point, account context, one fixed speed preset, one requested/effective population, explicit objective dimensions and coverage policy.
- Peer-derived targets retain factual peer-resolution, normalization-profile and resolver-policy provenance.
- `MY_PEERS_PLUS_ONE` adds exactly one adjacent higher benchmark group and caps at `2500+`.
- Persona is a transparent label over explicit target dimensions.
- `UNKNOWN` is valid factual evidence but not target intent.
- Deliberately dubious intent requires explicit opt-in.
- Effective values are authoritative; defaults and overrides retain field-level provenance.
- Contract version, target ID and creation time are immutable.
- Candidate-recalculation fields are explicit.
- RB-010 can create schema-valid targets in the Angular feature boundary without inventing a second API or contract.
- RB-010 records peer-derived population as `PEER_RESOLUTION` default provenance; explicit benchmark groups remain authoritative manual target choices.
- The four RB-010 personas are transparent local presets over RB-006 dimensions, not stored user templates or permanent labels.

### Remaining integration questions

- How should RB-013 map profile conclusions into optional target defaults and named preset UX?
- Should completed courses retain a full target snapshot, a reference, or selected target/persona metadata?
- Can a completed course retain multiple historical target versions after adaptation?
- Should reusable custom persona templates become persisted user data?

Owners: RB-011 and RB-013.

## Candidate evidence and ranking

### Resolved by RB-007 and the RB-010 integration

- Contract version is `2026-07-v1`; ranking-policy version is `2026-07-deterministic-v1`.
- User-move and opponent-response decisions are separate roles.
- Stored MultiPV, Masters, selected-population, personal, opening, profile and course evidence remain separate.
- Engine work is bounded and does not launch an unbounded live run.
- Missing, stale and insufficient sources remain explicit.
- Objective eligibility, target fit, profile fit, course conflict and manual choices remain inspectable.
- The public response exposes ordered candidates, components, stable reasons, warnings and policy version rather than one opaque aggregate score.
- Speed presets may change ordering through versioned weights.
- Sparse personal/profile evidence does not fabricate conclusions.
- Opponent relevance produces bounded coverage contribution and cumulative coverage.
- Course transposition evidence is intentionally narrow and does not traverse an arbitrary repertoire graph.
- RB-010 uses the existing authenticated candidate endpoint as its sole candidate source.
- Manual legal board moves use `includeMoveUci`, so they retain the same evidence, eligibility, reasons and warnings as ranked candidates.
- The workbench keeps target fit and profile fit separate and permits selection against profile advice.

### Remaining calibration questions

- Do real builder sessions justify different weights, objective thresholds, evidence limits or preview depth?
- Should candidate policy versions retain migration/display support after changes?
- Does selected-population aggregation remain credible for every speed preset?
- Which learning-burden signals are measurable beyond opening classification and course coverage?
- Are 6 visible candidates enough for normal positions without hiding useful alternatives?

Owner: RB-010 hands-on review for evidence; policy changes require a versioned follow-up.

## Visual choice experience

### Resolved by RB-008 and implemented for review by RB-010

- A focused setup dialog launches the routed workbench.
- The workbench uses one readable primary board.
- Candidates switch the board to their resulting position and focused evidence.
- A user can return to the active position and play another legal move for evidence-backed inclusion.
- Opponent responses use explicit multi-selection and a branch queue.
- Branch progress, deferred work, stale work and bounded preview remain visible.
- Target fit and profile fit remain separate.
- Simultaneous candidate mini-boards are rejected as the default.
- Always-visible candidate comparison includes move/rank, stored engine value, target-population frequency, target fit and profile fit.
- Expanded focused evidence includes eligibility, source states, reasons, warnings and course state.
- Preview-line behavior is intentionally limited to candidate resulting-position display and the RB-009 structural tree; the builder does not become a free-analysis board.
- Queue progress uses actual branch counts. Coverage is labelled as a user-selected target rather than a claim of complete theoretical coverage.
- Setup restart is explicitly destructive: it replaces the current route-local draft and can be cancelled.

### Remaining hands-on questions

- Is the always-visible candidate row readable against real data and smaller widths?
- Is focused evidence detailed enough without overwhelming the primary decision?
- Are queue, deferred/stale states and coverage wording understandable without onboarding?
- Is one board plus structural preview sufficient for navigating longer branches?
- Are the responsive layouts and keyboard order usable in the authenticated rendered application?

Owner: RB-010 review.

## Builder session and queue

### Resolved by RB-009 and the RB-010 integration

- Model version is `2026-07-v1`.
- The session is a pure, serializable `chess-domain` snapshot.
- One session retains one RB-006 target snapshot and target revision.
- Owner identity and optimistic session revision are required for every mutation and resume operation.
- Branch path ID preserves move-order history; normalized FEN plus role identifies transpositions.
- Branch states are `PENDING`, `ACCEPTED`, `DEFERRED`, `IGNORED`, `COMPLETED` and `STALE`.
- Decision history distinguishes active, superseded and stale records.
- The queue expands lazily by one accepted decision and can be reordered explicitly.
- Deferred work can be reopened; ignored work is deliberate exclusion.
- Changing an ancestor stales previous descendants while retaining history.
- Target replacement stales the snapshot and restarts lazily from the root.
- Evidence or source-course changes can stale one affected subtree without disturbing unrelated queue entries.
- Transposed paths reference accepted/completed canonical session positions and avoid duplicate queued work.
- Preview returns a bounded tree, queue, status counts and truncation metadata.
- Hard limits are 256 branches, 128 queued branches, 8 selected moves and 256 preview nodes.
- RB-010 uses the reducer directly from a page-scoped store and does not duplicate lifecycle rules in Angular.
- Separate setup and candidate request versions suppress stale responses.
- Failed mutations do not advance the queue.
- RB-010 adds product bounds of 6 candidates per request and 24 accepted decisions.
- No Prisma model, builder-session API, browser storage or storage adapter is added.
- Refreshing/recreating the route starts a new draft; the behavior is visible rather than presented as resume support.

### Remaining review and integration questions

- Is route-local state sufficient for the first usable MVP, or does hands-on review demonstrate a need for durable server persistence?
- Are typical bounded sessions short enough to complete without recovery?
- If persistence is justified, what draft list, expiry, archive and deletion behavior is required?
- Is cross-device resume required before course materialization?
- Should multiple simultaneous drafts be visible to the user?
- What source-course revision references must a persisted draft protect?
- How should a storage adapter handle optimistic conflicts while preserving the pure reducer as the authority?
- Are the 24-decision product limit and RB-009 hard bounds appropriate in real use?

Owner: RB-010 for workflow evidence. A persistence implementation requires explicit reviewed justification under RB-D024.

## Course writing

- Is the existing analysis-reintegration tree sufficient for builder drafts?
- Is the RB-010 structural preview stable and expressive enough to become RB-011 input?
- When should a builder create a course, chapter, line or merge at an anchor?
- How are conflicts and duplicate transpositions presented?
- How are deferred branches preserved after accepted material is written?
- Which target/session metadata belongs on completed courses?
- How are generated names and chapter organization reviewed?

Owner: RB-011 after accepted RB-010 integration.

## Existing-course adaptation

- Which current findings are safe entry points first?
- How does the user choose between extending, replacing and creating an alternative line?
- How are course target metadata and original intent represented?
- Can the same course be retargeted without losing its previous persona/history?

Owner: RB-012.

## Traps

### Resolved and approved through RB-014

- A trap combines a reproducible trigger, practical temptation, bounded punishment, explicit safe alternatives and separate setup soundness.
- Identity uses normalized trigger position and ordered move transitions, not opening name or ECO.
- Practical temptation and objective soundness remain separate.
- Suitable reusable sources include CC0 Lichess datasets and `lichess-org/chess-openings` labels.
- Unlicensed studies, videos, blogs and books are discovery leads only.
- Production traps remain outside RB-006/RB-007 until a pilot proves value.

### RB-017 pilot questions

- Which Stockfish profile provides a useful reproducibility/cost balance?
- Which minimum population samples produce `INSUFFICIENT` rather than percentages?
- Which 20–50 examples provide useful diversity?
- Who owns editorial review, downgrade, rejection, deprecation and refutation decisions?
- What evidence upgrades confidence?
- When is a famous trap refuted rather than merely dubious or obsolete?
- How are live Explorer refreshes isolated from deterministic tests and rate limits?
- Does the pilot justify a later optional builder extension?

Owner: RB-017. Execution issue: #114.

## Optional generated interpretation

### Resolved architecture through RB-015

- Generated interpretation is optional, disabled by default, explicit and read only.
- It consumes immutable deterministic snapshots and never returns a command.
- It cannot alter chess facts, candidate ranking, selected moves/responses, builder reducers/queue, completion eligibility, preview/apply or course writes.
- Candidate explanation and post-apply summary are separate use cases with independent flags, state, contracts, failure behavior, evaluation and purge paths.
- Prototype output is transient by default and must be removable without migrations or deterministic-flow changes.
- Provider model names, pricing, API behavior, privacy, retention and regional requirements must be re-verified at implementation.
- Profile narrative and conversational target refinement remain deferred until accepted populated profile UX demonstrates a concrete deterministic-copy gap.

### RB-019 candidate-explanation questions

- Does generated synthesis materially outperform the existing Focused evidence panel and a deterministic comparison template?
- Can every referenced reason, warning, fit, source and candidate identity be reconciled to authoritative RB-007 data?
- Does the copy improve understanding without implying that the model selected or endorsed the move?
- Are stale-response, disabled-provider and malformed/empty-output states understandable and harmless?
- Is usefulness consistent across novice, club and stronger-player review?

Owner: RB-019. Execution issue: #218.

### RB-020 post-apply-summary questions

- Does generated prose materially outperform the authoritative result block and a deterministic structured completion summary?
- Can every move, branch, destination, count, revision and excluded-item reference be reconciled to the completed draft and RB-011 result?
- Does a study checklist add value without implying that unapplied or excluded work reached the course?
- Are transient lifetime and clearing on dialog/draft/result change sufficient?
- Do current provider privacy, retention and regional terms permit the minimized context planned for the prototype?

Owner: RB-020. Execution issue: #219.

## Outcome feedback

- How is repertoire adoption detected?
- What constitutes recall versus coincidental move choice?
- How is opening improvement separated from rating or opponent changes?
- Which metrics should feed profile recalculation?
- When is a deferred branch promoted because it appears in new games?

Owner: RB-016.
