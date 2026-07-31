# RB-021 — Research side-aware opening knowledge foundation

Status: IN_PROGRESS

Priority: P1

Order: 165

Delivery class: Research

Planning maturity: Claimed discovery

GitHub issue: #240

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

## Required pilot

Test the proposed model against at least twelve materially different cases, including:

- a broad family with many branches;
- a system opening;
- a sharp principal line;
- a side-asymmetric gambit;
- a positional defence;
- a hypermodern defence;
- a line whose plans change materially in a subvariation;
- a transpositional naming case.

Candidate families include the Sicilian/Najdorf, London, French, Caro-Kann, Queen's Gambit, King's Indian, Grünfeld, English/Réti, Evans Gambit and Benko Gambit.

## Deliverables

- research report under `north-star/repertoire-builder/reports/`;
- recommended architecture and deterministic merge semantics;
- proposed TypeScript data shape with representative records;
- source, license, provenance and review policy;
- validator and coverage-audit design;
- consumer contract sketches for Repertoire Builder and AI game review;
- explicit proceed/revise/defer recommendation for RB-022, RB-023 and RB-024;
- synchronized task queue, status, roadmap, decisions, open questions and GitHub issue metadata.

## Acceptance criteria

- side-specific plans are mandatory and independently reviewable;
- the design requires neither a database nor one record per generated opening row;
- runtime product behavior requires no external AI or web lookup;
- original text, factual provenance and licensing boundaries are explicit;
- broad inheritance and narrow overrides are demonstrated with real opening examples;
- missing knowledge stays explicit rather than being generated optimistically;
- Builder knowledge remains explanatory and cannot affect deterministic ranking in this task;
- AI game review remains a downstream stretch consumer;
- implementation tasks have clear dependencies and non-goals;
- validation performed and skipped is recorded honestly.

## Dependencies

- RB-003 and RB-018 are complete.
- Preserve the RB-015/RB-019/RB-020 AI authority boundary.

## Blocks

- RB-022 / #241 — static opening knowledge implementation.
- RB-023 / #242 — Repertoire Builder presentation.
- RB-024 / #243 — AI game review grounding.

## Explicit exclusions

- production opening-knowledge code or corpus;
- database schema or persistence;
- public API or shared wire-contract changes;
- Angular or mobile presentation;
- ranking-policy changes;
- course generation or writes;
- runtime LLM or runtime source lookup;
- automatic copying or paraphrasing from unlicensed sources.
