# RB-015 — Decide whether an LLM has a justified role

Status: DONE

Priority: P3

Order: 150

Delivery class: Research

Planning maturity: Completed architecture decision with independent stretch prototypes

GitHub issue: `#103`

Research branch: `rb-015/issue-103-llm-role-discovery`

Research PR: `#216`

Research squash commit: `9a4e6166c9a874b8cb5b5efb04a2a4661e848d45`

Final research CI: run `30526417275` / #1617 — success

Completed at: 2026-07-30

## Outcome

RB-015 is complete.

An LLM has a justified role only as optional generated interpretation around already-authoritative Builder facts. It must not become part of chess calculation, candidate ranking, selected-move state, builder reducers, course preview/apply, persistence decisions, or course writes.

The accepted direction is to test two disabled-by-default, on-demand, independently removable prototypes in the real Builder flow:

1. **RB-019 / #218 — advisory candidate explanation** beside the existing Focused evidence panel.
2. **RB-020 / #219 — post-apply Builder course summary** after the authoritative RB-011 apply result.

Player-profile narrative and conversational target refinement remain deferred until RB-004/RB-005 are accepted against populated data and a concrete deterministic-copy gap is demonstrated.

## Verified repository baseline

The repository already has one isolated AI game-review feature with:

- server-side OpenAI-compatible generation using native `fetch`;
- global and use-case-specific disabled-by-default feature flags;
- capability-driven Angular visibility;
- bounded structured context;
- use-case Zod validation;
- authoritative reconciliation of referenced move facts;
- explicit provider, timeout, rate-limit and malformed-output failures;
- controlled persisted lifetime for the existing game-review artifact;
- no normal raw prompt/context/output logging;
- removable presentation composition.

This plumbing is reusable evidence, not authority and not automatic justification for additional AI features.

## Locked architecture

Generated interpretation is a read-only leaf consuming immutable deterministic snapshots.

```text
RB-006 target + RB-007 evidence + RB-009/RB-011 result
                    |
                    v
       bounded AI context adapter
                    |
                    v
    schema-validated interpretation
                    |
                    v
 optional read-only presentation panel
```

There is no return arrow into ranking, session state, queue transitions, preview/apply, transactions, or persistence.

Generated output is never an input to:

- RB-007 candidate ordering, eligibility, reasons, warnings, fit or coverage;
- selected candidate or selected opponent-response state;
- RB-009 reducer actions, revisions, branch states or queue order;
- completion eligibility;
- RB-011 destination, preview token, conflict resolution, apply validation, transaction, revision or course write;
- opening classification, profile calculation or Course review findings.

## RB-019 decision — candidate explanation prototype

Decision: approved as a P3 stretch prototype.

Canonical task: `RB-019-builder-candidate-explanation-prototype.md`

GitHub issue: #218

Insertion point: one optional advisory sibling immediately after the existing **Focused evidence** panel in `RepertoireBuilderWorkbenchComponent`.

Required behavior:

- explicit **Explain this trade-off** request only;
- no automatic request on load, preview, selection or response toggle;
- `AI_WIDGETS_ENABLED` plus `AI_BUILDER_CANDIDATE_EXPLANATION_ENABLED`;
- separate capability boolean;
- page-scoped AI state outside `RepertoireBuilderStore`;
- server-side reconstruction of authoritative RB-007 evidence;
- transient output tied to target, position, role, ranking policy, response generation and candidate identity;
- deterministic Focused evidence remains the complete disabled/failure fallback;
- no move recommendation command or ranking replacement.

## RB-020 decision — post-apply summary prototype

Decision: approved as a P3 stretch prototype.

Canonical task: `RB-020-builder-completion-summary-prototype.md`

GitHub issue: #219

Insertion point: one optional advisory panel immediately after `RepertoireBuilderCourseDialogComponent` renders a successful authoritative `result()`.

Required behavior:

