CREATE INDEX "ImportedGame_userId_speedCategory_endedAt_idx"
ON "ImportedGame"("userId", "speedCategory", "endedAt");

CREATE INDEX "ImportedGame_accountId_speedCategory_endedAt_idx"
ON "ImportedGame"("accountId", "speedCategory", "endedAt");

CREATE INDEX "ImportedGamePly_normalizedFen_moveUci_importedGameId_plyNumber_idx"
ON "ImportedGamePly"("normalizedFen", "moveUci", "importedGameId", "plyNumber");
