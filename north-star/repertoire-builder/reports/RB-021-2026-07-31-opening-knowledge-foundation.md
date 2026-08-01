# RB-021 research report — Side-aware opening knowledge foundation

Date: 2026-07-31

Task: `RB-021`

GitHub issue: `#240`

Branch: `rb-021/issue-240-opening-knowledge-research`

Delivery class: Research

Status: Review package

## Purpose

Define how Chess Repertoire Trainer can extend its deterministic opening classification with richer static knowledge without creating one curated object for every generated opening-book row and without making runtime behavior depend on an LLM or external website.

The requested product capability is broader than classification. Classification answers what kind of opening choice a name represents. Opening knowledge should answer what the resulting family or variation is generally about, what White is usually trying to achieve, what Black is usually trying to achieve, and when a broad strategic plan stops applying.

## Executive recommendation

Proceed with RB-022 using a separate, source-controlled and independently versioned `OpeningKnowledgeService` beside the existing lookup and classification services.

The knowledge layer should:

- consume an `OpeningBookEntry` and the existing `OpeningClassificationResult`;
- primarily select knowledge by stable classification rule IDs;
- permit a narrow knowledge-only selector over opening name, ECO and UCI prefix when strategic distinctions do not justify a classification rule;
- apply broad family knowledge first and narrower knowledge later;
- return separate White and Black strategic summaries and plans;
- preserve explicit partial and unavailable states;
- expose matched knowledge IDs, source IDs, confidence and review lifecycle;
- include only reviewed project-original prose in production results;
- require no database, background job, runtime LLM or runtime web lookup.

Do not add descriptions and plans directly to `OpeningSideClassification`. The classification taxonomy is compact factual metadata used by Player Chess Profile and deterministic candidate policy. Narrative strategic knowledge has different coverage, review, licensing, override and consumer requirements.

## Repository findings

### Existing opening identity

`OpeningLookupService` resolves the deepest generated entry by exact normalized position or by replayed moves. ECO lookup is intentionally broader and is a fallback. `OpeningBookEntry` already carries ECO, name, PGN, UCI, EPD and ply depth.

This means opening knowledge should continue to accept the resolved generated entry rather than inventing a second opening identity system.

### Existing classification inheritance

`OpeningClassificationService` applies ordered rules and returns:

- a versioned classification result;
- independent White and Black profiles;
- stable matched rule IDs;
- explicit unknown values;
- broad family inheritance, lexical modifiers, subfamily refinements and narrow line overrides.

Representative existing IDs include:

- `family-sicilian-defense`;
- `subfamily-sicilian-najdorf`;
- `family-french-defense`;
- `family-london-system`;
- `family-kings-indian-defense`;
- `family-grunfeld-defense`;
- `subfamily-italian-evans-gambit`;
- `line-italian-evans-gambit-accepted`;
- `family-benko-gambit`;
- `line-benko-gambit-accepted`;
- `modifier-exchange-variation`.

These IDs are a strong reusable selection surface, but they are not sufficient as the only surface. Some strategically important distinctions may leave the classification unchanged. For example, an Exchange variation can invalidate closed-centre pawn-chain plans without requiring a different soundness or theory classification. A narrow Najdorf branch may need different strategic guidance even when both branches remain sound, sharp, principal and high-theory.

### Existing Builder consumer

`CandidateDecisionService` already resolves the opening after each legal candidate move, classifies it and places side-specific classification in `CandidateOpeningEvidence`. The Builder therefore has an authoritative server-side insertion point. Angular should not perform a separate opening knowledge lookup.

### Existing AI review consumer

The game-review context currently contains the stored opening name/ECO, user color, deterministic tags, engine summary and authoritative move facts. It does not contain structured opening knowledge. The review service already versions prompt/schema input and hashes the authoritative context before persistence, which provides the required invalidation seam for a future knowledge version.

### Existing source-controlled knowledge precedent

The trap pilot demonstrates a useful repository-local precedent: versioned TypeScript records, stable IDs, lifecycle state, provenance, reviewed disposition and deterministic validation. Opening plans need a lighter model than trap occurrences, but should reuse the same principles rather than becoming anonymous prose embedded in a prompt.

## Architecture options considered

### Option A — Extend `OpeningSideClassification`

Rejected.

