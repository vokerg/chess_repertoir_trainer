# RB-015 — Decide whether an LLM has a justified role

Status: CLAIMED

Priority: P3

Order: 150

Delivery class: Research

Planning maturity: Claimed bounded research

GitHub issue: `#103`

Claimed by: OpenAI ChatGPT

Claim branch: `rb-015/issue-103-llm-role-discovery`

Claimed at: 2026-07-30

Claim scope: Audit the existing optional AI game-review subsystem as the current architectural proof, identify concrete explanation or orchestration gaps remaining after RB-004/RB-007/RB-010/RB-012 deterministic UX, compare each candidate LLM role with a deterministic alternative, and make a proceed/defer/reject recommendation covering grounding, privacy, latency, cost, persistence, fallback and removability. This research adds no production endpoint, provider abstraction, prompt path, schema, migration, persistence model or Angular feature. A prototype is allowed only if the evidence review finds a specific gap that cannot be evaluated credibly through contracts and representative fixtures alone.

## Outcome

Determine whether an LLM materially improves the Chess Profile or repertoire-builder experience after deterministic evidence, ranking, and visual interaction are understood.

Any approved role must remain optional, source-grounded, bounded, and removable without breaking core workflows.

## Why this task exists

An LLM might explain complex tradeoffs or support conversational navigation. It might also add latency, cost, unverifiable claims, privacy concerns, and architectural complexity where templates or structured reasons are better.

The program should decide from demonstrated user problems rather than adding AI because it is available.

## Current repo anchors to inspect

- current LLM provider abstraction and game AI review feature;
- environment configuration and feature toggles;
- stored versus transient AI review behavior;
- RB-004 profile reason/evidence model;
- RB-007 deterministic reason taxonomy;
- RB-008/RB-010/RB-012 explanation and workflow surfaces;
- privacy and data ownership boundaries.

## Verified starting baseline

The repository already contains one isolated optional AI use case rather than only speculative infrastructure:

- server-side OpenAI-compatible JSON generation using native `fetch` and Zod validation;
- disabled-by-default global and game-review feature flags;
- bounded game and completed-analysis context;
- authoritative reconciliation of model-referenced plies and move facts;
- one current persisted artifact per imported game with model, prompt/schema version and input hash;
- no raw provider request/response storage or browser exposure of provider configuration;
- explicit provider, timeout, rate-limit, validation and storage failures;
- a presentation-only Angular widget that delegates board navigation to the existing game-detail store.

RB-015 must evaluate whether any new role materially improves the product beyond this existing experiment and the deterministic builder/profile surfaces. It must not treat the existence of reusable AI plumbing as evidence that another AI feature is justified.

## Dependencies

The dependency condition is satisfied as of 2026-07-30:

- deterministic candidate evidence and reason taxonomy are integrated through RB-007;
- the visual decision workflow is integrated through RB-010;
- exact existing-course adaptation is integrated and closed through RB-012;
- the Player Chess Profile calculation and experience are implemented for review through RB-004/RB-005, sufficient for contract and explanation-shape inspection even though their integration decision remains pending.

Profile-dependent production implementation remains blocked on RB-004/RB-005 acceptance. The research task itself is not blocked.

## Research questions and candidate roles

Evaluate only concrete, bounded roles:

1. **Candidate trade-off explanation** — synthesize already-ranked RB-007 evidence for the currently selected move without changing ranking or eligibility.
2. **Completed builder/course-change summary** — explain what the user selected, what opponent coverage was added, and what RB-011 actually applied from authoritative session/preview results.
3. **Player-profile narrative or target refinement** — assess whether structured profile evidence and target controls leave a real explanation gap; defer any profile-dependent production recommendation until RB-004/RB-005 are accepted.

For every role, compare at least:

- deterministic templates over existing reason codes and evidence;
- a bounded LLM interpretation grounded in the same structured facts;
- no feature / existing UI as the control.

## In scope

- list concrete user problems an LLM might solve;
- inspect the existing AI subsystem for reusable and problematic boundaries;
- compare deterministic templates, rules, and LLM output;
- prototype one or two bounded explanation/orchestration cases only if justified;
- require structured source evidence and distinguish generated interpretation;
- define context limits, privacy, latency, cost, provider failure, and fallback behavior;
- decide transient versus stored output;
- define evaluation criteria for factuality and usefulness across chess strength levels;
- recommend no LLM, retain only the current experiment, optional LLM, or a narrow new implementation task.

## Out of scope

- allowing an LLM to select, rank, validate or write moves;
- using generated text as opening classification, profile evidence or course state;
- replacing engine, population, profile, candidate or course calculations;
- broad autonomous agent behavior;
- committing new provider infrastructure without an approved use case;
- changing the existing game-review experiment unless a concrete defect is discovered and separately scoped;
- production integration in this research task.

## Open questions to resolve

- Which explanation remains confusing after structured reasons are visible?
- Does conversational refinement improve target setup, or would explicit controls and deterministic copy be clearer?
- Can deterministic text cover the same need with lower latency and stronger auditability?
- What evidence references must accompany generated conclusions?
- Which output, if any, is user-specific data requiring persistence and deletion controls?
- What happens when the provider is disabled, unavailable, slow, rate-limited or returns invalid content?
- How is quality evaluated across chess strength levels without treating stylistic preference as factual correctness?
- Does the existing persisted game-review model represent the right lifetime for any other use case, or should new explanations be transient?

## Evaluation matrix

For every candidate role record:

- user problem and current deterministic surface;
- authoritative source facts and maximum context size;
- facts the model may interpret versus facts it must never create;
- deterministic alternative and expected maintenance burden;
- factuality and grounding checks;
- latency, token/cost and provider-failure impact;
- privacy, persistence, deletion and logging requirements;
- fallback behavior with AI disabled;
- removability and architectural coupling;
- recommendation: reject, defer, prototype or create a narrow implementation task.

## Acceptance criteria

- The task starts from observed or demonstrable product gaps, not speculative AI features.
- The current AI game-review implementation is evaluated as evidence, including its strengths, costs and limits.
- At least one non-LLM alternative is evaluated for every use case.
- Any prototype is grounded in structured source evidence and cannot alter authoritative chess or course facts.
- Core workflows remain fully functional with AI disabled.
- Privacy, cost, latency, fallback, persistence and factuality are addressed.
- The report makes a clear proceed/defer/reject recommendation for each candidate role and for the program overall.
- No production implementation is smuggled into the research PR.

## Required validation

Research validation must include:

- repository inspection of the current AI, profile, candidate, builder and course-result boundaries;
- representative source payloads or fixtures for any evaluated prompt/template;
- explicit hallucination, missing-evidence, provider-failure and disabled-feature cases;
- side-by-side deterministic alternative assessment;
- current external provider/API behavior and pricing/privacy research where those facts affect the recommendation;
- human review criteria rather than an unsupported claim that generated prose is useful.

No production integration without a new approved implementation task.

## Completion updates

Update RB-D025/RB-D026 and create a narrow implementation task only if justified. Do not reprioritize the core roadmap merely because an LLM prototype is attractive.

The completion report must state whether the existing game-review experiment should be retained unchanged, adjusted, measured further or removed, even if no new LLM role is approved.

## Completion

Report: `../reports/RB-015-2026-07-30-llm-role-discovery.md` — in progress

Completed at: none
