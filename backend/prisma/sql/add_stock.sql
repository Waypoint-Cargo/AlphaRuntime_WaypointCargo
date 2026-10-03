-- Additive, idempotent. Applied by `npm run db:seed` (prisma/seed.js).
CREATE TABLE IF NOT EXISTS "Stock" (
  "id"             TEXT        NOT NULL,
  "depotId"        TEXT        NOT NULL,
  "sku"            TEXT        NOT NULL,
  "itemName"       TEXT        NOT NULL,
  "unit"           TEXT        NOT NULL DEFAULT 'EA',
  "quantityOnHand" INTEGER     NOT NULL DEFAULT 0,
  "reservedQty"    INTEGER     NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Stock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_qty_chk" CHECK ("quantityOnHand" >= 0 AND "reservedQty" >= 0 AND "reservedQty" <= "quantityOnHand"),
  CONSTRAINT "Stock_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Stock_depotId_sku_key" ON "Stock"("depotId", "sku");
CREATE INDEX IF NOT EXISTS "Stock_sku_idx" ON "Stock"("sku");
