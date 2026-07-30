# RB-015 LLM role discovery

Date: 2026-07-30

Status: complete

Task: RB-015

GitHub issue: #103

Research PR: #216

Research squash commit: `9a4e6166c9a874b8cb5b5efb04a2a4661e848d45`

Final research CI: run `30526417275` / #1617 — success

## Executive decision

An LLM is justified only as optional generated interpretation around already-authoritative Builder facts.

It is not justified as part of:

- chess evaluation or opening classification;
- candidate ranking, eligibility, reasons, warnings, fit or coverage;
- selected move or response state;
- builder reducers, revisions, branch state or queue order;
- completion eligibility;
- destination choice, preview, conflict handling, apply validation, transaction or course write;
- profile calculation or Course review findings.

The accepted next step is two independent P3 stretch prototypes:

1. **RB-019 / issue #218 — advisory candidate explanation** beside the existing Focused evidence panel.
2. **RB-020 / issue #219 — post-apply Builder course summary** after the authoritative RB-011 apply result.

Player-profile narrative or conversational target refinement is deferred until RB-004/RB-005 are accepted against populated data and a concrete gap remains after deterministic evidence-aware copy and explicit controls.

## Repository findings

The repository already contains a disciplined optional AI game-review experiment:

- server-only OpenAI-compatible configuration;
- global and use-case disabled-by-default flags;
- bounded structured context;
- native `fetch` rather than a provider SDK;
- Zod output validation;
- authoritative reconciliation of referenced move facts;
- explicit provider, timeout, rate-limit and malformed-output failures;
- controlled existing artifact persistence;
- no normal raw prompt/context/output logging;
- capability-driven Angular visibility;
- removable presentation composition.

This proves that an isolated AI feature can fit the repository. It does not grant generated text product authority.

## Deterministic authority map

### Candidate decision

RB-007 and `CandidateDecisionService` own ordered candidate evidence, eligibility, target fit, profile fit, reasons, warnings and opponent coverage.

`RepertoireBuilderStore` owns selected candidates/responses and all RB-009 session commands and transitions.

### Course materialization

`RepertoireBuilderCourseStore` and RB-011 own destination selection, preview, exact target, preview-token binding, apply eligibility, transaction, course revision and authoritative result.

### AI boundary

Generated interpretation is a read-only leaf:

```text
immutable deterministic snapshot
            |
            v
bounded server-side AI context adapter
            |
            v
schema-validated generated interpretation
            |
            v
optional presentation panel
```

No generated field or command flows back into deterministic state.

## RB-019 — advisory candidate explanation

Approved as a non-critical P3 stretch prototype.

Insertion point: immediately after the selected candidate's existing **Focused evidence** panel.

Required boundaries:

- explicit **Explain this trade-off** request only;
- no request on load, preview, selection or response toggle;
- `AI_WIDGETS_ENABLED` plus `AI_BUILDER_CANDIDATE_EXPLANATION_ENABLED`;
- separate `widgets.builderCandidateExplanation` capability;
- page-scoped AI state outside `RepertoireBuilderStore`;
- server-side reconstruction of authoritative RB-007 evidence;
- transient output keyed to target, position, role, policy, response generation and candidate identity;
- unsupported identifiers or facts rejected or reconciled;
- provider failure leaves the deterministic evidence and all Builder controls intact;
- no recommendation command, ranking replacement or state mutation.

The existing Focused evidence panel and a deterministic comparison template are the controls against which usefulness must be measured.

## RB-020 — post-apply Builder course summary

Approved as a non-critical P3 stretch prototype.

Insertion point: immediately after the course dialog renders a successful authoritative `result()`.

Required boundaries:

- explicit request only after apply succeeds;
- unavailable during destination selection, preview, target selection and confirmation;
- `AI_WIDGETS_ENABLED` plus `AI_BUILDER_COMPLETION_SUMMARY_ENABLED`;
- separate `widgets.builderCompletionSummary` capability;
- AI state outside `RepertoireBuilderCourseStore`;
- context limited to completed draft/session facts, exact destination, excluded branches and RB-011 apply result;
- transient output cleared on dialog, draft or result change;
- generated factual references reconciled to supplied identifiers and counts;
- provider failure leaves the authoritative result visible;
- no target selection, preview, apply, revision or course mutation.

The existing result block and a deterministic structured completion summary are the controls.

## Why the prototypes are separate

They differ in timing, risk and lifecycle:

