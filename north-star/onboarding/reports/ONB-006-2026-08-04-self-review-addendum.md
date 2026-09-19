# ONB-006 — Self-review addendum

Date: 2026-08-04

Issue: [#153](https://github.com/vokerg/chess_repertoir_trainer/issues/153)

Pull request: [#281](https://github.com/vokerg/chess_repertoir_trainer/pull/281)

This addendum records the adversarial concurrency review of `ONB-006-2026-08-04-orphan-shared-position-cleanup.md`. Where it conflicts with the original report, this addendum is authoritative.

## Material correction: maintenance lock order

The original report listed this delete-batch table-lock order:

1. `ImportedGamePosition`;
2. `ImportedGamePly`;
3. `PositionAnalysis`;
4. `MastersExplorerCache`.

That order is unsafe against the current reindex transaction in `apps/api/src/modules/imported-games/ply-index.repository.prisma.ts`.

The current transaction performs:

1. `ImportedGamePly.deleteMany(...)`;
2. `Position.createMany(...)`;
3. `Position.findMany(...)`;
4. `ImportedGamePly.createMany(...)`.

Therefore a concurrent interleaving could deadlock:

- indexing holds a `ROW EXCLUSIVE` lock on `ImportedGamePly` and later requests one on `ImportedGamePosition`;
- cleanup holds `SHARE ROW EXCLUSIVE` on `ImportedGamePosition` and then waits for `ImportedGamePly`;
- each transaction waits for the other.

### Corrected fixed order

Every cleanup delete transaction must acquire locks in this order:

1. `ImportedGamePly`;
2. `ImportedGamePosition`;
3. `PositionAnalysis`;
4. `MastersExplorerCache`.

This matches the only current transaction that writes both ply and position tables. Analysis and opening-explorer writes begin with `Position` and then write only their dependent table; neither requires `ImportedGamePly`, so cleanup holding the ply lock while waiting for `Position` does not create the reverse dependency needed for a cycle.

The implementation must preserve this order in one constant/helper and test it with deterministic two-connection barriers. Future code that writes more than one of these tables must either follow the same partial order or prove a compatible order before merge.

## Clarified locking protocol

For each bounded delete transaction:

1. set a local cleanup `lock_timeout`;
2. lock `ImportedGamePly` in `SHARE ROW EXCLUSIVE` mode;
3. lock `ImportedGamePosition` in `SHARE ROW EXCLUSIVE` mode;
4. lock `PositionAnalysis` in `SHARE ROW EXCLUSIVE` mode;
5. lock `MastersExplorerCache` in `SHARE ROW EXCLUSIVE` mode;
6. revalidate run state and exact work key;
7. resolve the bounded candidate set using the persisted grace cutoff and final `NOT EXISTS` predicate;
8. count dependent rows for that exact set;
9. delete positions set-wise and persist counters/checkpoint;
10. commit.

If any lock cannot be acquired before the local timeout, the complete batch rolls back and the checkpoint does not advance.

The implementation must not set a global lock timeout and must not hold the table locks while sleeping, calculating an unbounded preview, or performing external work.

## Additional self-review conclusions

### Keep explicit table locks for the first release

A writer-coordinated advisory-lock protocol remains rejected for the first release. It would require every current and future SQL writer to opt into an application convention. The short table lock is coarse but database-enforced, manual-only, bounded, and covered by the ONB-007 transaction/lock budgets.

### Keep dependent rows non-owning

`PositionAnalysis` and `MastersExplorerCache` remain dependent evidence, not ownership references. Their creation or refresh does not reset the 30-day grace. This is intentional: the canonical eligibility rule is zero imported-game-ply references, and both dependent values are reproducible caches. The implementation must measure cache recreation/churn before any future automatic scheduling decision.

### Keep re-reference reset inside indexing

Deleting `PositionCleanupCandidate` rows for newly referenced position IDs must occur in the same transaction that commits `ImportedGamePly.createMany(...)`. A later asynchronous cleanup is insufficient because it would leave a candidate temporarily grace-eligible after the reference commits.

The bounded reconciliation phase remains necessary for legacy data, direct SQL, migrations, and any future writer missed during rollout, but it is a repair path rather than the primary correctness mechanism.

### Do not overclaim writer retry behavior

Cleanup owns its own lock timeout and retry. The design does not assume every concurrent writer has generic deadlock or lock-timeout retry. Delete batches must remain short enough that a writer arriving after cleanup acquired the locks normally waits for the bounded commit rather than failing. Forced concurrency tests must verify current indexing, analysis, and opening-explorer behavior under that contention.

## Required implementation tests added by this review

- deterministic reindex-versus-cleanup test proving no deadlock with the corrected order;
- a test that fails when the lock-order helper is reordered;
- cleanup-first and indexer-first interleavings;
- cleanup waiting on an existing ply writer and timing out without checkpoint advancement;
- indexer waiting behind an acquired cleanup batch and succeeding after cleanup commits;
- analysis and opening-explorer writes while cleanup holds the ply lock but waits for the position lock;
- candidate deletion in the same transaction as new ply references;
- a stale candidate repair test for a reference created outside the authoritative indexing path.

## Final disposition

The ONB-006 recommendation remains valid with the corrected fixed order:

```text
ImportedGamePly
  → ImportedGamePosition
  → PositionAnalysis
  → MastersExplorerCache
```

ONB-026 / #280 must consume this addendum before implementation. No production deletion behavior is introduced by this research correction.
