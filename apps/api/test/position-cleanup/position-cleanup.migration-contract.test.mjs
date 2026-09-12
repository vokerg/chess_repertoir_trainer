import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const migration = await readFile(path.join(
  here,
  '../../prisma/migrations/20260903080000_position_cleanup_foundation/migration.sql',
), 'utf8');

assert.match(migration, /^BEGIN;$/m);
assert.match(migration, /server_version_num'\)::INTEGER < 100000/);
assert.match(migration, /CREATE TABLE "PositionCleanupCandidate"/);
assert.match(migration, /"firstObservedOrphanAt" TIMESTAMP\(3\) NOT NULL/);
assert.match(migration, /"lastObservedOrphanAt" TIMESTAMP\(3\) NOT NULL/);
assert.match(
  migration,
  /FOREIGN KEY \("positionId"\) REFERENCES "ImportedGamePosition"\("id"\)\s*ON DELETE CASCADE ON UPDATE CASCADE/,
);
assert.match(
  migration,
  /CREATE INDEX "PositionCleanupCandidate_firstObservedOrphanAt_positionId_idx"\s*ON "PositionCleanupCandidate"\("firstObservedOrphanAt", "positionId"\)/,
);
assert.match(
  migration,
  /CREATE UNIQUE INDEX "PositionCleanupRun_one_nonterminal_key"\s*ON "PositionCleanupRun"\(\(1\)\)\s*WHERE "status" IN \('QUEUED', 'RUNNING'\)/,
);
assert.match(migration, /"orphansFirstObserved" INTEGER NOT NULL DEFAULT 0/);
assert.match(migration, /"orphansRefreshed" INTEGER NOT NULL DEFAULT 0/);
assert.match(
  migration,
  /CREATE TRIGGER "ImportedGamePly_position_cleanup_reset_insert"\s*AFTER INSERT ON "ImportedGamePly"\s*REFERENCING NEW TABLE AS position_cleanup_new_plies\s*FOR EACH STATEMENT/,
);
assert.match(
  migration,
  /CREATE TRIGGER "ImportedGamePly_position_cleanup_reset_update"\s*AFTER UPDATE ON "ImportedGamePly"\s*REFERENCING OLD TABLE AS position_cleanup_old_plies NEW TABLE AS position_cleanup_new_plies\s*FOR EACH STATEMENT/,
);
assert.match(
  migration,
  /CREATE FUNCTION "position_cleanup_reset_candidates_from_updated_plies"\(\)[\s\S]*NOT EXISTS \([\s\S]*FROM position_cleanup_old_plies AS old_ply[\s\S]*old_ply\."positionId" = new_ply\."positionId"/,
);
assert.match(migration, /SELECT DISTINCT "positionId"\s*FROM position_cleanup_new_plies/);
assert.match(
  migration,
  /DELETE FROM "PositionCleanupCandidate" AS candidate[\s\S]*candidate\."positionId" = referenced\."positionId"/,
);
assert.match(migration, /pg_advisory_xact_lock\(280026, referenced_position_id\)/);
assert.doesNotMatch(migration, /\"MoveNode\"/, 'position cleanup migration must not touch course trees');

assert.match(migration, /COMMIT;\s*$/);

console.log('Position cleanup migration contract tests passed.');
