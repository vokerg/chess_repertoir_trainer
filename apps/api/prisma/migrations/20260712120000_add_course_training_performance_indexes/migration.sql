CREATE INDEX "Chapter_courseId_sortOrder_idx"
ON "Chapter"("courseId", "sortOrder");

CREATE INDEX "TrainingSublineAttempt_recent_scored_idx"
ON "TrainingSublineAttempt"
  ("userId", "lineId", "sublineHash", "completedAt" DESC, "startedAt" DESC)
WHERE "result" IN ('PASSED', 'FAILED');
