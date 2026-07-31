# RB-021 — Research side-aware opening knowledge foundation

Status: REVIEW

Priority: P1

Order: 165

Delivery class: Research

Planning maturity: Review package complete; decision pending

GitHub issue: #240

Review PR: #244

Claimed by: ChatGPT agent session

Claim branch: `rb-021/issue-240-opening-knowledge-research`

Claimed at: 2026-07-31

Claim scope: Research and document a trustworthy source-controlled opening-knowledge layer extending the existing regex-based side-aware opening classification with concise descriptions, longer descriptions, White plans, Black plans, conditions/caveats, provenance, confidence, review lifecycle, deterministic merge semantics, validation and consumer boundaries. This task may add planning and research documents only. It excludes runtime implementation, API/contracts, Angular, Prisma, course writes, ranking changes and runtime LLM/web calls.

## Objective

Define a maintainable opening knowledge foundation that can answer, for a named opening and selected side:

- what kind of position this opening generally creates;
- what the player is usually trying to achieve;
- which typical strategic plans are relevant;
- when those plans apply and where they stop being reliable;
- how the information was researched, reviewed and versioned.

The design must reuse the existing family/subfamily/override model without requiring one manually curated record for every generated opening-book row.

## Verified repository baseline

- `OpeningLookupService` identifies openings from the vendored generated opening book.
- `OpeningClassificationService` applies ordered regex rules, independently classifies White and Black, versions the result and returns stable `matchedRuleIds`.
- classification coverage is complete for the pinned generated opening-book names, while unknown dimensions remain explicit.
- `CandidateDecisionService` already exposes deterministic side-specific opening classification as Builder candidate evidence.
- AI game review receives opening ECO/name, user color, deterministic tags and authoritative engine/move facts, but no structured opening plans.
- North Star AI decisions keep generated prose outside deterministic ranking, Builder state and course writes.

## Research questions

1. Should knowledge be implemented as a separate service, an extension of classification, or a registry keyed by existing classification rule IDs?
2. How should broad-family defaults, subfamily refinements and narrow line overrides merge?
3. What is the smallest useful versioned contract for descriptions, side-specific plans, conditions, caveats, provenance, confidence and lifecycle?
4. How can a typical plan remain useful without implying that it is forced or valid in every transposition?
5. Which sources may be reused directly, which may only guide research, and how should AI-assisted authorship be reviewed?
6. How should initial coverage be prioritized: generated names, imported-game frequency, Builder candidate frequency or a bounded editorial pilot?
7. Which validators and audits are required before production use?
8. How should downstream Builder and AI review consumers receive knowledge without changing their authority boundaries?

## Accepted research recommendation for review

Proceed with a separate, independently versioned `OpeningKnowledgeService` beside opening lookup/classification.

- consume the resolved opening entry and existing classification result;
- primarily select knowledge through stable classification rule IDs;
- allow a narrow name/ECO/UCI selector for strategic distinctions that do not belong in classification;
- apply broad family knowledge before subfamily and line rules;
- keep stable plan IDs with explicit merge, removal and full-replacement semantics;
- preserve separate White and Black summaries/plans, conditions, caveats, confidence, lifecycle and provenance;
- include only reviewed project-original prose in runtime results;
- require no database, runtime LLM or runtime web lookup.

Descriptions and plans should not be added directly to `OpeningSideClassification` because they have different coverage, editorial, licensing, version and consumer semantics.

## Required pilot

The report tests the model against materially different cases including:

- Sicilian and Najdorf branches;
- French and French Exchange replacement;
- Caro-Kann;
- London;
- Queen's Gambit, QGD and QGA;
- King's Indian;
- Grünfeld;
- English/Réti transpositions;
- Evans Gambit Accepted;
- Benko Accepted and Declined.

## Deliverables

- research report under `north-star/repertoire-builder/reports/`;
- recommended architecture and deterministic merge semantics;
- proposed TypeScript data shape with representative records;
- source, license, provenance and review policy;
- validator and coverage-audit design;
- consumer contract sketches for Repertoire Builder and AI game review;
- explicit proceed/revise/defer recommendation for RB-022, RB-023 and RB-024;
- synchronized task queue, status, roadmap, feature catalog and GitHub issue metadata.

`DECISIONS.md` remains intentionally unchanged until the review recommendation is accepted, revised or rejected. The accepted disposition must be synchronized during review completion.

## Acceptance assessment

- side-specific plans are mandatory and independently reviewable: met in the proposed contract and pilot;
- no database or one record per generated row: met;
- no runtime AI/web dependency: met;
- original text, provenance and licensing boundaries: defined;
- broad inheritance and narrow overrides: demonstrated with family/subfamily/line and knowledge-only selectors;
- explicit missing/partial knowledge: defined;
- Builder knowledge remains explanatory and outside ranking: preserved;
- AI game review remains a downstream stretch consumer: preserved;
- implementation tasks have clear dependencies and non-goals: RB-022 through RB-024 created;
- validation performed and skipped is recorded: met in the report and PR.

## Dependencies

- RB-003 and RB-018 are complete.
- Preserve the RB-015/RB-019/RB-020 AI authority boundary.

## Blocks

- RB-022 / #241 — static opening knowledge implementation.
- RB-023 / #242 — Repertoire Builder presentation.
- RB-024 / #243 — AI game review grounding.

## Explicit exclusions preserved

- production opening-knowledge code or corpus;
- database schema or persistence;
- public API or shared wire-contract changes;
- Angular or mobile presentation;
- ranking-policy changes;
- course generation or writes;
- runtime LLM or runtime source lookup;
- automatic copying or close paraphrasing from unlicensed sources.

## Validation

Completed:

- direct current-repository inspection;
- architecture option comparison;
- representative rule/plan merge pilot;
- external source/license policy research;
- canonical task/issue/dependency synchronization;
- branch comparison against current `main` with no runtime files changed.

Skipped:

- compiler and tests because this is documentation-only research;
- generated knowledge audit because no corpus exists;
- browser, provider and engine validation;
- local checkout validation because the environment could not resolve `github.com`; connected GitHub API operations succeeded.

## Review decision

Review PR #244 should choose one disposition:

1. accept and unblock RB-022;
2. revise architecture, schema, merge semantics, source policy or task split;
3. defer and close follow-ons as not planned.

No merge or issue closure should occur without explicit approval.

## Completion evidence

Research report: `reports/RB-021-2026-07-31-opening-knowledge-foundation.md`

Review PR: #244
