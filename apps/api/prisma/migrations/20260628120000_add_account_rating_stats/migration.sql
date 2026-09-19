CREATE TABLE "AccountRatingStats" (
  "accountId" INTEGER PRIMARY KEY,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "gamesCount" INTEGER NOT NULL DEFAULT 0,
  "data" JSONB NOT NULL,
  CONSTRAINT "AccountRatingStats_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "ExternalAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
