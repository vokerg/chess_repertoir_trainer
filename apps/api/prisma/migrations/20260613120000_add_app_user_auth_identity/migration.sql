ALTER TABLE "AppUser"
ADD COLUMN "authProvider" TEXT,
ADD COLUMN "authSubject" TEXT,
ADD COLUMN "email" TEXT;

CREATE UNIQUE INDEX "AppUser_authProvider_authSubject_key"
ON "AppUser"("authProvider", "authSubject");
