# RB-020 Builder completion summary prototype

Date: 2026-07-30

Status: review

Task: RB-020

GitHub issue: #219

Claim PR: #227

Implementation PR: #228

Implementation branch: `rb-020/issue-219-completion-summary`

Tested implementation head: `e68ad1aa251f66bded3912806af47778d0d787b0`

Implementation CI: run `30577892183` / #1649 — success

## Outcome

RB-020 adds one disabled-by-default, explicit, transient generated interpretation and study checklist after the authoritative Repertoire Builder course apply result.

The existing result block remains first and authoritative. The optional generated panel cannot choose a destination or target, request preview or apply, approve conflicts, alter course revisions or counts, write course content, navigate, or change Builder state.

## Capability and trigger

The widget is available only when all of the following are true:

- `AI_WIDGETS_ENABLED=true`;
- `AI_BUILDER_COMPLETION_SUMMARY_ENABLED=true`;
- the existing OpenAI-compatible provider configuration is complete.

`GET /api/ai/capabilities` exposes `widgets.builderCompletionSummary`. Angular renders no summary control when the capability is false.

Generation is explicit through **Generate study summary**. Destination loading, course/chapter selection, preview generation, target selection, apply confirmation, and apply completion do not invoke the provider.

## Shared contract

`@chess-trainer/contracts/ai` now defines a versioned completion-summary request and response.

The request contains the immutable completed inputs already held by the course dialog:

- completed Builder course draft;
- loaded destination display identity;
- selected target used by apply;
- authoritative RB-011 apply response.

The response separates:

- one server-generated factual result sentence;
- reconciled authoritative destination, line, target kind, counts, revision, and idempotence;
- one bounded generated interpretation;
- up to three highlights;
- up to three generated study-checklist items;
- optional unresolved-work note and warning;
- the deterministic facts referenced by generated text;
- a fixed disclaimer that course changes remain authoritative.

The contract contains no preview token, apply command, course mutation, destination recommendation, or target recommendation.

## Authoritative server boundary

`POST /api/ai/repertoire-builder/completion-summary` authenticates the user and rejects the request before provider work unless:

- the completed draft belongs to that user;
- request destination IDs and target kind match the apply result;
- existing-line or new-line identity matches the applied line;
- total, created, reused, skipped, conflict, and idempotence values are algebraically consistent;
- the owned chapter and applied line still exist;
- the line still belongs to the chapter/course;
- current course content revision equals the apply result revision.

The API re-reads destination state through the existing course repository. It does not call preview/apply routes or services and does not invoke the move-node writer.

## Provider context and reconciliation

Only bounded fact records are sent to the provider:

- authoritative factual summary;
- destination, line, target kind, counts, revision, and idempotence;
- session/target identity and materialized decision/transposition counts;
- up to six applied leaf paths;
- up to six excluded branch records.

The provider does not receive FEN, the complete draft, repertoire target, preview token, apply request, Prisma rows, authentication identity, or mutable course/Builder state.

Every generated section must cite supplied fact IDs. The API rejects:

- unknown fact IDs;
- unsupported UCI moves;
- destination, count, line, revision, idempotence, or excluded-work wording without matching references;
- course-control language;
- unsupported chess or causal claims;
- claims that excluded, deferred, ignored, stale, pending, or unresolved work was applied;
- unresolved notes or warnings without an allowed authoritative fact.

The factual result and authoritative result fields are produced server-side rather than accepted from the model.

## Angular boundary

`RepertoireBuilderCompletionSummaryStore` is page/dialog scoped and separate from `RepertoireBuilderCourseStore`.

Its identity is keyed to:

- session ID and revision;
- target ID;
- course and chapter IDs;
- applied line ID;
- applied course content revision.

Any identity change clears current output and invalidates an in-flight response. Closing the dialog or starting a new draft also clears summary state.

The store exposes no course-selection, target-selection, preview, apply, write, navigation, or Builder command. The course dialog emits one summary request only from inside the successful result block.

## Lifetime and purge boundary

The prototype is transient only:

- no Prisma model or migration;
- no browser storage;
- no hidden history;
- no background generation;
- no automatic regeneration;
- no course or Builder-session persistence.

Removal requires deleting only the completion-summary prompt/context/service, route, flag/capability, AI contracts, Angular API method/store/dialog composition, focused tests, environment entries, and documentation. No preview/apply service, course writer, course schema, Builder reducer, session domain, or database migration is required.

## Validation completed

CI run `30577892183` / #1649 passed:

- lint;
- repository build;
- generated opening-classification audit;
- architecture guardrails;
- database migrations;
- imported-game opening-classification audit;
- complete repository tests.

Focused coverage includes:

- disabled capability and no repository/provider work;
- no automatic request while completion identity is synchronized;
- explicit post-apply request only;
- authoritative count and destination reconciliation;
- stale destination/revision rejection before provider work;
- provider context excluding full draft and raw destination input;
- unsupported fact rejection;
- excluded-work hallucination rejection;
- timeout propagation;
- unchanged completed draft/result input;
- stale Angular response suppression;
- dialog-close/new-result clearing;
- no summary control before apply;
- verified result rendering before generated interpretation;
- fixed contract bounds and disclaimer.

## Not performed

The following remain review evidence rather than implementation claims:

- live configured-provider requests;
- authenticated browser walkthrough against a configured provider;
- human usefulness comparison against the authoritative result alone and a deterministic structured summary;
- production enablement;
- persistence or background execution.

These omissions do not weaken course-write isolation, but they prevent claiming generated output quality or product usefulness.

## Queue decision

RB-020 moves to `REVIEW` through PR #228. It remains a P3 stretch prototype and does not block deterministic Builder work, RB-017, RB-013, or RB-016.

No task order or priority change is recommended. After RB-020, remaining North Star work consists of RB-004/RB-005 review and integration, the already-claimed RB-017 pilot, RB-013 after profile integration, and RB-016 after real usage evidence exists.