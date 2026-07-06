ALTER TABLE "MoveNode" ADD COLUMN "fenBeforeNormalized" VARCHAR(120);

UPDATE "MoveNode"
SET "fenBeforeNormalized" = CASE
  WHEN "fenBefore" = 'startpos' THEN 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -'
  ELSE array_to_string((regexp_split_to_array(trim("fenBefore"), '\s+'))[1:4], ' ')
END
WHERE "fenBeforeNormalized" IS NULL;

CREATE INDEX "MoveNode_fenBeforeNormalized_idx" ON "MoveNode"("fenBeforeNormalized");
