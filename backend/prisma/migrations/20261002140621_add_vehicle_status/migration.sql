-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'ON_ROUTE', 'MAINTENANCE');

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE';

-- CreateIndex
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");
