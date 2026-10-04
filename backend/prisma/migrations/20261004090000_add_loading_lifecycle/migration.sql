-- Loader module: task lifecycle, claim lock and shortfall details on the existing loading tables.
-- A trip with no LoadingSession row is a PENDING task in the shared pool, so "PENDING" is not an enum value.
-- Purely additive: no existing column is changed or dropped.

-- CreateEnum
CREATE TYPE "LoadingStatus" AS ENUM ('IN_PROGRESS', 'PAUSED', 'ON_HOLD', 'COMPLETED');

-- AlterTable
ALTER TABLE "LoadingSession" ADD COLUMN     "lockExpiresAt" TIMESTAMP(3),
ADD COLUMN     "lockedById" TEXT,
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "pausedSec" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "LoadingStatus" NOT NULL DEFAULT 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "LoadingItemCheck" ADD COLUMN     "issueId" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "shortQty" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "LoadingSession_status_idx" ON "LoadingSession"("status");

-- CreateIndex
CREATE INDEX "LoadingSession_lockedById_idx" ON "LoadingSession"("lockedById");

-- CreateIndex
CREATE INDEX "LoadingItemCheck_issueId_idx" ON "LoadingItemCheck"("issueId");

-- AddForeignKey
ALTER TABLE "LoadingSession" ADD CONSTRAINT "LoadingSession_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingItemCheck" ADD CONSTRAINT "LoadingItemCheck_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-written: Prisma's schema language cannot express a backfill or CHECK constraints.
-- Raised as SQLSTATE 23514 like the other business constraints. Application code checks the same
-- rules first and explains them to the user; these are the safety net for anything that bypasses a service.

-- A session finished before this migration keeps its meaning (the new column defaults to IN_PROGRESS).
UPDATE "LoadingSession" SET "status" = 'COMPLETED' WHERE "completedAt" IS NOT NULL;

ALTER TABLE "LoadingSession" ADD CONSTRAINT loadingsession_pausedsec_chk
  CHECK ("pausedSec" >= 0);

-- a finished session always says when it finished
ALTER TABLE "LoadingSession" ADD CONSTRAINT loadingsession_completed_chk
  CHECK ("status" <> 'COMPLETED' OR "completedAt" IS NOT NULL);

-- only an IN_PROGRESS session carries a claim lock (deleting the holder sets lockedById to NULL, which still passes)
ALTER TABLE "LoadingSession" ADD CONSTRAINT loadingsession_lock_chk
  CHECK ("status" = 'IN_PROGRESS' OR ("lockedById" IS NULL AND "lockExpiresAt" IS NULL));

-- quantities are never negative. There is deliberately no loadedQty <= plannedQty check here: when the
-- dispatcher shrinks an order after loading began, the surplus is real and the loader has to unload it.
-- The service rejects any write that would load more than the plan.
ALTER TABLE "LoadingItemCheck" ADD CONSTRAINT loadingcheck_qty_chk
  CHECK ("plannedQty" >= 0 AND COALESCE("loadedQty", 0) >= 0 AND "shortQty" >= 0);
