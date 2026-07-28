# RB-015 — Decide whether an LLM has a justified role

Status: PROPOSED

Priority: P3

Order: 150

Delivery class: Research

Planning maturity: Open

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Determine whether an LLM materially improves the Chess Profile or repertoire-builder experience after deterministic evidence, ranking, and visual interaction are understood.

Any approved role must remain optional, source-grounded, bounded, and removable without breaking core workflows.

## Why this task exists

An LLM might explain complex tradeoffs or support conversational navigation. It might also add latency, cost, unverifiable claims, privacy concerns, and architectural complexity where templates or structured reasons are better.

The program should decide from demonstrated user problems rather than adding AI because it is available.

## Current repo anchors to inspect

- any current LLM provider abstraction and game AI review feature;
- environment configuration and feature toggles;
- stored versus transient AI review behavior;
- RB-004 profile reason/evidence model;
- RB-007 deterministic reason taxonomy;
- RB-008/RB-010 observed explanation problems;
- privacy and data ownership boundaries.

## Dependencies

Remain PROPOSED until deterministic profile, candidate evidence, and visual workflow are sufficiently mature to identify a real gap.

## In scope

- list concrete user problems an LLM might solve;
- compare deterministic templates, rules, and LLM output;
- prototype one or two bounded explanation/orchestration cases if justified;
- require structured source evidence and distinguish generated interpretation;
- define context limits, privacy, latency, cost, provider failure, and fallback behavior;
- decide transient versus stored output;
- define evaluation criteria for factuality and usefulness;
- recommend no LLM, optional LLM, or a narrow implementation task.

## Out of scope

- allowing an LLM to select or write moves without deterministic validation;
- using generated text as opening classification;
- replacing engine/population/profile calculations;
- broad autonomous agent behavior;
- committing provider infrastructure without an approved use case.

## Open questions to resolve

- Which explanation remains confusing after structured reasons are visible?
- Does conversational refinement improve target setup?
- Can deterministic text cover the same need?
- What evidence references must accompany generated conclusions?
- Is output user-specific data requiring storage controls?
- What happens when the provider is unavailable?
- How is quality evaluated across chess strength levels?

## Acceptance criteria

- The task starts from observed product gaps, not speculative AI features.
- At least one non-LLM alternative is evaluated for every use case.
- Any prototype is grounded in structured source evidence.
- Core workflow remains fully functional with LLM disabled.
- Privacy, cost, latency, fallback, and factuality are addressed.
- The report makes a clear proceed/defer/reject recommendation.

## Required validation

Depends on scope. Prototype work should include representative prompts, source-grounding checks, failure cases, and human review. No production integration without a new approved implementation task.

## Completion updates

Update RB-D025/RB-D026 and create a narrow implementation task only if justified. Do not reprioritize the core roadmap merely because an LLM prototype is attractive.

## Completion

Report: none

Completed at: none
