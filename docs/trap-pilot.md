# Curated trap knowledge pilot

RB-017 is a repository-local evidence and review pilot, not a production feature.

## Final pilot state

Dataset `2026-07-pilot-v2` contains 50 source records, 50 Stockfish snapshots and 50 bounded Lichess Explorer snapshots.

The source data, generated evidence and reviewed projection are separate. Generated payloads are never edited by editorial review.

Dispositions:

- approved: 1;
- downgraded: 1;
- rejected: 1;
- evidence-bound and unresolved: 47;
- blocked or missing evidence: 0.

Blackburne–Shilling is downgraded because accurate play leaves White about +1.0 at the trigger. The current Fried Liver record is rejected because its declared safe defence still leaves White about +5.6.

## Validation

Run:

```bash
npm run traps:validate --workspace=apps/api
```

Normal CI is offline and deterministic. Engine and population refreshes remain explicit opt-in scripts and never write to shared `PositionAnalysis` storage.

## Boundary

The pilot adds no Prisma model, migration, REST/OpenAPI/MCP contract, Angular UI, course write or Builder ranking behavior. Reusable inputs remain limited to verified CC0 sources and project-original analysis/editorial text.

## Recommendation

Revise before production. Keep this corpus as research evidence and a deterministic review fixture. Production use requires record-by-record review, corrected rejected records, explicit evidence thresholds, product ownership and licensing review.

See `north-star/repertoire-builder/reports/RB-017-2026-07-31-curated-traps-pilot.md`.
