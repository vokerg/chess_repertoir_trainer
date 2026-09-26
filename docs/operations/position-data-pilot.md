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

## Experimental compact codec

`packages/chess-domain/src/position-binary-compact.ts` exports `encodeNormalizedFenCompact` and `decodeNormalizedFenCompact`. This is a second experimental codec, not a replacement for the fixed pilot format. The baseline file, API names and tests remain unchanged. No application lookup, database write, Prisma schema, migration, index, ply relation or dependency changed for this experiment.

The compact payload is `10 + ceil(pieceCount / 2)` bytes:

- Bytes 0..7: **little-endian** 64-bit occupancy bitmap. Square `a1=0, ..., h8=63` sets bit `square % 8` in byte `floor(square / 8)`, with the least significant bit first. No 64-bit arithmetic or platform-dependent byte order is needed.
- Next `ceil(pieceCount / 2)` bytes: occupied squares strictly in ascending square order, using the baseline codes `1..12`. The first piece occupies the **low nibble**, the second the **high nibble**. Codes `0` and `13..15` are invalid. For an odd count, the unused high nibble must be zero.
- Final two bytes: the unchanged baseline side/castling metadata and en-passant metadata. Bits 5..7 of side/castling must be zero; EP is zero or square index plus one and must also satisfy FEN rank/side rules.

The experimental codec delegates canonical FEN validation and piece/metadata semantics to the unchanged fixed codec, packing and unpacking its bytes in memory. It rejects a length inconsistent with occupancy, bad codes, nonzero padding and invalid decoded FEN. It additionally rejects more than 32 occupied squares to guarantee the requested **26-byte maximum**. Normal chess positions cannot gain pieces through promotion; promotion replaces a pawn. Artificial FENs accepted by the baseline validator can exceed 32 pieces and are outside this experimental codec's supported range. Two kings use **11 bytes**; 24 pieces use **22 bytes**; the starting position uses **26 bytes**.

## Read-only comparison

```bash
npm run db:compare-position-codecs --workspace=apps/api
```

The pre-script builds the domain package. The comparison accepts no arguments; `--all` is intentionally omitted. A PostgreSQL read-only transaction makes one bounded SELECT of `positionData IS NOT NULL`, ordered by `id ASC`, with `LIMIT 100`. It uses SQL window averages over precisely those selected rows for stored fixed payload lengths and FEN field storage. No data-changing or schema SQL is issued; `SET TRANSACTION READ ONLY` is the only transaction configuration statement.

Each row's original FEN must equal both decoded encodings, its existing `positionData` must match the fixed codec byte for byte, and compact decode/re-encode must reproduce the compact bytes exactly. Any failure aborts with the ID, original and decoded FENs and a failure count. Size statistics, distributions and three samples are computed only from the bounded selection. Median is the central size or mean of the two central sizes; p90 uses nearest rank (`ceil(0.9 * rowCount)`). Empty selections return zero rows/failures and null size/projection estimates. The projection population is explicitly 771,646, and projected compact bytes are rounded to the nearest byte.

The domain suite passed **191 tests across 16 files**. Compact tests cover known bytes, all occupancy bits and piece codes, counts 2..32 and the over-limit rejection, both nibbles, all castling/side/EP combinations, reserved bytes, malformed/truncated/extra payloads, odd padding and deterministic played-game round trips. `npm run build:api`, the database-free API comparison tests (`position-codec-comparison.test.mjs`), architecture/hygiene checks and whitespace checks passed. The comparison tests check the read-only SQL and bounded selection, statistics/percentiles/projections, empty/small samples, preserved input bytes, failure diagnostics and rejected CLI overrides. Existing database-mutating pilot tests were not rerun against Neon. Full repository build/test/lint and web/mobile validation were skipped for this experiment.

### Real pilot-row comparison, 2026-09-26

Exactly the same **100 pilot rows, IDs 1..100**, were inspected read-only with **zero failures**. All stored baseline payloads were still 34 bytes. Average FEN field storage remained 46.18 bytes.

| Metric | Observed value |
| --- | ---: |
| Minimum compact bytes | 12 |
| Average compact bytes | 17.78 |
| Median compact bytes | 18 |
| P90 compact bytes | 21 |
| Maximum compact bytes | 23 |
| Average piece count | 15.19 |
| Average fixed payload bytes | 34 |
| Average raw savings per position | 16.22 bytes (47.71%) |

| Compact bytes | Positions |
| ---: | ---: |
| 12 | 6 |
| 13 | 10 |
| 15 | 10 |
| 16 | 2 |
| 17 | 8 |
| 18 | 16 |
| 19 | 15 |
| 20 | 22 |
| 21 | 1 |
| 22 | 6 |
| 23 | 4 |

Unlisted sizes have zero observations. Extrapolating the observed mean to 771,646 positions yields **26,235,964 raw fixed bytes**, **13,719,866 projected raw compact bytes**, and **12,516,098 projected raw bytes saved** (about 12.52 decimal MB). These are application payload estimates, not measured PostgreSQL heap/index savings. Compact values were never stored in PostgreSQL.

| id | Piece count | Fixed bytes | Compact bytes | normalizedFen = decoded compact FEN |
| ---: | ---: | ---: | ---: | --- |
| 1 | 13 | 34 | 17 | `1B1R4/p1P4p/1p4k1/6p1/8/2P1r3/PP6/6K1 b - -` |
| 2 | 13 | 34 | 17 | `1B1R4/p1P4p/1p4k1/6p1/8/2P3r1/PP3K2/8 b - -` |
| 3 | 13 | 34 | 17 | `1B1R4/p1P4p/1p4k1/6p1/8/2P3r1/PP6/6K1 w - -` |

The improvement is material enough to justify evaluating this as the successor to the fixed pilot: even the 32-piece maximum saves 8 bytes (23.53%). However, the first 100 IDs average only 15.19 pieces and were not randomly sampled. Their 47.71% reduction cannot establish the complete table's average. This comparison checkpoint stopped at read-only measurement. The subsequent [compact shadow rollout](compact-position-shadow-rollout.md) adds a separate field and deployment/backfill/index gates while retaining this fixed baseline; it does not authorize a read cutover or PR merge.
