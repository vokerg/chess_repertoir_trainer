-- Refactor analysis persistence for client-side Stockfish.
-- Position keeps using the existing ImportedGamePosition physical table via Prisma @@map.

ALTER TABLE "ImportedGamePly"
  ADD COLUMN IF NOT EXISTS "scoreLossCp" SMALLINT,
  ADD COLUMN IF NOT EXISTS "classificationCode" SMALLINT;

CREATE INDEX IF NOT EXISTS "ImportedGamePly_classificationCode_idx" ON "ImportedGamePly"("classificationCode");

-- Backfill compact ply analysis from the old per-move table before it is removed from Prisma.
UPDATE "ImportedGamePly" p
SET
  "scoreLossCp" = CASE
    WHEN gma."scoreLossCp" IS NULL THEN NULL
    WHEN gma."scoreLossCp" > 32767 THEN 32767
    WHEN gma."scoreLossCp" < -32768 THEN -32768
    ELSE gma."scoreLossCp"::smallint
  END,
  "classificationCode" = CASE UPPER(COALESCE(gma."classification", ''))
    WHEN 'BOOK' THEN 1
    WHEN 'BEST' THEN 2
    WHEN 'GOOD' THEN 3
    WHEN 'INACCURACY' THEN 4
    WHEN 'MISTAKE' THEN 5
    WHEN 'BLUNDER' THEN 6
    WHEN 'MISS' THEN 7
    WHEN 'MISSED_OPPORTUNITY' THEN 7
    WHEN 'BRILLIANT' THEN 8
    WHEN 'FORCED' THEN 9
    ELSE NULL
  END
FROM "GameMoveAnalysis" gma
WHERE p."importedGameId" = gma."importedGameId"
  AND p."plyNumber" = gma."plyNumber";

-- Collapse old cache-key PositionAnalysis rows into one row per canonical Position.
CREATE TEMP TABLE "_lean_position_analysis" AS
SELECT DISTINCT ON (pos.id)
  pos.id AS "positionId",
  LEFT(pa."bestMoveUci", 5)::varchar(5) AS "bestMoveUci",
  CASE
    WHEN pa."bestScoreCpWhite" IS NULL THEN NULL
    WHEN pa."bestScoreCpWhite" > 32767 THEN 32767
    WHEN pa."bestScoreCpWhite" < -32768 THEN -32768
    ELSE pa."bestScoreCpWhite"::smallint
  END AS "bestScoreCpWhite",
  NULL::smallint AS "bestMateWhite",
  pa."lines"
FROM "PositionAnalysis" pa
JOIN "ImportedGamePosition" pos
  ON pos."normalizedFen" = split_part(pa."normalizedFen", ' ', 1) || ' ' || split_part(pa."normalizedFen", ' ', 2) || ' ' || split_part(pa."normalizedFen", ' ', 3) || ' ' || split_part(pa."normalizedFen", ' ', 4)
ORDER BY pos.id, (pa."bestMoveUci" IS NOT NULL) DESC, (pa."lines" IS NOT NULL) DESC, pa."updatedAt" DESC;

DROP TABLE IF EXISTS "GameMoveAnalysis";
DROP TABLE IF EXISTS "PositionAnalysis";

CREATE TABLE "PositionAnalysis" (
  "id" SERIAL PRIMARY KEY,
  "positionId" INTEGER NOT NULL UNIQUE,
  "bestMoveUci" VARCHAR(5),
  "bestScoreCpWhite" SMALLINT,
  "bestMateWhite" SMALLINT,
  "lines" JSONB,
  CONSTRAINT "PositionAnalysis_positionId_fkey"
    FOREIGN KEY ("positionId") REFERENCES "ImportedGamePosition"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "PositionAnalysis" ("positionId", "bestMoveUci", "bestScoreCpWhite", "bestMateWhite", "lines")
SELECT "positionId", "bestMoveUci", "bestScoreCpWhite", "bestMateWhite", "lines"
FROM "_lean_position_analysis";

DROP TABLE IF EXISTS "_lean_position_analysis";

ALTER TABLE "GameAnalysisRun"
  DROP COLUMN IF EXISTS "depth",
  DROP COLUMN IF EXISTS "multipv",
  DROP COLUMN IF EXISTS "engineName",
  DROP COLUMN IF EXISTS "engineVersion";
