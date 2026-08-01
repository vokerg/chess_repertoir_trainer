# RB-022 — Implement static side-aware opening knowledge

Status: IN_PROGRESS

Priority: P1

Order: 170

Delivery class: Implementation foundation

Planning maturity: Review package implemented; CI and review pending

GitHub issue: #241

Claimed by: ChatGPT agent session

Claim branch: `rb-022/issue-241-static-opening-knowledge`

Claimed at: 2026-08-01

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

RB-021 / #240 is complete and accepted. The implementation follows locked decision RB-D046 and the RB-021 reports.

## Implemented architecture

The transport-independent capability is placed beside the existing opening lookup and classification services under `apps/api/src/services/opening-book/`.

The implementation provides:

- a separate `OpeningKnowledgeService` and `2026-08-knowledge-v1` registry;
- primary selection through existing classification rule IDs;
- narrow name/ECO/UCI selectors for knowledge-only strategic distinctions;
- ordered family inheritance followed by subfamily and line overrides;
- stable plan IDs with deterministic merge, removal and replacement semantics;
- reviewed project-original prose only in runtime results;
- source/license/retrieval provenance and strict registry validation;
- generated-book and imported-game-weighted coverage audits.

## Initial corpus

The review package contains 25 reviewed rules covering:

- English and Réti transpositions;
- Sicilian, Najdorf, English Attack and Poisoned Pawn;
- French and French Exchange replacement semantics;
- Caro-Kann;
- London;
- Queen's Gambit, QGD and QGA;
- King's Indian;
- Grünfeld;
- Evans Gambit and Evans Gambit Accepted;
- Benko family, Accepted and Declined;
- Catalan, Slav, Nimzo-Indian and Queen's Indian.

## Acceptance criteria status

- one service call returns side-aware reviewed knowledge for an `OpeningBookEntry` plus classification: implemented;
- broad inheritance, same-ID replacement, explicit removal and full replacement: implemented and tested;
- stable plan identity, side, confidence and source references: implemented;
- conditions and caveats: implemented;
- invalid references, duplicate IDs, empty content, malformed selectors, unsupported licenses and missing sources fail validation: implemented and tested;
- draft/deprecated content cannot leak: implemented and tested;
- representative and all-generated-row regression coverage: implemented;
- generated-book and game-weighted audits remain separate from classification coverage: implemented and wired into CI;
- no Prisma model, migration, runtime LLM/web call, background job, public API, Angular/mobile UI, ranking change or course write: preserved;
- `docs/opening-book.md` and North Star reporting: updated.

## Explicit exclusions preserved

- public HTTP or shared wire contract;
- Repertoire Builder presentation;
- AI game-review integration;
- machine-actionable move recommendations or forced plan fields;
- full generated-name knowledge coverage requirement;
- database persistence or editorial CMS;
- runtime source retrieval or generation.

## Validation pending

The branch contains TypeScript build validation, registry startup validation, focused Node regression tests, all-row generated-book processing, and CI audit artifact steps. Exact CI evidence will be recorded after the pull-request run completes.

## Blocks

- RB-023 / #242.
- RB-024 / #243.