Advantages:

- one service call;
- existing regex hierarchy immediately available.

Problems:

- mixes compact classification dimensions with editorial narrative;
- forces classification version changes for copy-only corrections;
- makes all current classification consumers carry irrelevant prose;
- creates licensing and review concerns inside a deterministic taxonomy;
- does not provide plan identity, selective replacement or source-level provenance;
- encourages false pressure for complete knowledge coverage because classification coverage is complete.

### Option B — Independent second regex registry

Rejected as the default.

Advantages:

- complete independence;
- direct broad-to-narrow matching.

Problems:

- duplicates most family and subfamily selectors;
- allows classification and knowledge family boundaries to drift silently;
- doubles naming-maintenance work after upstream opening-book changes.

A narrow direct selector remains necessary as an escape hatch, but should not be the primary mechanism.

### Option C — Knowledge keyed only by `matchedRuleIds`

Insufficient by itself.

Advantages:

- no regex duplication;
- stable provenance;
- naturally reuses ordered classification inheritance.

Problem:

- not every strategic distinction should mutate the classification registry. Knowledge-specific exceptions need a direct selector.

### Option D — Hybrid knowledge rules

Accepted recommendation.

A knowledge rule primarily references one or more existing classification rule IDs and may additionally use its own narrow selector. It is evaluated against both the resolved entry and the classification result.

This preserves alignment with the classification hierarchy while allowing strategic overrides that do not belong in soundness/character taxonomy.

## Proposed TypeScript model

The exact names remain implementation details for RB-022, but the required concepts are:

```ts
export type OpeningKnowledgeLifecycle =
  | 'DRAFT'
  | 'REVIEWED'
  | 'DEPRECATED';

export type OpeningKnowledgeConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type OpeningKnowledgeLicense =
  | 'PROJECT_ORIGINAL'
  | 'CC0-1.0'
  | 'PUBLIC_DOMAIN'
  | 'CC-BY-SA-4.0'
  | 'REFERENCE_ONLY';

export interface OpeningKnowledgeSource {
  id: string;
  title: string;
  sourceRef: string;
  sourceType: 'DATASET' | 'REFERENCE' | 'PROJECT_RESEARCH';
  license: OpeningKnowledgeLicense;
  retrievedAt: string;
}

export interface OpeningKnowledgeStatement {
  text: string;
  confidence: OpeningKnowledgeConfidence;
  sourceIds: readonly string[];
}

export interface OpeningStrategicPlan {
  id: string;
  title: string;
  summary: string;
  conditions?: readonly string[];
  caveats?: readonly string[];
  confidence: OpeningKnowledgeConfidence;
  sourceIds: readonly string[];
}

export interface OpeningKnowledgeSelector {
  allClassificationRuleIds?: readonly string[];
  anyClassificationRuleIds?: readonly string[];
  namePattern?: RegExp;
  ecoPattern?: RegExp;
  uciPrefix?: string;
}

export interface OpeningSideKnowledgePatch {
  strategicSummary?: OpeningKnowledgeStatement;
  planMode?: 'MERGE' | 'REPLACE';
  removePlanIds?: readonly string[];
  plans?: readonly OpeningStrategicPlan[];
}

export interface OpeningKnowledgeRule {
  id: string;
  revision: number;
  lifecycle: OpeningKnowledgeLifecycle;
  selector: OpeningKnowledgeSelector;
  shortDescription?: OpeningKnowledgeStatement;
  description?: OpeningKnowledgeStatement;
  white?: OpeningSideKnowledgePatch;
  black?: OpeningSideKnowledgePatch;
  rationale: string;
}
```

The service result should include:

```ts
interface OpeningKnowledgeResult {
  status: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
  knowledgeVersion: string;
  classificationVersion: string;
  entry: OpeningBookEntry;
  shortDescription: OpeningKnowledgeStatement | null;
  description: OpeningKnowledgeStatement | null;
  white: OpeningSideKnowledge;
  black: OpeningSideKnowledge;
  matchedClassificationRuleIds: readonly string[];
  matchedKnowledgeRuleIds: readonly string[];
  sources: readonly OpeningKnowledgeSource[];
}
```

A consumer requesting one side may project the relevant side, but the canonical service should preserve both sides so rule validation and audits can detect accidental asymmetry or missing coverage.

