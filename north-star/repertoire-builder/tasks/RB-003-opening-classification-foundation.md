# RB-003 — Establish named opening classification foundation

Status: DONE

Priority: P0

Order: 30

Delivery class: Dual-use

Planning maturity: Detailed

Claimed by: ChatGPT

Claim branch: `rb-003/issue-91-opening-classification-discovery`

Claimed at: 2026-07-27

Claim scope: deliver a deterministic, versioned, side-aware opening-classification foundation using human-readable ordered regex rules authored and reviewed in-repository. The delivered slice classifies broad opening families and selected subfamilies/exceptions across separate soundness, character, theoretical-status, theory-burden, and role dimensions; supports different White and Black assessments for the same named line; and provides explicit unknowns, provenance, confidence, coverage auditing, and representative tests. No database migration, runtime LLM dependency, imported-game aggregation, API/UI change, engine audit, or modification of generated upstream opening data is included.

## Outcome

Establish a reusable foundation through which every named opening used by the application can expose a side-aware intrinsic opening profile, with explicit unknowns where the reviewed regex rules do not yet provide a reliable assessment.

The implementation deliberately favors a small transparent rule registry over one manually stored record per generated opening entry.

## Why this task exists

Player-profile conclusions and repertoire candidate fit need a stable vocabulary for opening character, soundness, theoretical status, and learning burden. The same taxonomy can improve opening browsing and analysis independently.

The generated Lichess opening book contains thousands of deeply named entries. Many entries share meaningful family or subfamily characteristics, so exact per-entry curation would add maintenance cost without proportional product value.

## Current repo anchors inspected

- generated Lichess opening-book source, update script, types, and lookup service;
- exact ECO, normalized FEN, move-sequence lookup and deterministic tie-breaking;
- imported-game opening assignment;
- opening analysis integration;
- generated opening-book volume and naming examples;
- deterministic imported-game tagging rules and user-perspective conventions;
- canonical opening-book and imported-game-tag documentation.

## Dependencies

Independent from RB-001 and RB-002.

RB-004, RB-006, and RB-007 may consume the side-aware classification output. RB-018 / issue #116 owns systematic coverage expansion and may run in parallel with RB-004.

## Approved implementation direction

### Rule ownership

- Initial assessments are authored by ChatGPT using chess knowledge and committed as readable source rules.
- Runtime classification is deterministic and has no LLM dependency.
- Rules expose rationale, confidence, and stable IDs so controversial classifications can be reviewed or overridden directly.

### Matching and inheritance

- Broad family regex rules provide useful defaults across related generated names.
- More specific subfamily and exact-line rules apply later and override scalar dimensions while extending traits and roles.
- Generic lexical modifiers may add safe information, for example that a named gambit is usually sharp, but must not automatically label every gambit dubious.
- Unmatched or partially understood entries remain explicitly unknown.

### Side-aware semantics

Each result contains separate White and Black profiles. The same named line may therefore describe:

- a playable or risky gambit choice by the offering side;
- a sound or principal accepting response by the other side;
- shared sharp or tactical position character;
- later variation-specific overrides for either side.

The Evans Gambit is the required regression example: White's gambit offer and Black's accepted principal response do not receive the same soundness or role assessment merely because the opening name is shared.

### Initial dimensions

- objective soundness: sound, playable, risky, dubious, unknown;
- character traits: solid, balanced, positional, dynamic, sharp, tactical, surprise;
- theoretical status: principal, mainline, sideline, surprise, unknown;
- theory burden: low, medium, high, unknown;
- role: initiator, responder, gambit offerer, gambit acceptor, gambit decliner;
- confidence and matched rule IDs.

These dimensions remain independent. Sharp is not synonymous with dubious, and principal is not synonymous with solid.

## Delivered scope

- versioned classification types and service under the existing opening-book service area;
- ordered broad-family, subfamily, modifier, and exact exception regex rules;
- asymmetric White/Black profiles;
- representative gambit, family inheritance, dubious-line, and unknown tests;
- deterministic audit script for generated-book coverage and rule usage;
- canonical opening-book documentation;
- completion report and north-star decision/status synchronization;
- follow-up RB-018 task and GitHub issue for systematic coverage completion.

## Out of scope

- systematic classification of all opening families and high-frequency unknowns, owned by RB-018;
- Player Chess Profile aggregation and conclusions, owned by RB-004/RB-005;
- repertoire candidate ranking, owned by RB-007;
- database persistence or one row per generated opening;
- API or Angular presentation;
- runtime LLM calls;
- Stockfish or engine-assisted classification auditing;
- silently modifying generated upstream opening data;
- traps database design.

## Acceptance criteria status

- Deterministic, versioned, transport-independent classifier: complete.
- Independent White/Black profiles: complete.
- Evans Gambit offer/acceptance asymmetry: complete and tested.
- Generic `Gambit` does not imply dubiousness: complete and tested.
- Mikenas-Carls family inheritance: complete and tested.
- Specific rule overrides: complete and tested.
- Every generated entry processes with explicit unknowns: complete and tested.
- Coverage and per-rule audit output: complete.
- Representative inheritance/asymmetry/dubious/unknown tests: complete.
- No database, API, UI, runtime AI, engine audit, or generated-book mutation: confirmed.
- Systematic coverage completion is explicitly separated into RB-018.

## Validation

GitHub Actions run `30239257847` passed on implementation head `d547fa689ea44c69f2abee31158f68299bc81a2f`:

- TypeScript lint;
- complete workspace build;
- architecture guardrails;
- PostgreSQL migrations;
- complete repository test suite, including the new opening-classification tests and full generated-book processing.

The audit command is available as:

```sh
npm run opening-book:classification-audit --workspace=apps/api
```

No browser validation was required because this task changes no UI.

## Completion updates

The implementation unblocks RB-004 and provides the intrinsic opening-profile contract required by RB-006 and RB-007. RB-018 owns systematic rule expansion and actual-game coverage calibration without reopening the foundation.

## Completion

Report: `reports/RB-003-2026-07-27-opening-classification-rules.md`

Completed at: 2026-07-27
