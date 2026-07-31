# RB-017 — Validate curated traps knowledge pilot

Status: REVIEW

Priority: P2

Order: 145

Delivery class: Dual-use pilot

Planning maturity: Completed bounded pilot; production deferred

GitHub issue: #114

Implementation branch: `rb-017/issue-114-curated-traps-pilot`

Implementation PR: #117

## Outcome

Prove whether curated opening motifs can be represented, validated, evidenced and reviewed reproducibly without creating a production capability.

## Delivered

- dataset `2026-07-pilot-v2` with 50 source occurrences;
- 50 Stockfish and 50 bounded Lichess Explorer snapshots;
- legality, identity, duplicate, provenance, lifecycle and evidence-hash validation;
- explicit opt-in refresh and deterministic offline CI;
- separate source, generated-evidence and reviewed layers;
- no persistence, public contract, UI, course write or Builder ranking change.

## Review result

- approved: 1;
- downgraded: 1;
- rejected: 1;
- evidence-bound and unresolved: 47;
- blocked or missing evidence: 0.

Blackburne–Shilling is downgraded because accurate play leaves White about +1.0 at the trigger. The current Fried Liver record is rejected because its declared safe defence still leaves White about +5.6.

## Recommendation

Revise before production. Retain the pilot as research evidence and a deterministic fixture. Production use requires record-by-record review, corrected records, explicit thresholds, product ownership and licensing review.

## Completion

Report: `reports/RB-017-2026-07-31-curated-traps-pilot.md`

Final review-head CI: pending

Completed at: pending acceptance and squash integration
