# Opening-grounded AI game review

The existing imported-game AI review can consume reviewed static opening knowledge without changing its explicit, feature-gated provider boundary.

## Authoritative input path

`buildGameReviewContext` replays the stored PGN server-side and derives the UCI move sequence. It resolves the deepest opening available from that sequence and falls back to the imported game's stored ECO/name when no move-based match exists.

The resolved entry is passed through the existing deterministic services:

1. `OpeningClassificationService.classify`;
2. `OpeningKnowledgeService.resolve`;
3. White or Black projection according to the imported game's `userColor`.

The provider receives only:

- knowledge status and version;
- resolved opening ECO/name and lookup source;
- the user's side;
- concise reviewed description and strategic summary;
- at most three user-side plans;
- at most four conditions and four caveats per plan;
- at most twelve matched reviewed knowledge-rule IDs.

Long descriptions, opposite-side plans, source registry records, browser state and runtime opening research are excluded.

The context builder also returns the same bounded opening projection as a typed server-side result. Reconciliation therefore does not reparse the provider payload or depend on browser-supplied opening data.

## Generated-claim validation

The prompt treats plans as strategic reference context, not forced moves or engine conclusions.

Every concrete plan-alignment or missed-opportunity claim must include a structured reference with:

- an exact supplied plan ID;
- an authoritative game ply;
- `ALIGNED` or `MISSED_OPPORTUNITY` claim type.

The server rejects the generated review when:

- the plan ID was not supplied;
- the ply does not exist;
- a user-side plan is attached to an opponent move;
- `MISSED_OPPORTUNITY` lacks meaningful score-loss or move-classification evidence;
- the same plan and ply are repeated or assigned contradictory claim types.

Provider-authored `openingAssessment` prose is not copied into the public review. The server assembles the public assessment from reviewed strategic text, reviewed plan title/summary, authoritative move identity and the validated claim type. `ALIGNED` wording remains explicitly generated interpretation; `MISSED_OPPORTUNITY` wording states that move analysis supports only a possible opportunity.

Missing opening knowledge is represented as deterministic `UNAVAILABLE` context and deterministic no-guidance public prose. The provider cannot substitute invented opening theory.

## Stored-review validity

The game-review prompt version is version 2. The external `GAME_REVIEW` response schema remains version 1 because its wire shape is unchanged.

Grounding version 2 is included in the stored input hash so reviews created before server-side opening-assessment reconciliation become stale even when their prompt-version metadata is already 2.

The stored input hash includes the complete bounded context, including opening-knowledge version, matched rule IDs and plan content. Loading a saved review verifies:

- response schema version;
- prompt version;
- configured model;
- completed analysis-run identity;
- grounding version through the recomputed hash;
- complete authoritative input hash.

A mismatch returns `review: null`. It does not call the provider automatically. The user may explicitly generate a new review through the existing route.

## Preserved boundaries

This integration does not:

- enable AI widgets by default;
- add an automatic or background provider request;
- alter engine analysis, game tags or opening assignment;
- change deterministic ranking, Builder state or course content;
- persist generated opening knowledge;
- add a database table, migration or public endpoint;
- perform runtime web research.
