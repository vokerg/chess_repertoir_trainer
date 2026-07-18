-- Record only the most recent claimed execution attempt for each task.
-- Existing tasks intentionally retain NULL timing because historical execution
-- timing cannot be reconstructed reliably from lifecycle timestamps.
ALTER TABLE "JobTask"
ADD COLUMN "startedAt" TIMESTAMP(3),
ADD COLUMN "settledAt" TIMESTAMP(3);
