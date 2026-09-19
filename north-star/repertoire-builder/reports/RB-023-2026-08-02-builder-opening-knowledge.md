# RB-023 implementation report — Builder opening knowledge presentation

Date: 2026-08-02

Task: `RB-023`

GitHub issue: `#242`

Pull request: `#262`

Branch: `rb-023/issue-242-builder-opening-knowledge`

Delivery class: Consumer integration

Status: Complete

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

`CandidateOpeningEvidence.knowledge` contains:

- status and knowledge version;
- concise description and target-side strategic summary with confidence;
- up to three reviewed target-side plans;
- bounded conditions, caveats and confidence for each plan;
- matched knowledge rule IDs and source IDs.

The contract rejects inconsistent states: unavailable knowledge cannot carry reviewed content or provenance, while partial or available knowledge requires a version, content, matched rule and source provenance.

The candidate contract version changed while `CANDIDATE_RANKING_POLICY_VERSION` remains `2026-07-deterministic-v1` because knowledge is explanatory evidence only.

## Authoritative projection

`CandidateDecisionService` resolves each candidate's resulting position, opening identity and classification as before. It passes the same entry and classification to `OpeningKnowledgeService`, then projects White or Black according to `request.target.side`.

The projection happens before candidate ranking, but the ranking input remains the existing classification/statistical/course evidence. Knowledge status, prose and plan IDs are not ranking components.

## Focused experience

The Builder continues to render one candidate at a time through `previewCandidate`.

The existing focused evidence grid includes:

- an opening-knowledge row with explicit status and the selected side's strategic summary;
- one compact row per reviewed plan;
- conditions and caveats appended to the relevant plan detail;
- explicit warning treatment for `PARTIAL` knowledge;
- an explicit unavailable message while the opening profile remains independently usable.

Candidate switching changes the nested evidence object, preventing plans from a previously selected candidate from remaining visible.

## Self-review findings and corrections

The final maintainer review identified and fixed three issues:

1. source-version snapshots previously depended on the first returned candidate; they now select the first candidate that actually carries each source version;
2. the public contract permitted contradictory knowledge status/content combinations; strict cross-field validation now rejects them;
3. the new `PARTIAL` status had no explicit visual treatment in the focused evidence grid; it now uses the existing warning treatment.

The review also confirmed that the current reviewed knowledge corpus is classification-backed, ranking inputs are unchanged, there are no unresolved review threads, and no generated-AI input was added.

## Regression coverage

Coverage includes:

- contract bounds, cross-field invariants and versioning;
- White/Black side selection;
- partial and unavailable knowledge;
- bounded plan projection;
- unchanged ranking component shape and ranking policy version;
- coexistence with profile and course evidence;
- candidate switching and manual board selection;
- opening-knowledge version capture even when an earlier candidate lacks version metadata;
- optional generated interpretation remaining separate from the new knowledge payload.

## Validation and merge gate

PR #262 must pass the complete exact-head CI workflow after all self-review corrections before squash merge. The workflow covers lint, the full monorepo build, classification and knowledge audits, architecture guardrails, migrations, imported-game audits and the complete repository test suite.

An authenticated live application/browser was not available in the execution environment. Angular store/view-model regressions plus the production web build and complete web test suite provide the available UI validation evidence.
