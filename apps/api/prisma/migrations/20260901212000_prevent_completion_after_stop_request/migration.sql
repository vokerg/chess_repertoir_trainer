-- ONB-020: a durable post-mutation stop request must win over verified completion.
-- If STOP_AFTER_BATCH commits before the completion transition, the worker must
-- settle NEEDS_ATTENTION and retain the lifecycle fence instead of completing.

ALTER TABLE "DataLifecycleOperation"
ADD CONSTRAINT "DataLifecycleOperation_stopBeforeCompletion_check"
CHECK ("status" <> 'COMPLETED' OR "stopRequest" <> 'STOP_AFTER_BATCH');