- RB-019 is adjacent to an active decision and carries higher implied-authority risk.
- RB-020 is post-write and summarizes a different authoritative snapshot.

Separate tasks provide independent flags, contracts, prompts, metrics, failure semantics, reviews and purge paths.

A generic `AI_REPERTOIRE_BUILDER_ENABLED` capability or shared mutable Builder-AI store is rejected.

## Provider verification

The intended DeepSeek provider remains compatible with the existing OpenAI-compatible client boundary.

Official DeepSeek sources reviewed on 2026-07-30 state:

- the OpenAI-format base URL is `https://api.deepseek.com`;
- JSON output uses `response_format: { "type": "json_object" }` and also requires the prompt to request JSON;
- JSON mode may occasionally return empty content;
- model names and prices are mutable and should be checked at implementation time;
- older `deepseek-chat` and `deepseek-reasoner` aliases were scheduled for deprecation on 2026-07-24 in favor of current V4 names;
- public privacy terms describe processing/storage in the People's Republic of China and purpose-dependent retention;
- the public privacy policy does not provide an API-specific zero-retention commitment and says downstream end-user processing through open-platform applications is outside that policy's coverage.

Sources:

- `https://api-docs.deepseek.com/guides/function_calling/`
- `https://api-docs.deepseek.com/guides/json_mode/`
- `https://api-docs.deepseek.com/quick_start/pricing`
- `https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html`

Consequences for RB-019/RB-020:

- treat provider payloads as external data transfers;
- minimize context and exclude unnecessary personal identifiers and history;
- keep provider configuration and raw context server-side;
- do not persist prototype output or normally log prompt/context/output;
- retain explicit timeout, malformed/empty-output, rate-limit and provider-failure handling;
- re-verify API, model, price, privacy, retention and regional-compliance facts when implementation starts;
- disable only the optional prototype when provider or policy requirements are not satisfied.

No live provider call was needed for this architecture decision and none was performed.

## Purge test

Each prototype must be removable by deleting only:

- its use-case adapter and prompt;
- its AI-specific contract fields;
- its use-case flag and capability boolean;
- its feature-local data access/store;
- its optional presentation composition;
- its tests and documentation.

Removal must not require a migration, ranking-policy change, builder-session conversion, course repair, deterministic API compatibility layer, route change or navigation change.

## Evaluation delegated to the prototype tasks

RB-019 and RB-020 must compare:

1. existing UI/no new feature;
2. deterministic template;
3. LLM output.

They must test:

- factual grounding and unsupported references;
- stale-response suppression;
- disabled/unconfigured capability behavior;
- timeout, rate-limit, empty, malformed and schema-invalid output;
- unchanged deterministic store/reducer/apply state;
- usefulness and undue-authority risk across novice, club and stronger-player review.

## Validation completed

- Inspected current AI configuration, routes, client, game-review prompt/service/contracts and Angular composition.
- Inspected current candidate contract/service boundary and Builder workbench/store.
- Inspected RB-009 session authority and RB-011 course dialog/store boundary.
- Defined deterministic/no-feature controls, grounding, failure, staleness, privacy, persistence and purge rules.
- Created RB-019/#218 and RB-020/#219 as independent canonical stretch tasks.
- Reviewed current official DeepSeek API, JSON-output, pricing and privacy sources.
- PR #216 final head `7e7495485969c8dca1c515066c41df472817b6e8` passed CI run `30526417275` / #1617.
- PR #216 was squash-merged to `main` as `9a4e6166c9a874b8cb5b5efb04a2a4661e848d45`.

Not performed and intentionally not claimed:

- live provider requests;
- generated prototype output;
- authenticated browser prototype testing;
- human usefulness testing;
- production endpoint, contract, prompt or Angular implementation.

Those belong to RB-019 and RB-020.

## Queue decision

- RB-015 is complete.
- RB-019 remains `PROPOSED`, P3, order 152.
- RB-020 remains `PROPOSED`, P3, order 154.
- Neither prototype blocks RB-004/RB-005 review, RB-013, RB-016 or RB-017.
- No critical-path reprioritization is made.

## Final recommendation

Proceed with the two isolated feature-toggled prototypes.

Do not add a generic Builder AI layer. Do not persist prototype output by default. Do not allow generated interpretation to produce commands or become factual authority.

Retain the existing game-review experiment unchanged under RB-015 and evaluate its product usefulness separately.
