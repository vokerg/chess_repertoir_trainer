-- CreateTable
CREATE TABLE "JobRun" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "totalTasks" INTEGER NOT NULL,
    "force" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTask" (
    "id" SERIAL NOT NULL,
    "jobRunId" INTEGER NOT NULL,
    "importedGameId" INTEGER NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "workKey" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobRun_status_priority_updatedAt_idx" ON "JobRun"("status", "priority", "updatedAt");

-- CreateIndex
CREATE INDEX "JobRun_userId_createdAt_idx" ON "JobRun"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobTask_workKey_key" ON "JobTask"("workKey");

-- CreateIndex
CREATE UNIQUE INDEX "JobTask_jobRunId_importedGameId_key" ON "JobTask"("jobRunId", "importedGameId");

-- CreateIndex
CREATE INDEX "JobTask_jobRunId_status_ordinal_idx" ON "JobTask"("jobRunId", "status", "ordinal");

-- CreateIndex
CREATE INDEX "JobTask_status_updatedAt_idx" ON "JobTask"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTask" ADD CONSTRAINT "JobTask_jobRunId_fkey" FOREIGN KEY ("jobRunId") REFERENCES "JobRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTask" ADD CONSTRAINT "JobTask_importedGameId_fkey" FOREIGN KEY ("importedGameId") REFERENCES "ImportedGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
