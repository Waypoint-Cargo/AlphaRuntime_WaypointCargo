-- Per-depot stock used by the order availability check.
-- The table was first created in the database outside migration history (prisma db push);
-- this file records it so history matches the database. It was marked applied with
-- `prisma migrate resolve --applied`, so it is not re-run on a database that already has it.

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "depotId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'EA',
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "reservedQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Stock_sku_idx" ON "Stock"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_depotId_sku_key" ON "Stock"("depotId", "sku");

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written: Prisma's schema language cannot express CHECK constraints.
-- Raised as SQLSTATE 23514 like the other business constraints.
ALTER TABLE "Stock" ADD CONSTRAINT stock_qty_chk
  CHECK ("quantityOnHand" >= 0 AND "reservedQty" >= 0 AND "reservedQty" <= "quantityOnHand");
