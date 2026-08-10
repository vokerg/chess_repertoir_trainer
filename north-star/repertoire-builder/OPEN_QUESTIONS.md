# Repertoire Builder Open Questions

Last updated: 2026-08-10

Open questions are not decisions. Resolve them in the assigned task and update `DECISIONS.md` when a product decision becomes locked, revised, or rejected.

## Settled foundations

The following remain settled and are not reopened by Builder V2:

- one shared rated Lichess Opening Explorer supplies target-population evidence;
- product speed presets are All, Blitz and slower, Blitz, and Bullet;
- target rating populations are all players, My peers, My peers plus one higher group, or one explicit Lichess benchmark group;
- factual peer resolution uses the existing versioned provider-aware normalization/resolver domain;
- Masters remains a separate corpus;
- opening classification is deterministic, versioned, side-aware and explicit about uncertainty;
- static opening knowledge is deterministic, reviewed and ranking-neutral;
- Player Chess Profile preference and performance remain separate;
- Builder user-move and opponent-response roles remain separate;
- Builder session/queue behavior remains the pure RB-009 authority;
- course writes remain behind mandatory preview/apply;
- generated interpretation remains optional and non-authoritative;
- route-local Builder session persistence remains an open separate question under RB-D024.

## Builder V2 user-move ranking — RB-027 / #317

Status: resolved by RB-027. See `reports/RB-027-2026-08-10-empirical-persona-ranking-v2-closure.md`.

### Locked implementation policy

- Balanced/Solid/Aggressive/Surprise apply only to the repertoire side's move.
- Selected-population and Masters performance are evaluated against the exact-position target-side baseline rather than a fixed 50% score.
- Preset ranking authority is selected-population, Masters, and bounded objective evidence; opening classification/knowledge, Player Chess Profile fit, personal history, and existing-course coverage remain inspectable context rather than preset-persona rank authority.
- Empirical preset population evidence requires at least 20 games; Masters evidence requires at least 10 games.
- Surprise is an uncommon viable practical outlier. Its rarity signal is gated until selected-population performance exceeds the position baseline by at least 3 percentage points.
- Bounded Surprise discovery uses the existing wider selected-population seed payload while keeping the final public candidate list bounded.
- Stored objective evidence is authoritative only for legal, internally consistent roots with depth at least 12 and a score/mate value. Illegal, contradictory-root/PV, duplicate-later, shallow, or unscored lines cannot poison the objective baseline.
- Numeric weights and objective-loss guardrails are versioned implementation policy, recorded in the closure report and ranking tests.
- Manually requested legal candidates use the same deterministic ranking policy and retain their true rank.
- Generated AI explanation remains explanation-only and may not rank, mutate eligibility, Builder state, or course data.

### Future calibration, not an RB-027 blocker

Representative production usage may justify changing weights, sample floors, overperformance thresholds, engine depth requirements, or objective guardrails. Such changes require an explicit new ranking-policy version and evidence-backed task; they are not open implementation questions for RB-027.

Owner: future versioned calibration work if production evidence warrants it.

## Personal move familiarity and performance — RB-028 / #318

Status: resolved by RB-028. See `reports/RB-028-2026-08-10-personal-move-evidence-closure.md`.

### Locked implementation policy

- Builder shows exact-position factual personal history rather than broad Profile Aligned/Conflict as move familiarity.
- Familiarity uses all eligible indexed history; recency is shown separately.
- `COMMON` requires at least 5 distinct indexed games and at least 20% of the user's move choices from the exact position.
- Any previously played move below the Common policy is `RARE`; a legal candidate absent from successfully loaded personal history is `NEW`.
- Repeated occurrences in one game affect exact-position move share through occurrences, while familiarity game count remains distinct by game.
- Result context uses W/D/L-qualified games only and requires at least 10 known-result games.
- Result performance is compared with the user's result baseline from the same exact position; +/-5 percentage points separates above/below from neutral.
- Result-less indexed games can establish familiarity and recency without strengthening result confidence.
- Candidate Decision V4 exposes effective account, side, rated, speed and explicit all-indexed-history scope with the factual fields.
- The new all-history/context fields do not enter the existing Candidate Ranking personal input; personal history remains primarily informational in V2.

### Future calibration, not an RB-028 blocker

Production evidence may justify different Common/Result sample thresholds or wording. Any such change requires a new personal-evidence policy version rather than silently changing the meaning of `2026-08-personal-move-v1`.

Owner: future versioned calibration work if production evidence warrants it.

