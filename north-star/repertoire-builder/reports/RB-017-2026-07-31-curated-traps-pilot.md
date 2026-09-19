# RB-017 curated traps pilot

Date: 2026-07-31

Status: review package

Task: RB-017

Issue: #114

Implementation PR: #117

Dataset: `2026-07-pilot-v2`

## Result

The bounded pilot proves that trap occurrences can be represented, validated, evidenced and reviewed reproducibly without production persistence, an API, Angular UI, course writes or Builder ranking changes.

The retained package contains 50 source-controlled occurrences, 50 Stockfish snapshots, 50 bounded Lichess Explorer snapshots, stable occurrence/evidence hashes, deterministic validation and a reviewed projection that binds generated evidence without editing generated payloads.

## Dispositions

- approved: 1;
- downgraded: 1;
- rejected: 1;
- evidence-bound and unresolved: 47;
- blocked or missing evidence: 0.

`fools-mate-e5-v1` is approved. `blackburne-shilling-main-bait-v1` is downgraded because accurate play leaves White about +1.0 at the trigger. `fried-liver-kxf7-v1` is rejected in its current form because its declared safe defence still leaves White about +5.6.

The remaining records stay unresolved. Snapshot presence is not treated as editorial acceptance.

## Recommendation

**Revise before production.** Keep this repository-local pilot as research evidence and a deterministic review fixture. Do not create a production traps database, public contract, Builder evidence source or course-generation path from it yet.

A future production task requires record-by-record review, corrected rejected records, explicit evidence thresholds, product ownership and source/licensing review. Complete repository CI must pass on the final PR head before integration.
