ALTER TABLE "Course"
ADD COLUMN "side" TEXT,
ADD COLUMN "coverKey" TEXT;

UPDATE "Course" AS course
SET "side" = COALESCE(
  (
    SELECT line."sideToTrain"
    FROM "Chapter" AS chapter
    JOIN "Line" AS line ON line."chapterId" = chapter."id"
    WHERE chapter."courseId" = course."id"
    GROUP BY line."sideToTrain"
    ORDER BY COUNT(*) DESC, line."sideToTrain" ASC
    LIMIT 1
  ),
  'WHITE'
);

ALTER TABLE "Course"
ALTER COLUMN "side" SET DEFAULT 'WHITE',
ALTER COLUMN "side" SET NOT NULL;

ALTER TABLE "Course"
ADD CONSTRAINT "Course_side_check" CHECK ("side" IN ('WHITE', 'BLACK')),
ADD CONSTRAINT "Course_coverKey_check" CHECK (
  "coverKey" IS NULL OR "coverKey" IN (
    'QUEENS_GAMBIT',
    'SICILIAN',
    'FIANCHETTO',
    'CLASSICAL_DEFENSE',
    'WHITE_INITIATIVE',
    'BLACK_COUNTERPLAY'
  )
);
