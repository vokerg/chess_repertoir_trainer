# Reversible position data: 100-row pilot

`Position` maps to `ImportedGamePosition`. The nullable `positionData BYTEA` column is a pilot only. It has no default, index or uniqueness constraint. Migration `20260926150000_add_position_data_pilot` only adds this column. Existing imports and analysis continue to write `normalizedFen` and the unchanged 16-byte `positionKey`; lookups, ply foreign keys and cleanup behavior are unchanged. Ordinary writers leave `positionData` null.

## Binary format

The canonical codec lives in `packages/chess-domain/src/position-binary.ts` and is exported from `chess-domain` as `encodeNormalizedFen`, `decodeNormalizedFen` and `POSITION_DATA_BYTES`. It uses exactly 34 bytes, with no hash, position dictionary or database dependency.

- Squares are numbered `a1=0, b1=1, ..., h8=63`. Byte `floor(square/2)` stores the even square in its **low nibble**, and the next odd square in its **high nibble**.
- Piece codes: empty `0`; white pawn/knight/bishop/rook/queen/king `1/2/3/4/5/6`; black pawn/knight/bishop/rook/queen/king `7/8/9/10/11/12`. Codes `13..15` are rejected.
- Byte 32: bit 0 is side to move (`0=white, 1=black`); bits 1/2/3/4 are `K/Q/k/q`. Bits 5..7 must be zero.
- Byte 33: `0` means no en-passant target; otherwise it is square index plus one (`1..64`). Values above 64 are rejected. Targets must also satisfy FEN rules: rank 6 with white to move, rank 3 with black to move.

Input must be a valid canonical four-field FEN: compressed ranks, single spaces, ordered unique castling rights (`KQkq` subsets, or `-`), and no move counters. The codec rejects alternate spellings rather than silently normalizing them, preserving exact string reversibility. It validates FEN with `chess.js` (including one king per color and no pawns on edge ranks), without loading/re-exporting a board or erasing an en-passant target. This is FEN validation, not a legal reachability check.

## Running the pilot

Establish the identity of **both** `DATABASE_URL` (pilot) and `DIRECT_URL` (migration) before running. Do not automatically run against production or an unidentified remote database. Configure an identified development/test database and apply the migration using the normal deployment procedure:

```bash
npm run db:migrate --workspace=apps/api
npm run db:pilot-position-data --workspace=apps/api
```

The migration command deploys pending migrations, so inspect their status first on an existing database. The pilot npm pre-script builds the domain codec and generates Prisma types. The script accepts no arguments and has a fixed 100-row limit.

One transaction selects `positionData IS NULL`, ordered by `id ASC`, with `LIMIT 100` and row locks. It prevalidates every selected FEN and encoded length, then updates only those IDs with unchanged FENs and null data. It reads those exact IDs back from PostgreSQL, requires 34 bytes and exact decoded equality, and commits only after validation and statistics succeed. Existing data is never overwritten. Any failure rolls back all writes, exits nonzero and reports identifying FENs on codec/readback failures. Row locks have a five-second acquisition timeout; the transaction timeout is 30 seconds.

Success prints selected/written/validated/mismatch counts, the byte length distribution, `AVG(pg_column_size(normalizedFen))`, `AVG(pg_column_size(positionData))`, and three samples with IDs, original FENs, byte lengths and decoded FENs. Both storage averages use only the selected IDs; they include PostgreSQL field overhead rather than just the 34-byte application payload. An empty selection prints zero counts, empty samples/distribution and null averages. This does not measure total heap/index savings.

Run this command once for the pilot. A subsequent invocation selects the next eligible rows; it is not a full-backfill command and must not be looped into one. Stop after reviewing the pilot report. No removal of old fields or application lookup migration is part of this change.

## Validation

Domain tests cover known bytes, every piece type/color and square, both sides, all castling combinations, every FEN en-passant target, malformed input, all reserved metadata and en-passant byte values, and deterministic played-game round trips. The API integration test `test/imported-games/position-data-pilot.test.mjs` uses a private schema and synthetic positions to verify the migration preserves columns/indexes, the script stops at 100, existing values remain unchanged, smaller/empty selections work, metrics cover exactly selected IDs, and malformed input or corrupted PostgreSQL readback rolls back all writes.

```bash
npm run test --workspace=packages/chess-domain
npm run build:api
# On an identified test database, with DATABASE_URL explicitly set:
cd apps/api
node test/imported-games/position-data-pilot.test.mjs
```

On 2026-09-26 the integration test passed against a disposable local PostgreSQL 16 database, including a 100-row fixture selection with `selected=100`, `written=100`, `validated=100`, `mismatches=0`, and 100 payloads of exactly 34 bytes. For those exact synthetic rows, average `pg_column_size(normalizedFen)` was 58.1 bytes and average `pg_column_size(positionData)` was 35 bytes. The complete migration chain and focused import/analysis/HTTP/opening regressions also passed locally. These are fixture measurements; the configured Neon dataset measurements are recorded below.

## Configured-database pilot result

On 2026-09-26, after the user explicitly requested execution against the configured Neon database, the pooled and direct connections were verified to match `neondb/public`. The database contained 771,646 positions. The pilot migration was the only pending migration and was applied without changing any existing column or index.

One pilot invocation selected IDs **1..100**, wrote 100 rows, validated 100 rows and committed with **zero mismatches**. Every payload was exactly 34 bytes. For those exact 100 rows, average `pg_column_size(normalizedFen)` was **46.18 bytes**, and average `pg_column_size(positionData)` was **35 bytes**. These are field sizes; both fields remain stored, so this pilot does not reclaim FEN storage.

A separate read-only check after commit revalidated all 100 rows, compared their original FENs and position keys against the preflight snapshot, and confirmed both were unchanged. Exactly 100 positions had non-null `positionData`; the other 771,546 remained null. The column remained nullable with no default, and the only position indexes remained the ID primary key and unique position-key index. No full backfill, lookup change, old-field removal or cleanup change followed.

Three stored samples, with exact equality between original and decoded FEN:

| id | positionData bytes | normalizedFen | decoded normalizedFen |
| ---: | ---: | --- | --- |
| 1 | 34 | `1B1R4/p1P4p/1p4k1/6p1/8/2P1r3/PP6/6K1 b - -` | `1B1R4/p1P4p/1p4k1/6p1/8/2P1r3/PP6/6K1 b - -` |
| 2 | 34 | `1B1R4/p1P4p/1p4k1/6p1/8/2P3r1/PP3K2/8 b - -` | `1B1R4/p1P4p/1p4k1/6p1/8/2P3r1/PP3K2/8 b - -` |
| 3 | 34 | `1B1R4/p1P4p/1p4k1/6p1/8/2P3r1/PP6/6K1 w - -` | `1B1R4/p1P4p/1p4k1/6p1/8/2P3r1/PP6/6K1 w - -` |
