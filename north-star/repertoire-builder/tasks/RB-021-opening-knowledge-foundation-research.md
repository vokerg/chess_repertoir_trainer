# RB-021 — Research side-aware opening knowledge foundation

Status: DONE

Priority: P1

Order: 165

Delivery class: Research

Planning maturity: Accepted and complete

GitHub issue: #240

Review PR: #244

Claimed by: ChatGPT agent session

Claim branch: `rb-021/issue-240-opening-knowledge-research`

Claimed at: 2026-07-31

Accepted at: 2026-08-01

## Objective

Define a maintainable opening knowledge foundation that can answer, for a named opening and selected side:

- what kind of position the opening generally creates;
- what the player is usually trying to achieve;
- which typical strategic plans are relevant;
- when those plans apply and where they stop being reliable;
- how the information was researched, reviewed and versioned.

The design must reuse the existing family/subfamily/override model without requiring one manually curated record for every generated opening-book row.

## Accepted architecture

Implement a separate, independently versioned `OpeningKnowledgeService` beside opening lookup/classification.

- Consume the resolved `OpeningBookEntry` and existing `OpeningClassificationResult`.
- Primarily select knowledge through stable classification rule IDs.
- Allow narrow name/ECO/UCI selectors for strategic distinctions that do not belong in classification.
- Apply broad family knowledge before subfamily and line rules.
- Keep descriptions and independent White/Black plans outside `OpeningSideClassification`.
- Use stable plan IDs with deterministic merge, explicit removal and full replacement semantics.
- Preserve conditions, caveats, confidence, lifecycle, source IDs and matched-rule provenance.
- Include only reviewed project-original prose in normal runtime results.
- Preserve explicit `AVAILABLE`, `PARTIAL` and `UNAVAILABLE` states.
- Require no database, background job, runtime LLM or runtime web lookup.

## Source and editorial policy

- `lichess-org/chess-openings` remains the CC0 opening identity source.
- Public opening pages, studies, articles, videos and books remain reference-only unless exact reuse terms are verified.
- Direct CC BY-SA adaptation is not the default workflow.
- AI may assist research and drafting, but runtime text must be original, source-bound, cross-checked and editorially reviewed.

## Authority boundaries

- Opening classification remains the compact intrinsic taxonomy.
- Opening knowledge has separate versioning and intentionally incomplete coverage.
- Builder presentation cannot change ranking, eligibility, fit, coverage, session state or course writes.
- AI game-review grounding remains optional, on-demand and non-authoritative.

## Pilot evidence

The research model was tested against:

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

## Acceptance assessment

- side-specific plans are mandatory and independently reviewable: met;
- no database or one record per generated row: met;
- no runtime AI/web dependency: met;
- original text, provenance and licensing boundaries: defined and accepted;
- broad inheritance and narrow overrides: demonstrated;
- explicit missing/partial knowledge: defined;
- Builder authority boundary: preserved;
- AI review remains a stretch consumer: preserved;
- follow-on tasks and dependencies: synchronized.

## Validation

GitHub Actions CI run #1736 passed on review head `710b18b110034a0b322b91e919425328a0fff553`, including lint, build, both opening-classification audits, architecture guardrails, migrations and the full test suite.

## Completion evidence

- Architecture report: `reports/RB-021-2026-07-31-opening-knowledge-foundation.md`
- Source appendix: `reports/RB-021-2026-07-31-opening-knowledge-sources.md`
- Closure report: `reports/RB-021-2026-08-01-closure.md`
- Pull request: #244

## Queue impact

- RB-022 / #241 is unblocked and becomes `READY`.
- RB-023 / #242 remains blocked on the reviewed RB-022 service and corpus.
- RB-024 / #243 remains blocked on stable RB-022 knowledge identity.
