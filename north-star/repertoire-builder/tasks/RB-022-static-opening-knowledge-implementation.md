# RB-022 — Implement static side-aware opening knowledge

Status: DONE

Priority: P1

Order: 170

Delivery class: Implementation foundation

Planning maturity: Implemented, self-reviewed and validated

GitHub issue: #241

Review PR: #255

Claimed by: ChatGPT agent session

Claim branch: `rb-022/issue-241-static-opening-knowledge`

Claimed at: 2026-08-01

Completed at: 2026-08-01

## Objective

Implement the architecture accepted from RB-021 as a deterministic, source-controlled opening knowledge foundation.

For a resolved named opening, the application can retrieve:

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

The delivered corpus contains 25 reviewed rules covering:

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

## Acceptance assessment

- one service call returns side-aware reviewed knowledge for an `OpeningBookEntry` plus classification: met;
- broad inheritance, same-ID replacement, explicit removal and full replacement: met and tested;
- stable plan identity, side, confidence and source references: met;
- conditions and caveats: met;
- invalid references, duplicate IDs, empty content, malformed selectors, unsupported source types/licenses and missing sources fail validation: met and tested;
- invalid calendar dates, no-op merge patches and non-canonical UCI whitespace are handled deterministically: met and tested;
- draft/deprecated content cannot leak: met and tested;
- representative and all-generated-row regression coverage: met;
- generated-book and game-weighted audits remain separate from classification coverage: met and wired into CI;
- audit artifacts are valid JSON: met;
- no Prisma model, migration, runtime LLM/web call, background job, public API, Angular/mobile UI, ranking change or course write: preserved;
- `docs/opening-book.md` and North Star reporting: updated;
- complete repository CI: passed before squash merge.

## Explicit exclusions preserved

- public HTTP or shared wire contract;
- Repertoire Builder presentation;
- AI game-review integration;
- machine-actionable move recommendations or forced plan fields;
- full generated-name knowledge coverage requirement;
- database persistence or editorial CMS;
- runtime source retrieval or generation.

## Completion evidence

- Implementation report: `north-star/repertoire-builder/reports/RB-022-2026-08-01-static-opening-knowledge.md`
- Pull request: #255
- Generated-book audit: 3,733 entries, 25 exercised rules and 10 exercised runtime provenance sources
- Review hardening: exact calendar-date validation, source-type validation, no-op patch rejection, normalized UCI matching, valid JSON CI artifacts and removal of one unused runtime source entry

## Queue impact

- RB-023 / #242 is unblocked and becomes `READY`.
- RB-024 / #243 is unblocked by stable knowledge identity but remains a lower-priority P3 stretch consumer.
