# RB-023 — Surface opening knowledge in Repertoire Builder

Status: IN_PROGRESS

Priority: P2

Order: 175

Delivery class: Consumer integration

Planning maturity: Implementation review package; CI and review pending

GitHub issue: #242

Claimed by: ChatGPT agent session

Claim branch: `rb-023/issue-242-builder-opening-knowledge`

Claimed at: 2026-08-02

## Objective

Use reviewed static opening knowledge to make Repertoire Builder candidate choices easier to understand.

When a candidate enters or identifies an opening, the focused evidence experience shows a compact description and the most relevant typical plans for the selected repertoire side.

## Dependencies

- RB-021 / #240 is accepted and complete.
- RB-022 / #241 delivered the reviewed `OpeningKnowledgeService`, initial corpus and stable knowledge identity through PR #255.

## Implemented insertion point

`CandidateDecisionService` already resolves and classifies the opening reached by each candidate and exposes `CandidateOpeningEvidence`. The implementation projects opening knowledge through that same authoritative server-side path rather than fetching it independently from Angular.

## Implemented behavior

- candidate-decision contract versioned as `2026-08-v2`;
- candidate opening evidence enriched with knowledge status/version, concise description and target-side projection;
- selected side's strategic summary and at most three reviewed plans returned;
- matched knowledge IDs, source IDs and explicit unavailable/partial states preserved;
- plan conditions and caveats bounded and retained;
- knowledge displayed only in the focused evidence experience, not every candidate row;
- intrinsic opening profile and opening knowledge remain separate evidence items;
- existing Angular data-access and page-scoped store reused;
- no direct opening-data lookup from the browser.

## Authority boundary preserved

Opening knowledge is explanatory evidence only. It does not change:

- candidate eligibility or ranking components;
- target-fit or profile-fit calculations;
- selected candidate or opponent responses;
- coverage thresholds or cumulative coverage;
- Builder reducers, revisions, branch states or queue order;
- course preview, conflict handling or apply behavior.

`CANDIDATE_RANKING_POLICY_VERSION` remains `2026-07-deterministic-v1`.

## Acceptance criteria status

- authoritative opening and target-side plans: implemented;
- stale or mismatched knowledge after candidate switching: prevented by nested candidate evidence and covered by store regression;
- missing knowledge leaves classification usable: implemented and tested;
- contract, Fastify OpenAPI and clients: updated through existing contracts;
- compact focused UI: implemented in the existing evidence grid;
- White/Black, partial/unavailable, bounded plans and unchanged ranking/session state: covered by focused tests;
- AI-specific state or generation: not introduced;
- complete repository CI: pending exact-head pull-request validation;
- authenticated live-browser validation: pending review environment availability.

## Explicit exclusions preserved

- ranking-policy changes;
- separate opening knowledge endpoint for Builder;
- direct Angular regex or lookup logic;
- runtime LLM generation;
- course content generation;
- game-review integration;
- mobile implementation.
