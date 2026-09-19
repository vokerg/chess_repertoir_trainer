CREATE TABLE "LichessConnection" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "externalAccountId" INTEGER,
    "lichessUserId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "scopes" TEXT[] NOT NULL,
    "accessTokenCiphertext" TEXT NOT NULL,
    "accessTokenIv" TEXT NOT NULL,
    "accessTokenAuthTag" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LichessConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OAuthLoginState" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "redirectAfter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthLoginState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LichessConnection_userId_key" ON "LichessConnection"("userId");
CREATE INDEX "LichessConnection_lichessUserId_idx" ON "LichessConnection"("lichessUserId");
CREATE INDEX "LichessConnection_username_idx" ON "LichessConnection"("username");
CREATE UNIQUE INDEX "OAuthLoginState_state_key" ON "OAuthLoginState"("state");
CREATE INDEX "OAuthLoginState_userId_provider_idx" ON "OAuthLoginState"("userId", "provider");
CREATE INDEX "OAuthLoginState_expiresAt_idx" ON "OAuthLoginState"("expiresAt");

ALTER TABLE "LichessConnection" ADD CONSTRAINT "LichessConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LichessConnection" ADD CONSTRAINT "LichessConnection_externalAccountId_fkey" FOREIGN KEY ("externalAccountId") REFERENCES "ExternalAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