## Deterministic matching and merge semantics

### Rule selection

A knowledge rule matches when:

1. every `allClassificationRuleIds` value is present;
2. at least one `anyClassificationRuleIds` value is present when that field is supplied;
3. every supplied direct selector matches the resolved opening entry.

At least one classification-ID selector or direct selector must exist.

Classification rule IDs referenced by a knowledge rule must exist in the active classification registry. This should fail validation rather than silently becoming unused knowledge.

### Ordering

Rules are applied in declaration order:

1. broad family knowledge;
2. reusable structural or naming refinements;
3. subfamily knowledge;
4. narrow line knowledge.

The ordering remains explicit and reviewable. Do not infer specificity from regex length or opening depth.

### Scalar fields

Later reviewed values replace earlier values for:

- short description;
- long description;
- side strategic summary.

A narrower rule may omit a scalar to inherit the broad value.

### Plans

Plans use stable IDs.

Default `planMode` is `MERGE`:

- inherited plans remain;
- a later plan with a new ID is appended;
- a later plan with the same ID replaces the inherited plan in place.

`removePlanIds` explicitly removes inherited plans that no longer apply.

`planMode: 'REPLACE'` clears all inherited plans for that side before applying the current rule. Use this when the structure fundamentally changes, such as a closed French family becoming an Exchange structure.

This is safer than concatenating every family plan and relying on the UI or LLM to resolve contradictions.

### Lifecycle

Only `REVIEWED` knowledge appears in the normal runtime projection.

`DRAFT` records remain available to validators and editorial audits but cannot leak into Builder or AI context. `DEPRECATED` records remain inspectable for history and stable-ID checks but do not match production results.

### Availability

Recommended result semantics:

- `AVAILABLE`: reviewed description plus at least one reviewed plan for both sides;
- `PARTIAL`: some reviewed content exists, but one description or one side is missing;
- `UNAVAILABLE`: no reviewed knowledge rule matched.

Consumers must not manufacture generic plans from classification tags when knowledge is partial or unavailable.

## Why plans should remain editorial statements

The first schema should not require structured move commands such as `pawnBreaks: ['f5']` or `pieceSquares: ['Ne5']` as product authority.

A typical plan is conditional. The same family can transpose, exchange pawns early, castle on opposite wings or enter an exceptional tactical branch. Over-structured move fields would look machine-actionable and could be mistaken for legal or recommended moves.

The bounded initial shape should use:

- title;
- concise summary;
- explicit conditions;
- explicit caveats.

Concrete moves and pawn breaks may appear inside reviewed prose. A later task may add machine-readable motifs only after a consumer demonstrates a precise need and a validation method.

## Source, licensing and authorship policy

### Opening identity source

The vendored `lichess-org/chess-openings` dataset remains the canonical source for names, ECOs, moves and positions. Its CC0 status makes it suitable for deterministic opening identity, but it does not supply the required strategic plan corpus.

### Reference sources

Opening pages, studies, articles, videos and books can inform research, but must not automatically become reusable text.

- Lichess pages and user studies should be recorded as `REFERENCE_ONLY` unless the exact component license is verified.
- Commercial sites, commercial books, videos, blogs and forum posts are discovery references only.
- Wikibooks material is CC BY-SA. Direct adaptation would require attribution and share-alike compliance and should not be the default source for project copy.
- Public-domain historical books can be used as supplementary references, but strategic theory may be obsolete.

### Preferred authorship model

Production text should be `PROJECT_ORIGINAL`:

1. collect at least two independent references for material strategic claims where practical;
2. use AI to organize research and draft original wording, not to copy or closely paraphrase source paragraphs;
3. compare the draft against opening move/position identity and known subvariation boundaries;
4. record source IDs for every statement and plan;
5. require editorial review before lifecycle becomes `REVIEWED`;
6. keep corrections as explicit revisions under stable IDs.

AI authorship is a development workflow, not runtime architecture and not factual provenance by itself.

### Confidence meaning

Confidence describes how broadly and reliably the editorial statement applies to the openings selected by the rule.

It does not mean engine evaluation confidence and does not inherit automatically from classification confidence.

