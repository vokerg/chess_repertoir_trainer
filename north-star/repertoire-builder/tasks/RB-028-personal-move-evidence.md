# RB-028 — Factual personal move evidence

Status: READY

Priority: P1

Order: 210

Delivery class: Dual-use evidence and Builder presentation

Planning maturity: Agreed

GitHub issue: #318

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Objective

Replace generic Builder `Profile Aligned/Conflict` with exact-position personal evidence that tells the user whether they normally play the candidate, whether it is rare/new, how recently it was played and how it has performed.

The standalone Player Chess Profile remains independent. Builder familiarity is not inferred from broad opening-character similarity.

## Target semantics

Candidate evidence should support concise factual states such as:

- `Common for you`;
- `Rare for you`;
- `New to you`;
- `Common for you · results below your baseline`, only with sufficient evidence.

Underlying evidence should retain games/occurrences, exact-position share where available, score, last-played date, filters and a position-relative performance comparison.

## Period rule

Use all eligible indexed history for familiarity. Older games are relevant to whether the user knows a move. Recency is shown separately as a fact rather than enforced through the Player Chess Profile's default three-month window.

## Ranking boundary

Personal move evidence is primarily informational in Builder V2. It must not overpower the peer/Masters/engine persona policy merely because an old habit is frequent. Any retained ranking influence requires explicit evidence and separate reasons; the default direction is no persona-ranking authority.

## In scope

- inspect/reuse opening-analysis and imported-game aggregation patterns;
- add bounded aggregate fields needed for exact-position frequency/share, results and last-played evidence;
- define statistically safe common/rare/new and result-context labels;
- remove primary Player Chess Profile fit presentation from Builder candidate decisions;
- preserve inspectable source/filter/sample details;
- web/API/contract tests.

## Out of scope

- deleting or redesigning `/progress/profile`;
- permanent user-style labels;
- new persistence/jobs/queues;
- automatic rejection because personal results were poor.

## Dependencies

Can proceed beside RB-027 with contract coordination. RB-031 consumes the final presentation model.

## Acceptance criteria

- old but familiar moves remain recognized;
- rare and never-played candidates are distinguishable;
- supported good/poor results are compared with an appropriate position baseline, not fixed 50%;
- sparse samples do not receive strong good/bad labels;
- last-played evidence is available where dates exist;
- Player Chess Profile fit is no longer presented as direct move familiarity;
- repository aggregation remains bounded and user-owned;
- focused tests cover old-but-familiar, rare, new, sparse and below-baseline cases.

## Completion

Report: none

Completed at: none
