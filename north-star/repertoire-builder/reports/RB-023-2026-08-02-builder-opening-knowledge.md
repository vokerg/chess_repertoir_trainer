# RB-023 implementation report — Builder opening knowledge presentation

Date: 2026-08-02

Task: `RB-023`

GitHub issue: `#242`

Branch: `rb-023/issue-242-builder-opening-knowledge`

Delivery class: Consumer integration

Status: Review package

## Outcome

Projected the reviewed static opening knowledge delivered by RB-022 through the existing authoritative candidate-decision path and into the focused Repertoire Builder evidence experience.

The implementation:

- versions the candidate-decision contract as `2026-08-v2`;
- keeps opening classification and opening knowledge as separate nested evidence;
- resolves knowledge from the same resulting `OpeningBookEntry` and classification used by each candidate;
- selects only the repertoire target side;
- exposes explicit `AVAILABLE`, `PARTIAL` and `UNAVAILABLE` states;
- bounds the response to at most three plans, four conditions/caveats per plan and twelve rule/source IDs;
- shows the selected side's strategic summary and reviewed plans in the existing focused evidence grid;
- snapshots the opening-knowledge version independently from classification in Builder decision evidence;
- preserves existing ranking, eligibility, target/profile fit, coverage, queue and course-write behavior.

No separate opening-knowledge endpoint, browser-side opening lookup, new Angular store, runtime AI call, ranking policy or course-content generation was added.

## Contract shape

`CandidateOpeningEvidence.knowledge` now contains:

- status and knowledge version;
- concise description and target-side strategic summary with confidence;
- up to three reviewed target-side plans;
- bounded conditions, caveats and confidence for each plan;
- matched knowledge rule IDs and final source IDs.

The candidate contract version changed while `CANDIDATE_RANKING_POLICY_VERSION` remains `2026-07-deterministic-v1` because knowledge is explanatory evidence only.

## Authoritative projection

`CandidateDecisionService` resolves each candidate's resulting position, opening identity and classification as before. It now passes the same entry and classification to `OpeningKnowledgeService`, then projects White or Black according to `request.target.side`.

The projection happens before candidate ranking, but the ranking input remains the existing classification/statistical/course evidence. Knowledge status, prose and plan IDs are not ranking components.

## Focused experience

The Builder continues to render one candidate at a time through `previewCandidate`.

The existing focused evidence grid now includes:

- an opening-knowledge row with explicit status and the selected side's strategic summary;
- one compact row per reviewed plan;
- conditions and caveats appended to the relevant plan detail;
- an explicit unavailable message while the opening profile remains independently usable.

Candidate switching changes the nested evidence object, preventing plans from a previously selected candidate from remaining visible.

## Regression coverage

Coverage includes:

- contract bounds and versioning;
- White/Black side selection;
- partial and unavailable knowledge;
- bounded plan projection;
- unchanged ranking component shape and ranking policy version;
- coexistence with profile and course evidence;
- candidate switching and manual board selection;
- opening-knowledge version capture in Builder evidence references;
- optional generated interpretation remaining separate from the new knowledge payload.

## Validation status

Exact-head CI evidence will be recorded on the pull request after the review package completes lint, build, audits, migrations and the full repository test suite.