- `HIGH`: stable characteristic across the selected family/subfamily with clear references;
- `MEDIUM`: generally useful but materially dependent on move order or common branch;
- `LOW`: useful orientation with substantial internal diversity or weak sourcing.

## Pilot validation matrix

RB-022 should begin with a bounded pilot that exercises inheritance and exceptions, not merely popular labels.

| Case | Why it is required | Expected merge behavior |
| --- | --- | --- |
| Sicilian Defense | broad asymmetric dynamic family | family descriptions and side plans |
| Najdorf Variation | major sharp subfamily | inherit Sicilian, refine both sides |
| Najdorf English Attack | plans depend on castling and pawn storms | narrow additions or replacement |
| Najdorf Poisoned Pawn | concrete tactical exception | narrow caveats; remove generic plans where misleading |
| French Defense | stable pawn-chain family | family plans for both sides |
| French Exchange | centre structure changes materially | replace closed-chain plans |
| Caro-Kann Defense | solid defence with recurring development problem | family plans, side-specific summaries |
| London System | system opening with broad move-order tolerance | family plans with explicit applicability caveats |
| Queen's Gambit | broad family | general central-pressure description |
| QGD and QGA | Black strategy differs after acceptance/decline | two narrower side-aware refinements |
| King's Indian Defense | opposite-wing strategic race | family plans with branch caveats |
| Grünfeld Defense | Black attacks White's centre rather than occupying it | distinct hypermodern plans |
| English / Réti | transpositional naming | shared or linked plan IDs without duplicate prose |
| Evans Gambit Accepted | White offerer / Black acceptor asymmetry | line refinement for both sides |
| Benko Gambit Accepted / Declined | Black offerer, White responder | separate accepted/declined overrides |

The pilot should include sample generated entries for each rule and assert the final plan IDs, not only that a rule matched.

## Representative rule sketches

### French family and Exchange replacement

```ts
{
  id: 'knowledge-family-french-defense',
  lifecycle: 'REVIEWED',
  selector: {
    allClassificationRuleIds: ['family-french-defense'],
  },
  white: {
    plans: [
      {
        id: 'french-white-use-space-and-pawn-chain',
        title: 'Use the space advantage',
        summary: 'Support the advanced centre and prepare play against the king side or the base of Black’s pawn chain.',
        conditions: ['The central pawn chain remains closed.'],
        caveats: ['Exchange structures require a different plan.'],
        confidence: 'HIGH',
        sourceIds: ['...'],
      },
    ],
  },
  black: {
    plans: [
      {
        id: 'french-black-undermine-centre',
        title: 'Attack the pawn chain',
        summary: 'Challenge White’s centre with the thematic queenside and kingside pawn breaks and solve the light-squared bishop.',
        conditions: ['White retains the advanced e-pawn chain.'],
        confidence: 'HIGH',
        sourceIds: ['...'],
      },
    ],
  },
}
```

```ts
{
  id: 'knowledge-french-exchange',
  lifecycle: 'REVIEWED',
  selector: {
    allClassificationRuleIds: [
      'family-french-defense',
      'modifier-exchange-variation',
    ],
    namePattern: /^French Defense: Exchange Variation/i,
  },
  white: { planMode: 'REPLACE', plans: [/* open-file and activity plans */] },
  black: { planMode: 'REPLACE', plans: [/* active piece-play plans */] },
}
```

### Najdorf subfamily

The Najdorf knowledge rule should inherit the broad Sicilian description but replace or refine generic plans with subfamily-specific development, central-break and flank-play guidance. An English Attack rule can add opposite-side castling conditions and a Poisoned Pawn rule can remove generic slow plans that are misleading in a forcing tactical branch.

### Benko accepted

The accepted line should preserve that Black is the gambit offerer. White plans should address consolidation and neutralizing queenside pressure. Black plans should address open files, long-term queenside activity and piece pressure. This is a direct example of why one opening-level paragraph cannot be reused unchanged for both sides.

## Validation and audit design

### Registry validation

RB-022 should fail on:

- duplicate knowledge rule IDs;
- duplicate plan IDs inside one final side result unless explicitly replacing;
- empty statements or plan fields;
- unknown classification rule references;
- stateful global/sticky regex flags;
- selectors with no criteria;
- rules with no content;
- reviewed content with missing source IDs;
- source IDs not found in the source registry;
- unsupported license values;
- `removePlanIds` that never target an inherited plan in representative fixtures;
- direct rules that match no pinned generated opening entry;
- reviewed rule revisions below one.

