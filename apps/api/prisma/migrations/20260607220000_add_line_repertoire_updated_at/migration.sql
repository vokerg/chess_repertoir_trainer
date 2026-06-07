ALTER TABLE "Line"
ADD COLUMN "repertoireUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Line"
SET "repertoireUpdatedAt" = "updatedAt";

CREATE INDEX "Line_chapterId_repertoireUpdatedAt_idx"
ON "Line"("chapterId", "repertoireUpdatedAt");

CREATE INDEX "MoveNode_lineId_parentId_idx"
ON "MoveNode"("lineId", "parentId");

CREATE INDEX "MoveNode_lineId_parentId_moveUci_idx"
ON "MoveNode"("lineId", "parentId", "moveUci");
