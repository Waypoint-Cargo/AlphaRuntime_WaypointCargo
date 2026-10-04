-- DropIndex
DROP INDEX "User_googleId_key";

-- DropIndex
DROP INDEX "User_username_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "authProvider",
DROP COLUMN "avatarUrl",
DROP COLUMN "googleId",
DROP COLUMN "username",
ALTER COLUMN "password" SET NOT NULL;

