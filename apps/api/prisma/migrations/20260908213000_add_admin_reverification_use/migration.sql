CREATE TABLE "AdminReverificationUse" (
    "id" SERIAL NOT NULL,
    "reverificationIdHash" VARCHAR(64) NOT NULL,
    "operationId" INTEGER NOT NULL,
    "actorKeyVersion" INTEGER NOT NULL,
    "actorKeyHash" VARCHAR(64) NOT NULL,
    "targetKeyVersion" INTEGER NOT NULL,
    "targetKeyHash" VARCHAR(64) NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "previewHash" VARCHAR(64) NOT NULL,
    "idempotencyKeyHash" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminReverificationUse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminReverificationUse_reverificationIdHash_key"
ON "AdminReverificationUse"("reverificationIdHash");

CREATE INDEX "AdminReverificationUse_operationId_createdAt_idx"
ON "AdminReverificationUse"("operationId", "createdAt");
