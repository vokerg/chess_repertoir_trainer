# ACT-003 implementation: played-game activity reconciliation

## Runtime boundary

Both current provider imports call one provider-neutral `PlayedGameActivityReconciliationService` after their committed game writes and before advancing the successful import cursor. Future durable account-import adapters must retain this same boundary after bounded batches commit.

The service derives calendar dates from persisted `ImportedGame.endedAt` values and the user’s persisted effective IANA time zone. It never increments from a provider result. For each affected date it sets `GAMES_PLAYED` to the absolute count of distinct persisted games across all of the user’s accounts, including already-existing games revisited by overlap windows. Existing aggregate dates in the affected range are reconciled to zero when no persisted game remains, so stale aggregates repair without materializing empty rows for every inactive day.

Database aggregation is processed in at most 31 calendar-day chunks. The indexed `(userId, endedAt)` range predicate is applied before the time-zone date grouping, and only aggregate rows are returned to Node. Provider network work and the aggregate scan happen outside the write guard.

## Lifecycle guard handoff

ACT-003 exposes `PlayedGameActivityWriteGuard`. Its current default opens the existing short activity transaction and intentionally provides no destructive-lifecycle protection because ONB-019 / #259 has not landed. ONB-019 must replace this seam with its persisted user/account fence check before purge/delete safety can be claimed. Reconciliation remains restart-safe because it is derived entirely from persisted games and uses absolute upserts.

## Bounded historical backfill

Run from `apps/api`:

```bash
npm run activity:backfill-played-games -- --limit 25 --after-user-id 0
```

The command returns `nextAfterUserId`; pass it to the next invocation. The page size is restricted to 1–100 users, and each user is processed in 31-day chunks. To repair one user:

```bash
npm run activity:backfill-played-games -- --user-id 123
```

The range is the union of persisted game dates and existing `GAMES_PLAYED` aggregate dates, so stale dates are zeroed and reruns are idempotent.

## Effective time-zone changes

The normal preference API continues to reject a time-zone change after activity exists because ACT-003 can rebuild played games but cannot reconstruct every other producer type. Do not update `AppUser.timeZone` alone. A separately reviewed full-activity migration must change the effective zone and rebuild or deliberately dispose every activity type. After that zone change, run the single-user command above: its union range clears old played-game buckets and recreates them from `ImportedGame.endedAt` in the new zone. This avoids silent mixed-time-zone played-game history.