## Opponent preparation and computed coverage — RB-029 / #319

### Locked direction

- Opponent replies are preparation priorities, not persona/target/profile fit decisions.
- Primary evidence is peer relevance, personal encounters, objective challenge, and course state.
- Coverage is calculated from selected replies and shown as feedback, not configured in setup.
- The user can add/remove/defer/ignore responses before acceptance.

### Questions to resolve

- What deterministic rule creates the recommended response set without reintroducing a hidden fixed coverage percentage?
- When should a low-frequency but objectively challenging response enter the recommended set?
- When should repeated personal encounters promote a response that is uncommon in the target population?
- How should sparse public evidence affect selection versus warning copy?
- Does Masters evidence materially improve opponent preparation priority or only the detail view?
- How should existing course coverage affect recommended selection without hiding important gaps?
- Should cumulative coverage include responses with insufficient/stale population evidence, and if not how is that communicated?

Owner: RB-029 / #319.

## Single-dialog setup — RB-030 / #320

### Locked direction

- normal setup is one dialog;
- persona appears exactly once;
- normal controls are side/starting scope, speed population, rating target, and persona;
- coverage percentage and hard maximum-theory-burden controls leave the normal setup surface.

### Questions to resolve

- Which first-move shortcuts provide enough value without turning setup into an opening browser?
- What should `Other` do: use a small legal-move chooser, board entry, FEN/sequence input, or reuse an existing pattern?
- For Black, which scope shortcuts are understandable beyond `against 1.e4` and `against 1.d4`?
- How should exact course-review/profile launches lock or prefill scope without creating a second setup path?
- Which V1 target fields must remain for snapshot compatibility after the V2 contract is introduced?
- Is any independent soft theory preference still useful after the empirical personas are tested? This is deferred until evidence exists.

Owner: RB-030 / #320.

## Cockpit evidence hierarchy — RB-031 / #321

### Locked direction

- preserve RB-026's three-zone Cockpit;
- user-move rows foreground engine, peer, Masters, and factual personal history;
- opponent rows foreground preparation priority and computed coverage;
- opening identity/plans remain concise secondary explanation;
- ECO codes leave the normal Builder UI;
- ambiguous `target play` wording is replaced by explicit population wording.

### Questions to resolve

- Which 2–4 facts fit in a candidate row at desktop/tablet widths without losing scanability?
- How should peer overperformance be phrased when confidence is weak?
- Which deterministic reasons best explain why #1 outranks #2 without exposing a fake-precision aggregate?
- How should personal poor-result context be visually strong enough to notice without behaving like a warning/exclusion?
- Which current classification traits remain useful above the fold after recommendation authority moves to empirical evidence?
- Can authenticated populated review validate the Cockpit at representative desktop/tablet/mobile widths after the new evidence lands?

Owner: RB-031 / #321.

## Player Chess Profile

The standalone `/progress/profile` capability remains valid. Remaining product questions are independent of Builder V2:

- Does the profile feel credible/useful across populated desktop/mobile data?
- Are its opening dimensions understandable without more copy?
- Which profile conclusions are useful as optional inspiration or entry points once Builder no longer uses broad Profile Fit as a rank component?

Profile changes require their own evidence-backed work and must not be hidden inside RB-027–RB-031.

## Builder session and persistence

Still open under RB-D024:

- Is route-local state sufficient after V2 sessions are used regularly?
- Is cross-device resume required?
- Should multiple drafts be visible?
- What expiry/archive/delete behavior would persistence require?
- How should optimistic conflicts preserve the pure reducer as authority?

No V2 task may add persistence merely because it changes target or candidate contracts.

## Traps

The existing curated traps research remains separate from normal Surprise semantics.

Future questions remain:

- whether the pilot justifies a production capability;
- what engine/sample/editorial policy production evidence requires;
- how production trap evidence would remain separate from practical Surprise ranking.

No RB-027–RB-031 task may silently turn Surprise into traps integration.

## Outcome feedback — RB-016 / #104

RB-016 remains blocked. Its evidence cohort should be post-V2 so it does not measure superseded persona/profile/coverage semantics as the long-term product model.

Questions remain:

- How is repertoire adoption detected?
- What constitutes recall versus coincidental move choice?
- How is opening improvement separated from rating/opponent/context changes?
- When does a deferred branch become newly important from later games?
- Which post-V2 recommendation metadata must be retained to evaluate adoption honestly?

Owner: RB-016 / #104 after RB-027–RB-031 and sufficient real use.
