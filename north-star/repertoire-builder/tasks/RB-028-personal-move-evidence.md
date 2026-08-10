# RB-028 — Factual personal move evidence

Status: DONE

Priority: P1

Order: 210

Delivery class: Dual-use evidence and Builder presentation

Planning maturity: Implemented and validated; thresholds are versioned factual-presentation policy

GitHub issue: #318

Claimed by: vokerg

Claim branch: `rb-028/factual-personal-move-evidence`

Claimed at: 2026-08-09

Claim scope: exact-position personal familiarity/result evidence, Candidate Decision transport and Builder presentation

## Objective

Replace generic Builder `Profile Aligned/Conflict` with exact-position personal evidence that tells the user whether they normally play the candidate, whether it is rare/new, how recently it was played and how it has performed.

The standalone Player Chess Profile remains independent. Builder familiarity is not inferred from broad opening-character similarity.

## Target semantics

Candidate evidence supports concise factual states such as:

- `Common for you`;
- `Rare for you`;
- `New to you`;
- `Common for you · results below position baseline`, only with sufficient evidence.

Underlying evidence retains games/occurrences, exact-position move share, score, last-played date, effective filters and a position-relative performance comparison.

## Period rule

All eligible indexed history is used for familiarity. Older games remain relevant to whether the user knows a move. Recency is shown separately as a fact rather than enforced through the Player Chess Profile's default three-month window.

## Ranking boundary

Personal move evidence is primarily informational in Builder V2. The new all-history/context fields do not enter the Candidate Ranking personal input. Existing legacy personal ranking inputs remain unchanged for policies that still consume them; empirical preset `USER_MOVE` persona authority remains the RB-027 peer/Masters/engine policy.

## Delivered policy

- `COMMON`: at least 5 distinct indexed games and at least 20% of move choices from the exact position.
- `RARE`: previously played but below the common threshold.
- `NEW`: no indexed game with the candidate move when the personal source loaded successfully.
- result context requires at least 10 games with known W/D/L results and a +/-5 percentage-point delta versus the exact-position result baseline.
- result qualification is independent from familiarity, so result-less indexed games can establish familiarity without manufacturing result confidence.

## In scope

- reused opening-analysis and imported-game aggregation patterns;
- added bounded aggregate fields for exact-position frequency/share, results and last-played evidence;
- added statistically guarded common/rare/new and result-context labels;
- removed primary Player Chess Profile fit presentation from Builder candidate decisions;
- preserved inspectable source/filter/sample details;
- added web/API/contract coverage.

## Out of scope

- deleting or redesigning `/progress/profile`;
- permanent user-style labels;
- new persistence/jobs/queues;
- automatic rejection because personal results were poor.

## Dependencies

RB-027 is complete and Candidate Decision V4 now carries the final personal-evidence presentation model. RB-031 can consume this settled user-move evidence hierarchy after RB-029 opponent semantics stabilize.

## Acceptance criteria

- [x] old but familiar moves remain recognized;
- [x] rare and never-played candidates are distinguishable;
- [x] supported good/poor results are compared with an appropriate position baseline, not fixed 50%;
- [x] sparse samples do not receive strong good/bad labels;
- [x] last-played evidence is available where dates exist;
- [x] Player Chess Profile fit is no longer presented as direct move familiarity;
- [x] repository aggregation remains bounded and user-owned;
- [x] focused tests cover old-but-familiar, rare, new, sparse and below-baseline cases.

## Completion

Report: `../reports/RB-028-2026-08-10-personal-move-evidence-closure.md`

Completed at: 2026-08-10
