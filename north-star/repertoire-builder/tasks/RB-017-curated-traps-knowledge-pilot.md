# RB-017 — Validate curated traps knowledge pilot

Status: DONE

Priority: P2

Order: 145

Delivery class: Dual-use pilot

Planning maturity: Accepted bounded pilot; production deferred

GitHub issue: #114

Implementation PR: #117

Squash commit: `38bf745ddd0d70d08228a95df3f0f85fb452ce40`

Final implementation head: `7cfe22d498560e1256259a912b21c0e52ffd1d78`

Final CI: run `30617679841` / #1725 — success

## Delivered

Repository-local `2026-07-pilot-v2` corpus with 50 source occurrences, 50 Stockfish snapshots, 50 bounded Lichess Explorer snapshots, stable hashes, deterministic validation and separate source, generated-evidence and reviewed-disposition layers.

Review result: one approved, one downgraded, one rejected and 47 evidence-bound unresolved records. No record is blocked or missing generated evidence.

## Accepted decision

Revise before production. The pilot is research evidence and a deterministic fixture, not a production traps database, public contract, UI, course source or Builder ranking input.

A production capability requires a new task with record-by-record editorial completion, corrected records, explicit thresholds, product ownership and licensing review.

## Completion

Implementation report: `reports/RB-017-2026-07-31-curated-traps-pilot.md`

Closure report: `reports/RB-017-2026-07-31-closure.md`

Completed: 2026-07-31
