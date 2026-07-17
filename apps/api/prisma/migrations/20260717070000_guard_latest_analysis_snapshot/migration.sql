-- Analysis can still arrive from both the legacy client workflow and the persistent worker
-- during migration. Preserve the newest denormalized snapshot when an older run settles later.
CREATE OR REPLACE FUNCTION preserve_newest_imported_game_analysis_snapshot()
RETURNS trigger AS $$
BEGIN
  IF OLD."latestAnalysisCreatedAt" IS NOT NULL
     AND NEW."latestAnalysisCreatedAt" IS NOT NULL
     AND (
       NEW."latestAnalysisCreatedAt" < OLD."latestAnalysisCreatedAt"
       OR (
         NEW."latestAnalysisCreatedAt" = OLD."latestAnalysisCreatedAt"
         AND COALESCE(NEW."latestAnalysisRunId", -1) < COALESCE(OLD."latestAnalysisRunId", -1)
       )
     )
  THEN
    NEW."latestAnalysisRunId" := OLD."latestAnalysisRunId";
    NEW."latestAnalysisStatus" := OLD."latestAnalysisStatus";
    NEW."latestAnalysisCreatedAt" := OLD."latestAnalysisCreatedAt";
    NEW."latestAnalysisCompletedAt" := OLD."latestAnalysisCompletedAt";
    NEW."latestWhiteAccuracy" := OLD."latestWhiteAccuracy";
    NEW."latestBlackAccuracy" := OLD."latestBlackAccuracy";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER preserve_newest_imported_game_analysis_snapshot
BEFORE UPDATE OF
  "latestAnalysisRunId",
  "latestAnalysisStatus",
  "latestAnalysisCreatedAt",
  "latestAnalysisCompletedAt",
  "latestWhiteAccuracy",
  "latestBlackAccuracy"
ON "ImportedGame"
FOR EACH ROW
EXECUTE FUNCTION preserve_newest_imported_game_analysis_snapshot();
