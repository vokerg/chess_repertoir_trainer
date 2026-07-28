# Player Chess Profile

## Role

The Player Chess Profile is a deterministic, recalculable API capability built from owned imported games. It separates what the player chooses from how those choices perform and exposes the evidence behind every result. It is designed for a future standalone profile experience and for later repertoire-target defaults; it does not persist a personality label or mutate courses.

The authenticated endpoint is:

```http
GET /api/player-chess-profile
```

The shared request and response schemas live in `packages/contracts/src/player-chess-profile`.

## Filters and evidence unit

The endpoint supports:

- account IDs;
- inclusive UTC date-only range;
- the RB-001 speed presets `ALL`, `BLITZ_AND_SLOWER`, `BLITZ`, and `BULLET`;
- White/Black color selection;
- rated or unrated games;
- user-rating and opponent-rating ranges;
- a bounded supporting-game limit.

The evidence unit is one owned `ImportedGame` row. Multiple selected accounts are aggregated through the existing ownership predicate. Cross-provider game deduplication is not attempted because the repository has no stable cross-provider game identity; consumers can segment by account when that distinction matters.

Only standard chess is eligible: `variant` may be null, `chess`, or `standard`. The endpoint reuses `buildImportedGameWhere` and applies all counts and groups in Prisma. It does not load the matching game corpus into Node.

## Population and player-level boundary

The response embeds the completed RB-001/RB-002 peer-resolution result for the requested speed preset. It does not calculate, average, persist, or override a second player-level model. Peer resolution remains the existing user-level factual context; account/date filters change the profile evidence but do not rewrite the factual normalization policy.

## Preference versus performance

`preference.items` measures exposure only. For every classified opening group, the user's side contributes to these RB-003 dimensions:

- character;
- soundness;
- theoretical status;
- theory burden;
- role.

Multi-valued character and role classifications contribute to each applicable value, so exposure percentages inside those dimensions are not expected to sum to 100%.

`performance.items` reports independent outcome measurements for the same dimension/value groups:

- score percentage: `(wins + 0.5 × draws) / games`;
- score delta against the selected-game baseline;
- opening-positive rate from `OPENING_SUCCESS` or `OPENING_ADVANTAGE` tags;
- opening-trouble rate from `OPENING_DISASTER` or `OPENING_TROUBLE` tags;
- early-mistake rate from `EARLY_BLUNDER` or `EARLY_MISTAKE` tags;
- user-side average accuracy.

Result score uses all selected games with a recognized result. Opening-quality, early-mistake, and accuracy metrics use analysed-game coverage and remain null when their denominator is unavailable. Tag-based opening metrics are supporting signals, not an unexplained personality source.

## Opening classification and boundedness

The repository first groups matching games by opening ECO, opening name, and user color, ordered by frequency. At most 100 opening/color groups are returned to Node for RB-003 classification and dimension aggregation. The response records:

- named opening games;
- games represented by the bounded groups;
- omitted games;
- whether the group cap was reached;
- classified games;
- low-confidence games;
- games with an unknown core classification dimension.

Exact generated-book name/ECO matches use the complete generated entry, including move-order metadata. Otherwise the stored name/ECO is classified through the same ordered RB-003/RB-018 rules and marked with source `STORED_NAME_ECO`. No classification rule is duplicated or persisted by this feature.

## Evidence strength

Result evidence uses the following deterministic sample grades:

- fewer than 5 games: `INSUFFICIENT`;
- 5–14: `LOW`;
- 15–39: `MEDIUM`;
- 40 or more: `HIGH`.

Analysis evidence uses the analysed-game sample but is forced to `INSUFFICIENT` when fewer than 5 games are analysed or analysis coverage is below 50% of the group. These grades qualify the evidence only; they are not statistical significance claims and are unrelated to the factual rating-normalization confidence boundary.

## Conclusions and wording constraints

The service emits a small deterministic conclusion set:

- strongest opening-character exposure when at least 5 classified games support it;
- a better or worse character result only with at least 10 games and a score delta of at least 5 percentage points from baseline;
- elevated opening trouble only with usable analysis evidence and a rate at least 5 percentage points above baseline;
- otherwise an insufficient-data conclusion.

Wording is deliberately correlational: it says what happened in the selected games. It must not claim that an opening character caused rating improvement or that a permanent player personality has been proved.

## Supporting evidence

The response includes:

- up to three highest-volume opening references for every dimension/value item;
- the bounded opening-group summaries used by the calculation;
- 1–10 most recent matching game references, according to the request.

The endpoint returns summaries only. Full owned game detail remains available through the existing imported-game endpoints.

## Ownership and exclusions

The feature owns calculation, aggregation, wire contracts, and the authenticated endpoint. It does not add:

- a Prisma model or migration;
- stored profile snapshots or personality labels;
- a polished Angular profile page;
- candidate ranking;
- course writes;
- LLM-authored conclusions;
- changes to rating normalization or opening-classification rules.
