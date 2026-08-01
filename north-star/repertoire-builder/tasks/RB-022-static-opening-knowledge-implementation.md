# RB-022 — Implement static side-aware opening knowledge

Status: READY

Priority: P1

Order: 170

Delivery class: Implementation foundation

Planning maturity: Accepted architecture; ready to claim

GitHub issue: #241

## Objective

Implement the architecture accepted from RB-021 as a deterministic, source-controlled opening knowledge foundation.

For a resolved named opening, the application must be able to retrieve:

- a concise description;
- a longer description;
- independent White and Black strategic summaries;
- reviewed typical plans with conditions and caveats;
- knowledge version, confidence, lifecycle and provenance;
- matched classification and knowledge rule IDs.

## Dependency

RB-021 / #240 is complete and accepted. The implementation must follow locked decision RB-D046 and the RB-021 reports unless a new explicit architecture revision is approved.

## Expected architecture

Place the transport-independent capability beside the existing opening lookup and classification services under `apps/api/src/services/opening-book/`.

The accepted direction is:

- a separate `OpeningKnowledgeService` and independently versioned registry;
- primary selection through existing classification rule IDs;
- optional narrow name/ECO/UCI selectors for knowledge-only strategic distinctions;
- ordered family inheritance followed by subfamily and line overrides;
- stable plan IDs with deterministic merge, removal and replacement semantics;
- reviewed project-original prose only in runtime results.

Any implementation deviation requires explicit rationale and must preserve the accepted research criteria.

## Required capability

- versioned TypeScript knowledge and source schemas;
- deterministic registry validation;
- broad-family inheritance and narrow overrides;
- independent White and Black plans;
- explicit `AVAILABLE`, `PARTIAL` and `UNAVAILABLE` states;
- stable knowledge rule and plan IDs;
- source/license/retrieval provenance;
- reviewed lifecycle separate from draft/deprecated records;
- initial bounded corpus selected by actual-game relevance and strategic diversity;
- generated-book and imported-game-weighted knowledge audits;
- regression tests over representative generated entries and all generated rows.

## Initial corpus

Use the RB-021 pilot matrix and expand to approximately 25–50 reviewed rules, subject to implementation evidence. Cover materially different structures and side asymmetries rather than chasing one record per generated name.

Required pilot areas include:

- Sicilian and Najdorf, including a narrow branch exception;
- French and French Exchange replacement semantics;
- Caro-Kann;
- London;
- Queen's Gambit with accepted/declined divergence;
- King's Indian;
- Grünfeld;
- English/Réti transpositional treatment;
- Evans Gambit Accepted;
- Benko Accepted and Declined.

## Acceptance criteria

- one service call returns side-aware reviewed knowledge for an `OpeningBookEntry` plus its classification result;
- broad knowledge can be inherited, refined, removed or replaced deterministically;
- every plan has stable identity, side, confidence and source references;
- conditions and caveats prevent generic plans from being presented as forced theory;
- invalid rule references, duplicate IDs, empty content, malformed selectors, unsupported licenses and missing sources fail validation;
- draft/deprecated content cannot leak into normal runtime results;
- tests cover inheritance, same-ID replacement, explicit removal, full replacement, side asymmetry, transposition/name variants, knowledge-only selectors and unknown fallback;
- audits report knowledge availability separately from classification match coverage;
- no Prisma model, migration, runtime LLM/web call, background job, public API, Angular/mobile UI, ranking change or course write is added;
- `docs/opening-book.md` and North Star planning/reporting are updated;
- complete repository CI passes.

## Explicit exclusions

- public HTTP or shared wire contract;
- Repertoire Builder presentation;
- AI game-review integration;
- machine-actionable move recommendations or forced plan fields;
- full generated-name knowledge coverage requirement;
- database persistence or editorial CMS;
- runtime source retrieval or generation.

## Blocks

- RB-023 / #242.
- RB-024 / #243.
