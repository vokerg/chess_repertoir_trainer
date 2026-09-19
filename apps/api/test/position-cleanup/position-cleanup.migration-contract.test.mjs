import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const migration = await readFile(path.join(
  here,
  '../../prisma/migrations/20260903080000_position_cleanup_foundation/migration.sql',
), 'utf8');
const reviewMigration = await readFile(path.join(
  here,
  '../../prisma/migrations/20260912050000_position_cleanup_review_fixes/migration.sql',
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
assert.match(migration, /"candidatesInspected" INTEGER NOT NULL DEFAULT 0/);
assert.match(migration, /"orphansFirstObserved" INTEGER NOT NULL DEFAULT 0/);
assert.match(migration, /"orphansRefreshed" INTEGER NOT NULL DEFAULT 0/);
assert.match(reviewMigration, /ADD COLUMN "reconcileCandidatesInspected" INTEGER NOT NULL DEFAULT 0/);
assert.match(reviewMigration, /ADD COLUMN "orphansMatched" INTEGER NOT NULL DEFAULT 0/);
assert.match(reviewMigration, /ADD COLUMN "candidatesMatched" INTEGER NOT NULL DEFAULT 0/);
assert.match(
  migration,
  /CREATE TRIGGER "ImportedGamePly_position_cleanup_reset_insert"\s*AFTER INSERT ON "ImportedGamePly"\s*REFERENCING NEW TABLE AS position_cleanup_new_plies\s*FOR EACH STATEMENT/,
);
assert.match(
  migration,
  /CREATE TRIGGER "ImportedGamePly_position_cleanup_reset_update"\s*AFTER UPDATE ON "ImportedGamePly"\s*REFERENCING NEW TABLE AS position_cleanup_new_plies\s*FOR EACH STATEMENT/,
);
assert.match(
  reviewMigration,
  /CREATE TRIGGER "ImportedGamePly_position_cleanup_reset_update"\s*AFTER UPDATE ON "ImportedGamePly"\s*REFERENCING OLD TABLE AS position_cleanup_old_plies NEW TABLE AS position_cleanup_new_plies\s*FOR EACH STATEMENT/,
);
assert.match(
  reviewMigration,
  /LEFT JOIN position_cleanup_old_plies AS old_ply[\s\S]*old_ply\."importedGameId" = new_ply\."importedGameId"[\s\S]*old_ply\."plyNumber" = new_ply\."plyNumber"[\s\S]*old_ply\."positionId" = new_ply\."positionId"/,
);
assert.match(
  reviewMigration,
  /LEFT JOIN "PositionCleanupCandidate" AS candidate[\s\S]*candidate\."positionId" = new_ply\."positionId"/,
);
assert.match(
  reviewMigration,
  /old_ply\."importedGameId" IS NULL[\s\S]*OR candidate\."positionId" IS NOT NULL/,
);
assert.match(reviewMigration, /WHERE candidate\."positionId" = ANY\(reset_position_ids\)/);
assert.match(migration, /SELECT DISTINCT "positionId"\s*FROM position_cleanup_new_plies/);
assert.match(
  migration,
  /DELETE FROM "PositionCleanupCandidate" AS candidate[\s\S]*candidate\."positionId" = referenced\."positionId"/,
);
assert.match(migration, /pg_advisory_xact_lock\(280026, referenced_position_id\)/);
assert.doesNotMatch(migration, /\"MoveNode\"/, 'position cleanup migration must not touch course trees');
assert.doesNotMatch(reviewMigration, /\"MoveNode\"/, 'position cleanup review migration must not touch course trees');

assert.match(migration, /COMMIT;\s*$/);
assert.match(reviewMigration, /^BEGIN;$/m);
assert.match(reviewMigration, /COMMIT;\s*$/);

console.log('Position cleanup migration contract tests passed.');
