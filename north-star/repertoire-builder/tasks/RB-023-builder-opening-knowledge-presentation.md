# RB-023 — Surface opening knowledge in Repertoire Builder

Status: BLOCKED

Priority: P2

Order: 175

Delivery class: Consumer integration

Planning maturity: Research-defined; awaiting RB-022

GitHub issue: #242

## Objective

Use reviewed static opening knowledge to make Repertoire Builder candidate choices easier to understand.

When a candidate enters or identifies an opening, the focused evidence experience should be able to show a compact description and the most relevant typical plans for the selected repertoire side.

## Dependencies

- RB-021 / #240 must be accepted.
- RB-022 / #241 must deliver a reviewed knowledge service and initial corpus.

Do not claim this task while either dependency remains blocked or in research review.

## Verified insertion point

`CandidateDecisionService` already resolves and classifies the opening reached by each candidate and exposes `CandidateOpeningEvidence`. Opening knowledge must be projected through that authoritative server-side path rather than fetched independently by Angular.

## Required behavior

- version the candidate-decision contract change;
- enrich candidate opening evidence with knowledge status/version, short description and a bounded target-side projection;
- return the selected side's strategic summary and at most two or three reviewed plans;
- preserve matched knowledge IDs and explicit unavailable/partial states;
- keep long descriptions in focused or expandable evidence rather than every candidate row;
- distinguish intrinsic opening knowledge from engine, population, masters, personal, profile and course evidence;
- use existing Angular Builder data-access, store and component patterns;
- add no direct opening-data lookup from the browser.

## Authority boundary

Opening knowledge is explanatory evidence only. It must not change:

- candidate eligibility or ranking components;
- target-fit or profile-fit calculations;
- selected candidate or opponent responses;
- coverage thresholds or cumulative coverage;
- Builder reducers, revisions, branch states or queue order;
- course preview, conflict handling or apply behavior.

Any future ranking use requires a separate versioned policy task and evidence.

## Acceptance criteria

- every returned plan matches the authoritative opening and target side for that candidate;
- stale or mismatched knowledge cannot be displayed after candidate, position, target or side changes;
- missing knowledge leaves the existing classification evidence fully usable;
- the contract, Fastify route schema/OpenAPI and clients are updated through existing repository conventions;
- the UI remains compact and does not dump generic prose into every candidate row;
- White/Black selection, partial/unavailable knowledge, candidate switching and unchanged ranking/session state are covered by focused tests;
- AI-specific state or generation is not introduced;
- complete repository CI and authenticated browser validation pass.

## Explicit exclusions

- ranking-policy changes;
- separate opening knowledge endpoint for Builder;
- direct Angular regex or lookup logic;
- runtime LLM generation;
- course content generation;
- game-review integration;
- mobile implementation unless separately scoped after inspecting the native Builder surface.