### Generated-book audit

Report separately:

- entries and unique names with any reviewed knowledge;
- short-description coverage;
- long-description coverage;
- White-plan coverage;
- Black-plan coverage;
- both-side plan coverage;
- partial and unavailable results;
- rule usage and unused knowledge rules;
- source/license distribution;
- low-confidence and draft counts.

Do not require 100% knowledge coverage merely because classification coverage is 100%.

### Imported-game-weighted audit

Reuse existing opening-name frequency and root-family grouping patterns to report reviewed knowledge coverage weighted by actual imported games. This is the primary expansion backlog because it reflects product relevance better than generated row count.

A future Builder-frequency audit may be added after enough candidate sessions exist. RB-022 should not introduce telemetry or persistence solely to produce that metric.

### Regression tests

Tests should assert:

- broad family inheritance;
- side-specific plan selection;
- same-ID plan replacement;
- explicit plan removal;
- full side replacement;
- knowledge-only name/ECO/UCI selector;
- transposition/name variants;
- accepted/declined gambit asymmetry;
- partial and unavailable results;
- draft/deprecated exclusion;
- complete processing of every generated opening entry.

## Repertoire Builder consumer boundary

RB-023 should extend the existing candidate opening evidence rather than create another endpoint.

Recommended bounded projection for each candidate:

- knowledge status and version;
- short description;
- selected target-side strategic summary;
- at most two or three selected target-side plans;
- matched knowledge IDs;
- confidence and source count if useful for explanation.

The server remains authoritative for opening identity and side. Angular should only present the returned projection.

Opening knowledge is explanatory. It must not change candidate eligibility, deterministic ranking components, target fit, profile fit, selected move, response coverage, session reducer state or course apply behavior.

The first UI should keep long descriptions behind focused/expanded evidence rather than place paragraphs on every candidate row.

## AI game-review stretch boundary

RB-024 may add reviewed knowledge to the existing explicit on-demand AI game-review request after RB-022 exists.

Recommended context:

- knowledge version;
- matched knowledge IDs;
- user-side strategic summary;
- a bounded list of user-side plans with conditions and caveats.

Where possible, the server should resolve the deepest opening from game PGN/moves rather than rely only on stored name/ECO. A synthetic name-only entry cannot reliably satisfy a knowledge `uciPrefix` selector.

The model may compare game events with supplied plans only when authoritative moves or engine evidence support the claim. It must not treat a general plan as a forced move or invent a plan absent from context.

Knowledge identity must participate in the stored-review input hash so a changed reviewed knowledge version invalidates stale generated interpretation.

## Recommended implementation sequence

### RB-022 / #241 — Proceed

Implement the transport-independent service, source registry, validators, audit commands and a bounded 25–50 rule reviewed corpus. Prioritize actual-game frequency and strategic diversity.

No API, Angular, Prisma or runtime LLM belongs in RB-022.

### RB-023 / #242 — Proceed after RB-022 review

Add a bounded projection to existing candidate evidence and present it in the focused Builder evidence surface. Preserve all deterministic ranking and session behavior.

### RB-024 / #243 — Defer as stretch until RB-022 proves quality

The architecture is viable, but AI game-review grounding should wait until reviewed plans exist and can be tested against real games. It is independent of RB-023 presentation.

## Validation performed

- inspected the current opening lookup, classification types/rules/service, classification audits, Builder candidate service/contract, AI game-review context/service, opening-book documentation and North Star architecture decisions;
- verified the current family/subfamily/line rule hierarchy and representative stable rule IDs;
- compared separate-service, duplicate-registry, ID-only and hybrid selector designs;
- tested the proposed merge semantics conceptually against fifteen representative opening cases;
- reviewed current source/licensing boundaries for `lichess-org/chess-openings`, Lichess component/user content, Wikibooks/Creative Commons material and public-domain historical books;
- created RB-021 through RB-024 GitHub issues and explicit dependency boundaries;
- claimed RB-021 on a dedicated branch and recorded ownership in issue #240.

## Validation skipped

