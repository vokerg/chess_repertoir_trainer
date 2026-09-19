ALTER TABLE "AppUser" ADD COLUMN "defaultProgressAccountId" INTEGER;

CREATE UNIQUE INDEX "AppUser_defaultProgressAccountId_key" ON "AppUser"("defaultProgressAccountId");

ALTER TABLE "AppUser"
  ADD CONSTRAINT "AppUser_defaultProgressAccountId_fkey"
  FOREIGN KEY ("defaultProgressAccountId")
  REFERENCES "ExternalAccount"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
