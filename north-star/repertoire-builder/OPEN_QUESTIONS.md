# Repertoire Builder Open Questions

Last updated: 2026-08-11

Open questions are not decisions. Resolve them in an assigned task and update `DECISIONS.md` when a product decision becomes locked, revised, or rejected.

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

Status: resolved. See `reports/RB-027-2026-08-10-empirical-persona-ranking-v2-closure.md`.

Locked current policy includes role-specific personas, exact-position target-side baselines, 20-game selected-population and 10-game Masters authority floors, Surprise rarity/overperformance safeguards, bounded stored-engine authority, and explicit versioned weights/guardrails through `2026-08-empirical-persona-v2`.

Future calibration requires representative evidence and a new ranking-policy version; it is not unfinished RB-027 work.

## Personal move familiarity and performance — RB-028 / #318

Status: resolved. See `reports/RB-028-2026-08-10-personal-move-evidence-closure.md`.

Locked current policy `2026-08-personal-move-v1` defines factual exact-position Common/Rare/New, all-indexed familiarity, recency, move share, sample-qualified result context and effective history scope. Result-less games can strengthen familiarity but not result confidence. These facts do not become hidden preset persona rank authority.

Future threshold/copy calibration requires a new personal-evidence policy version.

## Opponent preparation and computed coverage — RB-029 / #319

Status: resolved after original PR #331 plus corrective PR #333. See `reports/RB-029-2026-08-10-opponent-preparation-closure.md`.

### Locked current policy

- opponent replies are preparation priorities, not persona/target/profile fit decisions;
- policy version is `2026-08-opponent-preparation-v1`;
- source discovery includes bounded engine, target population, Masters, exact-position personal replies, opponent-side course context and explicit manual inclusion before final truncation;
- target-population evidence requires at least 20 games;
- population relevance uses the greater of 3% absolute frequency or 20% of the strongest observed reply at the exact position;
- at least three exact-position personal encounters independently qualify a reply;
- forced mate against the repertoire side or at least 100 cp objective challenge independently qualifies danger;
- course coverage/transposition is inspectable ordering context but does not alone make a long-tail reply recommended;
- recommended replies default selected and remain individually editable/resettable;
- selected coverage is the sum of usable target-population contributions of selected replies and remains unavailable when no usable contribution exists;
- AI explanation, API policy provenance and Builder UI consume the same role-aware authority.

Future opponent-policy recalibration requires representative evidence and an explicit policy-version change.

## Single-dialog setup — RB-030 / #320

Status: resolved. See `reports/RB-030-2026-08-11-single-dialog-setup-v2-closure.md`.

### Locked current behavior

- normal setup is one dialog;
- persona appears exactly once;
- visible controls are side/starting scope, speed population, rating target, and persona;
- coverage percentage and hard maximum-theory-burden controls are absent from normal setup;
- White/Black common first-move scopes use `1.e4`, `1.d4`, `1.c4`, and `1.Nf3` roots;
- `Other` accepts FEN, PGN, SAN or UCI and resolves to an exact draft-root FEN;
- exact course-review/opponent-gap launches preserve their exact source position and do not expose a misleading broader scope choice;
- V1 target compatibility remains fixed at coverage `80` and theory ceiling `HIGH`, with `HIGH` deliberately non-restrictive so an invisible setup value cannot reject high-theory candidates;
- no Builder-session persistence or automatic course creation was introduced.

### Future evidence question

Whether a genuinely understandable independent soft theory preference is useful remains open only as future product evidence. It must not reappear merely to preserve the old classification ceiling.

## Cockpit evidence hierarchy — RB-031 / #321

Status: resolved. See `reports/RB-031-2026-08-10-cockpit-evidence-hierarchy-closure.md`.

### Locked current behavior

- RB-026's three-zone Cockpit remains the product composition;
- user-move rows/brief foreground engine, target-population, Masters, factual personal and meaningful course evidence;
- opponent rows foreground RB-029 preparation priority and computed selected coverage;
- deterministic reason filtering/formatting remains presentation-only and does not recreate ranking in Angular;
- opening identity/plans remain concise secondary explanation;
- normal ECO codes and obsolete primary Target/Profile-fit chips are removed;
- responsive ordering preserves target-population evidence longer than Masters in compressed rows while the full decision brief remains available.

Authenticated populated browser/device observation was unavailable during closure and remains observational evidence that can be collected later; it is not unfinished ranking/presentation implementation by itself.

## Player Chess Profile

The standalone `/progress/profile` capability remains valid. Remaining product questions are independent of Builder V2:

- Does the profile feel credible/useful across populated desktop/mobile data?
- Are its opening dimensions understandable without more copy?
- Which profile conclusions are useful as optional inspiration or entry points now that broad Profile Fit is not Builder rank authority?

Profile changes require their own evidence-backed work and must not be hidden inside completed RB-027–RB-031 tasks.

## Builder session and persistence

Still open under RB-D024:

- Is route-local state sufficient after V2 sessions are used regularly?
- Is cross-device resume required?
- Should multiple drafts be visible?
- What expiry/archive/delete behavior would persistence require?
- How should optimistic conflicts preserve the pure reducer as authority?

No completed V2 task implies persistence simply because target or candidate contracts changed.

## V1 target compatibility

RB-030 preserves the current V1 target shape with fixed compatibility coverage/theory values. A future structural cleanup remains an explicit contract-design question:

- Is a new target contract version justified after enough V2 usage?
- Which historical/current snapshots require backward parsing or migration?
- Can compatibility fields be removed without silently changing replay/reproducibility semantics?

This is not a READY implementation task today.

## Traps

The existing curated traps research remains separate from normal Surprise semantics.

Future questions remain:

- whether the pilot justifies a production capability;
- what engine/sample/editorial policy production evidence requires;
- how production trap evidence would remain separate from practical Surprise ranking.

No completed V2 semantics should silently turn Surprise into traps integration.

## Outcome feedback — RB-016 / #104

RB-016 remains blocked. Its evidence cohort is post-V2 and requires sufficient real usage before promotion.

Questions remain:

- How is repertoire adoption detected?
- What constitutes recall versus coincidental move choice?
- How is opening improvement separated from rating/opponent/context changes?
- When does a deferred branch become newly important from later games?
- Which V2 recommendation metadata must be retained to evaluate adoption honestly?

Owner: RB-016 / #104 after sufficient post-V2 Builder/course use, training and follow-up-game evidence.