- explicit request only after apply succeeds;
- unavailable during destination selection, preview, target selection and apply confirmation;
- `AI_WIDGETS_ENABLED` plus `AI_BUILDER_COMPLETION_SUMMARY_ENABLED`;
- separate capability boolean;
- page/dialog-scoped AI state outside `RepertoireBuilderCourseStore`;
- context limited to completed draft/session facts, exact destination, excluded branches and authoritative RB-011 result;
- transient output cleared on dialog, draft or result change;
- existing result block remains the complete disabled/failure fallback;
- no destination, target, preview, apply, revision or course-write authority.

## Provider findings verified on 2026-07-30

The intended DeepSeek provider remains compatible with the repository's OpenAI-compatible client boundary.

Official DeepSeek documentation currently states:

- the OpenAI-format base URL is `https://api.deepseek.com`;
- chat-completions JSON output uses `response_format: { "type": "json_object" }` and also requires the prompt to request JSON;
- JSON output can occasionally return empty content, so schema validation and explicit retry/failure behavior remain mandatory;
- current model names and pricing can change and must not be embedded as product constants;
- older `deepseek-chat` and `deepseek-reasoner` aliases were scheduled for deprecation on 2026-07-24 in favor of current V4 model names;
- the public privacy policy states that data may be processed and stored in the People's Republic of China and uses purpose-dependent retention rather than an API-specific zero-retention commitment;
- the public policy also notes that processing rules for end users of downstream applications built on the open platform are not covered by that policy.

Primary sources reviewed:

- `https://api-docs.deepseek.com/guides/function_calling/`
- `https://api-docs.deepseek.com/guides/json_mode/`
- `https://api-docs.deepseek.com/quick_start/pricing`
- `https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html`

Operational consequence:

- treat prototype payloads as external data transfers;
- minimize and bound context;
- send no provider credentials or raw context to Angular;
- avoid persistence and normal prompt/output logging;
- exclude unnecessary personal identifiers and whole-game/course history;
- re-verify model names, pricing, API behavior, privacy, retention and regional compliance when RB-019 or RB-020 is implemented;
- provider unavailability or policy uncertainty disables only the optional prototype.

No live provider request was required to make the architecture decision and none is represented as performed.

## Purge requirement

Removing either prototype must require only removal of:

- its use-case adapter and prompt;
- AI-specific contract fields;
- use-case flag and capability boolean;
- feature-local AI data access/store;
- optional presentation composition;
- tests and documentation.

Removal must not require:

- a database migration;
- a ranking-policy change;
- builder-session conversion;
- course repair;
- deterministic endpoint or route changes;
- navigation changes.

## Final recommendation

Proceed with RB-019 and RB-020 as independent, feature-toggled stretch prototypes.

Do not create a generic mutable Builder-AI layer. Do not persist prototype output by default. Do not allow generated interpretation to produce commands or become factual authority.

Retain the existing game-review experiment unchanged under RB-015. Evaluate its product usefulness separately.

## Validation

Completed:

- direct repository inspection of AI, candidate, builder, course preview/apply and presentation boundaries;
- deterministic alternative and no-feature controls defined for each prototype;
- grounding, stale-response, disabled-feature, provider-failure, state-isolation and purge requirements defined;
- independent RB-019/#218 and RB-020/#219 tasks and issues created;
- official DeepSeek API, JSON-output, pricing and privacy sources reviewed on 2026-07-30;
- PR #216 final head `7e7495485969c8dca1c515066c41df472817b6e8` passed CI run `30526417275` / #1617;
- PR #216 squash-merged to `main` as `9a4e6166c9a874b8cb5b5efb04a2a4661e848d45`.

Not performed and intentionally delegated to RB-019/RB-020:

- live provider calls;
- generated prototype outputs;
- authenticated browser prototypes;
- human usefulness testing across chess strengths;
- production endpoint, contract, prompt or Angular implementation.

## Completion

Report: `../reports/RB-015-2026-07-30-llm-role-discovery.md`

Completed at: 2026-07-30
