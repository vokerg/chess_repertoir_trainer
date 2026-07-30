# RB-019 Builder candidate explanation prototype

Date: 2026-07-30

Status: review

Task: RB-019

GitHub issue: #218

Claim PR: #222

Implementation PR: #223

Implementation branch: `rb-019/issue-218-candidate-explanation`

Tested implementation head: `bd9a1c70f4fc61e6b63fa64ed5b624305d4ed903`

Implementation CI: run `30559039592` / #1630 — success

## Outcome

RB-019 adds one disabled-by-default, explicit, transient generated interpretation beside the existing Repertoire Builder **Focused evidence** panel.

The prototype consumes authoritative RB-007 candidate evidence and returns bounded explanatory copy plus the deterministic facts it referenced. It does not select or recommend a move, change candidate order, alter fit or eligibility, update opponent coverage, call Builder commands, persist output, or participate in course preview/apply.

## Capability and trigger

The widget is available only when all of the following are true:

- `AI_WIDGETS_ENABLED=true`;
- `AI_BUILDER_CANDIDATE_EXPLANATION_ENABLED=true`;
- the existing OpenAI-compatible provider configuration is complete.

`GET /api/ai/capabilities` exposes `widgets.builderCandidateExplanation`. Angular renders no explanation control when the capability is false.

Generation is explicit through **Explain this evidence**. Route load, candidate loading, candidate preview, candidate selection and comparison selection do not invoke the provider.

## Shared contract

`@chess-trainer/contracts/ai` now defines a versioned candidate-explanation request and response.

Request identity includes:

- target ID;
- normalized FEN;
- decision role;
- deterministic ranking-policy version;
- candidate-response generation timestamp;
- selected move UCI;
- optional comparison move UCI.

The response is bounded to:

- one concise summary;
- up to three trade-offs;
- one to three authoritative evidence references for the summary;
- one to three evidence references per trade-off;
- one optional missing-evidence reference;
- authoritative selected/comparison move identity and deterministic rank;
- the deterministic facts actually referenced;
- a fixed non-authority disclaimer.

The contract does not contain a recommended move, replacement ranking or Builder command.

## Authoritative server boundary

`POST /api/ai/repertoire-builder/candidate-explanation` authenticates the user and calls `CandidateDecisionService.get()` directly. Client-supplied ranking, evaluation, reason, warning, fit and evidence assertions are not accepted.

The authoritative rebuild:

- keeps the request bounded to eight candidates;
- explicitly includes the selected move so a manually requested current candidate remains available;
- validates target ID, normalized position, decision role and ranking policy;
- validates that the selected and optional comparison candidates are still present and distinct.

Only a bounded fact projection is sent to the provider. It excludes FEN, user identity, Builder session, queue, course destination, commands and complete candidate/PV payloads.

## Output reconciliation

Every returned evidence reference must exist in the authoritative fact projection. The API rejects:

- unknown fact identifiers;
- a missing-evidence reference that points to available evidence;
- unsupported UCI or SAN move references;
- recommendation or move-selection language;
- unsupported causal claims;
- rank, engine, population, fit, profile, course or opening wording without a corresponding authoritative reference.

The service returns authoritative candidate identity/rank and referenced facts rather than trusting those fields from the model.

## Angular boundary

`RepertoireBuilderCandidateExplanationStore` is page scoped and separate from `RepertoireBuilderStore`.

Its request identity is keyed to target, normalized FEN, role, policy, candidate-response generation time, selected move and comparison move. Any identity change clears the current output and invalidates an in-flight response.

The optional workbench panel:

- remains directly after **Focused evidence**;
- offers an optional bounded comparison candidate;
- labels output as generated interpretation;
- keeps the deterministic evidence panel visible as the full fallback;
- renders referenced deterministic facts separately;
- states that generated text cannot change rank, selection, coverage, Builder state or course output.

No explanation state or event is wired to accept, defer, ignore, stop, reorder, coverage, finish, abandon, preview or apply commands.

## Lifetime and purge boundary

The prototype is transient only:

- no Prisma model or migration;
- no browser storage;
- no hidden history;
- no background generation;
- no automatic regeneration;
- no course or Builder-session persistence.

Removal requires deleting only the use-case prompt/service/context, route and contracts, use-case flag/capability, feature-local Angular data-access/store/composition, focused tests and documentation. No deterministic ranking, Builder reducer, session, course or database migration is required.

## Validation completed

CI run `30559039592` / #1630 passed:

- lint;
- repository build;
- generated opening-classification audit;
- architecture guardrails;
- database migrations;
- imported-game opening-classification audit;
- complete repository tests.

Focused coverage includes:

- disabled capability and no provider work;
- no automatic request during state synchronization or comparison selection;
- authoritative candidate-decision reconstruction;
- selected candidate inclusion and optional bounded comparison;
- provider context excluding FEN;
- unsupported fact rejection;
- unsupported causal-claim rejection;
- stale identity rejection before provider work;
- timeout/provider failure propagation;
- unchanged deterministic candidate response;
- stale Angular response suppression;
- current-response clearing when identity changes;
- fixed response bounds and disclaimer.

## Not performed

The following remain review evidence rather than implementation claims:

- live DeepSeek/provider requests;
- authenticated browser walkthrough against a configured provider;
- human usefulness comparison against no feature and deterministic template copy;
- production enablement;
- persistence or background execution.

These omissions do not weaken deterministic isolation, but they prevent claiming product usefulness or provider-output quality at this stage.

## Queue decision

RB-019 moves to `REVIEW` through PR #223. It remains a P3 stretch prototype and does not block deterministic Builder work, RB-017, RB-013 or RB-016.

RB-020 remains independently proposed. No task order or priority change is recommended.