- no production TypeScript implementation or compiler validation;
- no generated-book knowledge audit because no knowledge corpus exists yet;
- no automated source-text similarity or plagiarism check;
- no chess-engine validation because general plans are editorial strategic knowledge rather than engine claims;
- no authenticated Builder or AI-review browser test;
- no local repository test suite: a local GitHub checkout was unavailable because the environment could not resolve `github.com`; repository inspection and writes used the connected GitHub API.

## Limitations and residual risks

- strategic opening guidance is editorial and can be disputed or become stale as theory evolves;
- broad family plans can still overgeneralize despite conditions and caveats;
- classification rule IDs are stable project provenance, but restructuring the classifier requires a knowledge-reference audit;
- source provenance does not by itself prove that original prose is not an overly close paraphrase;
- multilingual presentation is not solved; the initial corpus should use one canonical language and add localization only through a separate reviewed strategy;
- initial coverage will be intentionally incomplete;
- deciding which two or three plans are most useful in Builder may require later UI/product calibration.

## Standalone product impact

A static opening knowledge service would provide reusable opening explanations for opening browsing, game analysis and future educational surfaces even before Builder presentation is added.

## North-star impact

The knowledge layer enriches the intrinsic opening evidence layer without collapsing it into population behavior, player performance or repertoire intent. It can explain candidate character and strategic direction while preserving the deterministic ranking and human decision model.

## Queue recommendation

Add RB-021 through RB-024 after the completed deterministic and optional-intelligence stages:

- RB-021: P1 research, now in review;
- RB-022: P1 implementation foundation, blocked on RB-021 acceptance;
- RB-023: P2 Builder consumer, blocked on RB-022;
- RB-024: P3 AI stretch consumer, blocked on RB-022.

RB-016 remains separately blocked on real adoption/outcome evidence. Opening knowledge work does not unblock or replace that gate.

## Files and architecture areas inspected

- `AGENTS.md`
- `.github/instructions/docs.instructions.md`
- `north-star/repertoire-builder/AGENTS.md`
- `north-star/repertoire-builder/README.md`
- `north-star/repertoire-builder/FOUNDATION.md`
- `north-star/repertoire-builder/FEATURES.md`
- `north-star/repertoire-builder/ROADMAP.md`
- `north-star/repertoire-builder/TASKS.md`
- `north-star/repertoire-builder/GITHUB_ISSUES.md`
- `north-star/repertoire-builder/STATUS.md`
- `north-star/repertoire-builder/DECISIONS.md`
- `north-star/repertoire-builder/OPEN_QUESTIONS.md`
- `north-star/repertoire-builder/tasks/RB-003-opening-classification-foundation.md`
- `north-star/repertoire-builder/tasks/RB-014-traps-foundation-discovery.md`
- `north-star/repertoire-builder/tasks/RB-015-llm-role-discovery.md`
- `north-star/repertoire-builder/tasks/RB-019-builder-candidate-explanation-prototype.md`
- `north-star/repertoire-builder/reports/RB-003-2026-07-27-opening-classification-rules.md`
- `north-star/repertoire-builder/reports/RB-017-2026-07-31-curated-traps-pilot.md`
- `docs/opening-book.md`
- `apps/api/src/services/opening-book/openingBook.types.ts`
- `apps/api/src/services/opening-book/openingLookupService.ts`
- `apps/api/src/services/opening-book/openingClassification.types.ts`
- `apps/api/src/services/opening-book/openingClassification.rules.ts`
- `apps/api/src/services/opening-book/openingClassification.coverage.rules.ts`
- `apps/api/src/services/opening-book/openingClassification.coverage.corrections.rules.ts`
- `apps/api/src/services/opening-book/openingClassificationService.ts`
- `apps/api/src/services/opening-book/openingClassificationAudit.ts`
- `apps/api/src/scripts/audit-opening-classification.ts`
- `apps/api/src/modules/candidate-decision/candidate-decision.service.ts`
- `packages/contracts/src/candidate-decision/candidate-decision.schemas.ts`
- `apps/api/src/modules/ai/game-review/game-review-context.ts`
- `apps/api/src/modules/ai/game-review/game-review.service.ts`
- `apps/api/src/modules/trap-pilot/trap-pilot.types.ts`
- `apps/api/src/modules/trap-pilot/trap-pilot.data.ts`
