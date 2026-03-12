-- AlterTable: allow NULL password for Google-only users
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable: add googleId for linking Google accounts
ALTER TABLE "users" ADD COLUMN "googleId" TEXT;

-- CreateUniqueIndex for googleId (unique per Google account)
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
