CREATE TABLE "AppUser" (
    "id" SERIAL NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalAccount" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "providerUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "syncCursorTime" TIMESTAMP(3),
    "lastSyncRunId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportedGame" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "providerGameId" TEXT NOT NULL,
    "providerUrl" TEXT,
    "pgn" TEXT,
    "rawJson" JSONB,
    "rated" BOOLEAN,
    "variant" TEXT,
    "speedCategory" TEXT,
    "timeControlRaw" TEXT,
    "timeControlInitial" INTEGER,
    "timeControlIncrement" INTEGER,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "whiteUsername" TEXT,
    "blackUsername" TEXT,
    "whiteRating" INTEGER,
    "blackRating" INTEGER,
    "userColor" TEXT,
    "opponentUsername" TEXT,
    "result" TEXT,
    "resultForUser" TEXT,
    "status" TEXT,
    "openingName" TEXT,
    "openingEco" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportedGame_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportRun" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "syncSince" TIMESTAMP(3),
    "syncUntil" TIMESTAMP(3),
    "gamesSeen" INTEGER NOT NULL DEFAULT 0,
    "gamesImported" INTEGER NOT NULL DEFAULT 0,
    "gamesUpdated" INTEGER NOT NULL DEFAULT 0,
    "gamesSkipped" INTEGER NOT NULL DEFAULT 0,
    "gamesFailed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalAccount_userId_provider_username_key" ON "ExternalAccount"("userId", "provider", "username");
CREATE INDEX "ExternalAccount_userId_idx" ON "ExternalAccount"("userId");
CREATE INDEX "ExternalAccount_provider_username_idx" ON "ExternalAccount"("provider", "username");

CREATE UNIQUE INDEX "ImportedGame_accountId_providerGameId_key" ON "ImportedGame"("accountId", "providerGameId");
CREATE INDEX "ImportedGame_userId_endedAt_idx" ON "ImportedGame"("userId", "endedAt");
CREATE INDEX "ImportedGame_accountId_endedAt_idx" ON "ImportedGame"("accountId", "endedAt");
CREATE INDEX "ImportedGame_provider_providerGameId_idx" ON "ImportedGame"("provider", "providerGameId");

CREATE INDEX "ImportRun_accountId_startedAt_idx" ON "ImportRun"("accountId", "startedAt");
CREATE INDEX "ImportRun_userId_startedAt_idx" ON "ImportRun"("userId", "startedAt");

ALTER TABLE "ExternalAccount" ADD CONSTRAINT "ExternalAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportedGame" ADD CONSTRAINT "ImportedGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportedGame" ADD CONSTRAINT "ImportedGame_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ExternalAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ExternalAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;