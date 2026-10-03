ALTER TABLE "ImportedGame" ADD COLUMN "liked" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "ImportedGame_liked_user_ended_idx" ON "ImportedGame" ("userId", "endedAt", "id") WHERE "liked" = true;
CREATE TABLE "GameLibrary" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" VARCHAR(100) NOT NULL
);
CREATE INDEX "GameLibrary_userId_id_idx" ON "GameLibrary"("userId", "id");
CREATE TABLE "GameLibraryEntry" (
  "libraryId" INTEGER NOT NULL REFERENCES "GameLibrary"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "gameId" INTEGER NOT NULL REFERENCES "ImportedGame"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY ("libraryId", "gameId")
);
CREATE INDEX "GameLibraryEntry_gameId_idx" ON "GameLibraryEntry"("gameId");
