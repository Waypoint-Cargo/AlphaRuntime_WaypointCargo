-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'CONFIRMED', 'PLANNED', 'DEFERRED', 'PARTIALLY_LOADED', 'LOADED', 'IN_TRANSIT', 'DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED', 'RECEIVED', 'RECEIVED_WITH_ISSUES', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TempClass" AS ENUM ('AMBIENT', 'CHILLED', 'FROZEN');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('local', 'google');

-- CreateEnum
CREATE TYPE "Brand" AS ENUM ('FRESH', 'STYLE', 'TECH');

-- CreateEnum
CREATE TYPE "DeferralReason" AS ENUM ('CAPACITY_UNAVAILABLE', 'DELIVERY_WINDOW_CONFLICT', 'VEHICLE_RESTRICTION', 'FUEL_LIMITATION', 'LOADING_SHORTFALL', 'OTHER');

-- CreateEnum
CREATE TYPE "DeferralStatus" AS ENUM ('PENDING_DECISION', 'DEFERRED', 'REPLANNED', 'SERVED');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('SIGNATURE', 'POD_PHOTO', 'ISSUE_PHOTO');

-- CreateEnum
CREATE TYPE "FuelEntryKind" AS ENUM ('PLANNED', 'ACTUAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "IssueSource" AS ENUM ('LOADER', 'DRIVER', 'STORE_MANAGER', 'DISPATCHER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('MISSING_ITEM', 'DAMAGED_ITEM', 'WRONG_ITEM', 'QUANTITY_MISMATCH', 'QUANTITY_SHORT', 'LATE_DELIVERY', 'OUTLET_CLOSED', 'VEHICLE_PROBLEM', 'TRAFFIC_DELAY', 'LOADING_SHORTFALL', 'SYNC_CONFLICT', 'OTHER');

-- CreateEnum
CREATE TYPE "LoadCheckStatus" AS ENUM ('PENDING', 'VERIFIED', 'SHORT', 'DAMAGED', 'WRONG_ITEM');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "OutletStaffRole" AS ENUM ('RECEIVING_STAFF', 'STORE_ASSISTANT', 'STORE_SUPERVISOR');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('OPEN', 'CLOSED', 'DRAFT', 'PUBLISHED', 'IN_EXECUTION', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('CONFIRMED', 'CONFIRMED_WITH_ISSUES');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DISPATCHER', 'LOADER', 'DRIVER', 'STORE_MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SequenceRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StopEventType" AS ENUM ('ARRIVED', 'UNLOADING_STARTED', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "StopStatus" AS ENUM ('PENDING', 'ARRIVED', 'UNLOADING', 'COMPLETED', 'PARTIAL', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "SyncResult" AS ENUM ('APPLIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PLANNED', 'LOADING', 'LOADED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UnloadingType" AS ENUM ('REAR_DOCK', 'CURB', 'MALL_BAY');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('REFRIGERATED_TRUCK', 'DRY_BOX_TRUCK', 'VAN');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "depotId" TEXT NOT NULL,
    "brand" "Brand" NOT NULL,
    "tempClass" "TempClass" NOT NULL,
    "requestedDeliveryDate" DATE NOT NULL,
    "deliveryDate" DATE NOT NULL,
    "rolledOver" BOOLEAN NOT NULL DEFAULT false,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "totalWeightKg" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalVolumeM3" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "windowStartMin" INTEGER,
    "windowEndMin" INTEGER,
    "vanOnly" BOOLEAN,
    "isMall" BOOLEAN,
    "unloadingType" "UnloadingType",
    "specialInstructions" TEXT,
    "isFragile" BOOLEAN NOT NULL DEFAULT false,
    "isHighValue" BOOLEAN NOT NULL DEFAULT false,
    "cutoffAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "sku" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'EA',
    "quantity" INTEGER NOT NULL,
    "weightKg" DECIMAL(10,2) NOT NULL,
    "volumeM3" DECIMAL(10,3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "actorId" TEXT,
    "reason" TEXT,
    "data" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "allocatedById" TEXT NOT NULL,
    "warningsAcknowledged" JSONB,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarDay" (
    "date" DATE NOT NULL,
    "isOperatingDay" BOOLEAN NOT NULL,
    "isWeekend" BOOLEAN NOT NULL DEFAULT false,
    "isPayday" BOOLEAN NOT NULL DEFAULT false,
    "festivalName" TEXT,
    "isMonsoon" BOOLEAN NOT NULL DEFAULT false,
    "sourceAttributes" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "CalendarDay_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "Deferral" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "planId" TEXT,
    "fromDate" DATE NOT NULL,
    "toDate" DATE,
    "status" "DeferralStatus" NOT NULL DEFAULT 'PENDING_DECISION',
    "reason" "DeferralReason",
    "note" TEXT,
    "detectedConflicts" JSONB NOT NULL DEFAULT '[]',
    "consecutiveCount" INTEGER NOT NULL DEFAULT 1,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveredLine" (
    "orderItemId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "deliveredQty" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "DeliveredLine_pkey" PRIMARY KEY ("orderItemId")
);

-- CreateTable
CREATE TABLE "DemandForecast" (
    "id" TEXT NOT NULL,
    "forecastDate" DATE NOT NULL,
    "depotId" TEXT NOT NULL,
    "brand" "Brand" NOT NULL,
    "tempClass" "TempClass" NOT NULL,
    "ordersExpected" DECIMAL(8,1),
    "weightKg" DECIMAL(12,2),
    "volumeM3" DECIMAL(12,3),
    "lowerBound" DECIMAL(12,2),
    "upperBound" DECIMAL(12,2),
    "modelVersion" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Depot" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Depot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchPlan" (
    "id" TEXT NOT NULL,
    "depotId" TEXT NOT NULL,
    "deliveryDate" DATE NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "kind" "FileKind" NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "clientFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelLedgerEntry" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "tripId" TEXT,
    "kind" "FuelEntryKind" NOT NULL,
    "distanceKm" DECIMAL(8,2) NOT NULL,
    "litres" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "statusCode" INTEGER,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("userId","key")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "source" "IssueSource" NOT NULL,
    "type" "IssueType" NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "orderId" TEXT,
    "tripId" TEXT,
    "stopId" TEXT,
    "orderItemId" TEXT,
    "expectedQty" INTEGER,
    "actualQty" INTEGER,
    "description" TEXT,
    "reportedById" TEXT NOT NULL,
    "reportedAtDevice" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "clientMutationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuePhoto" (
    "issueId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "IssuePhoto_pkey" PRIMARY KEY ("issueId","fileId")
);

-- CreateTable
CREATE TABLE "LoadingItemCheck" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "plannedQty" INTEGER NOT NULL,
    "loadedQty" INTEGER,
    "status" "LoadCheckStatus" NOT NULL DEFAULT 'PENDING',
    "checkedById" TEXT,
    "checkedAt" TIMESTAMP(3),
    "clientMutationId" TEXT,

    CONSTRAINT "LoadingItemCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadingSession" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "startedById" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "departedShort" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationPing" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "speedKmh" DECIMAL(5,1),
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationPing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "action" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outlet" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" "Brand" NOT NULL,
    "district" TEXT NOT NULL,
    "depotId" TEXT NOT NULL,
    "address" TEXT,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "phone" TEXT,
    "vanOnly" BOOLEAN NOT NULL DEFAULT false,
    "isMall" BOOLEAN NOT NULL DEFAULT false,
    "windowStartMin" INTEGER NOT NULL,
    "windowEndMin" INTEGER NOT NULL,
    "mallAccessStartMin" INTEGER,
    "mallAccessEndMin" INTEGER,
    "unloadingType" "UnloadingType",
    "unloadingNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceAttributes" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutletEmployee" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" "OutletStaffRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutletEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodPhoto" (
    "podId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "PodPhoto_pkey" PRIMARY KEY ("podId","fileId")
);

-- CreateTable
CREATE TABLE "ProofOfDelivery" (
    "id" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "signatureFileId" TEXT NOT NULL,
    "allDeliveredAsPlanned" BOOLEAN NOT NULL,
    "capturedAtDevice" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "driverId" TEXT NOT NULL,
    "clientMutationId" TEXT,

    CONSTRAINT "ProofOfDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "orderId" TEXT NOT NULL,
    "status" "ReceiptStatus" NOT NULL,
    "confirmedById" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "deviceId" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequenceChangeRequest" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "proposedSequence" JSONB NOT NULL,
    "reason" TEXT,
    "status" "SequenceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SequenceChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stop" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "sequence" SMALLINT NOT NULL,
    "status" "StopStatus" NOT NULL DEFAULT 'PENDING',
    "plannedArrival" TIMESTAMP(3),
    "predictedArrival" TIMESTAMP(3),
    "predictedServiceMin" DECIMAL(6,1),
    "predictedLatenessMin" DECIMAL(6,1),
    "legDistanceKm" DECIMAL(8,2),
    "arrivedAt" TIMESTAMP(3),
    "unloadingStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "Stop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StopEvent" (
    "id" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "type" "StopEventType" NOT NULL,
    "recordedAtDevice" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clockOffsetMs" INTEGER,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "actorId" TEXT NOT NULL,
    "clientMutationId" TEXT,
    "data" JSONB,

    CONSTRAINT "StopEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncMutation" (
    "clientMutationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "type" TEXT NOT NULL,
    "result" "SyncResult" NOT NULL,
    "resultCode" TEXT,
    "response" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncMutation_pkey" PRIMARY KEY ("clientMutationId")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "deliveryDate" DATE NOT NULL,
    "tripNumber" SMALLINT NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'PLANNED',
    "plannedDeparture" TIMESTAMP(3),
    "plannedReturn" TIMESTAMP(3),
    "plannedDistanceKm" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "plannedFuelL" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "plannedWeightKg" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "plannedVolumeM3" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "actualDeparture" TIMESTAMP(3),
    "actualReturn" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "employeeNumber" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "outletId" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDepot" (
    "userId" TEXT NOT NULL,
    "depotId" TEXT NOT NULL,

    CONSTRAINT "UserDepot_pkey" PRIMARY KEY ("userId","depotId")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,
    "isRefrigerated" BOOLEAN NOT NULL,
    "tempMinC" DECIMAL(4,1),
    "tempMaxC" DECIMAL(4,1),
    "maxWeightKg" DECIMAL(10,2) NOT NULL,
    "maxVolumeM3" DECIMAL(10,3) NOT NULL,
    "fuelKmPerLitre" DECIMAL(6,3),
    "weeklyFuelQuotaL" DECIMAL(10,2) NOT NULL,
    "homeDepotId" TEXT NOT NULL,
    "defaultDriverId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "statusNote" TEXT,
    "sourceAttributes" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");

-- CreateIndex
CREATE INDEX "Order_depotId_deliveryDate_status_idx" ON "Order"("depotId", "deliveryDate", "status");

-- CreateIndex
CREATE INDEX "Order_outletId_deliveryDate_idx" ON "Order"("outletId", "deliveryDate");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_orderId_lineNo_key" ON "OrderItem"("orderId", "lineNo");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_occurredAt_idx" ON "OrderEvent"("orderId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Allocation_orderId_key" ON "Allocation"("orderId");

-- CreateIndex
CREATE INDEX "Allocation_stopId_idx" ON "Allocation"("stopId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Deferral_orderId_idx" ON "Deferral"("orderId");

-- CreateIndex
CREATE INDEX "Deferral_outletId_fromDate_idx" ON "Deferral"("outletId", "fromDate" DESC);

-- CreateIndex
CREATE INDEX "Deferral_status_fromDate_idx" ON "Deferral"("status", "fromDate");

-- CreateIndex
CREATE INDEX "DeliveredLine_stopId_idx" ON "DeliveredLine"("stopId");

-- CreateIndex
CREATE INDEX "DemandForecast_depotId_forecastDate_idx" ON "DemandForecast"("depotId", "forecastDate");

-- CreateIndex
CREATE UNIQUE INDEX "DemandForecast_forecastDate_depotId_brand_tempClass_modelVe_key" ON "DemandForecast"("forecastDate", "depotId", "brand", "tempClass", "modelVersion");

-- CreateIndex
CREATE UNIQUE INDEX "Depot_code_key" ON "Depot"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchPlan_depotId_deliveryDate_key" ON "DispatchPlan"("depotId", "deliveryDate");

-- CreateIndex
CREATE UNIQUE INDEX "File_storageKey_key" ON "File"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "File_clientFileId_key" ON "File"("clientFileId");

-- CreateIndex
CREATE INDEX "File_uploadedById_createdAt_idx" ON "File"("uploadedById", "createdAt");

-- CreateIndex
CREATE INDEX "FuelLedgerEntry_vehicleId_weekStart_idx" ON "FuelLedgerEntry"("vehicleId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "FuelLedgerEntry_tripId_kind_key" ON "FuelLedgerEntry"("tripId", "kind");

-- CreateIndex
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_reference_key" ON "Issue"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_clientMutationId_key" ON "Issue"("clientMutationId");

-- CreateIndex
CREATE INDEX "Issue_orderId_idx" ON "Issue"("orderId");

-- CreateIndex
CREATE INDEX "Issue_reportedById_idx" ON "Issue"("reportedById");

-- CreateIndex
CREATE INDEX "Issue_status_createdAt_idx" ON "Issue"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Issue_tripId_idx" ON "Issue"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "IssuePhoto_fileId_key" ON "IssuePhoto"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "LoadingItemCheck_clientMutationId_key" ON "LoadingItemCheck"("clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "LoadingItemCheck_sessionId_orderItemId_key" ON "LoadingItemCheck"("sessionId", "orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "LoadingSession_tripId_key" ON "LoadingSession"("tripId");

-- CreateIndex
CREATE INDEX "LocationPing_tripId_recordedAt_idx" ON "LocationPing"("tripId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Outlet_code_key" ON "Outlet"("code");

-- CreateIndex
CREATE INDEX "Outlet_brand_idx" ON "Outlet"("brand");

-- CreateIndex
CREATE INDEX "Outlet_depotId_brand_idx" ON "Outlet"("depotId", "brand");

-- CreateIndex
CREATE INDEX "OutletEmployee_outletId_idx" ON "OutletEmployee"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "OutletEmployee_outletId_email_key" ON "OutletEmployee"("outletId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PodPhoto_fileId_key" ON "PodPhoto"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProofOfDelivery_stopId_key" ON "ProofOfDelivery"("stopId");

-- CreateIndex
CREATE UNIQUE INDEX "ProofOfDelivery_signatureFileId_key" ON "ProofOfDelivery"("signatureFileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProofOfDelivery_clientMutationId_key" ON "ProofOfDelivery"("clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_replacedById_key" ON "RefreshToken"("replacedById");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_family_idx" ON "RefreshToken"("family");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "SequenceChangeRequest_tripId_status_idx" ON "SequenceChangeRequest"("tripId", "status");

-- CreateIndex
CREATE INDEX "Stop_outletId_idx" ON "Stop"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "Stop_tripId_outletId_key" ON "Stop"("tripId", "outletId");

-- CreateIndex
CREATE UNIQUE INDEX "Stop_tripId_sequence_key" ON "Stop"("tripId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "StopEvent_clientMutationId_key" ON "StopEvent"("clientMutationId");

-- CreateIndex
CREATE INDEX "StopEvent_stopId_recordedAtDevice_idx" ON "StopEvent"("stopId", "recordedAtDevice");

-- CreateIndex
CREATE INDEX "SyncMutation_userId_receivedAt_idx" ON "SyncMutation"("userId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_code_key" ON "Trip"("code");

-- CreateIndex
CREATE INDEX "Trip_driverId_deliveryDate_idx" ON "Trip"("driverId", "deliveryDate");

-- CreateIndex
CREATE INDEX "Trip_planId_idx" ON "Trip"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_vehicleId_deliveryDate_tripNumber_key" ON "Trip"("vehicleId", "deliveryDate", "tripNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeNumber_key" ON "User"("employeeNumber");

-- CreateIndex
CREATE INDEX "User_outletId_idx" ON "User"("outletId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "UserDepot_depotId_idx" ON "UserDepot"("depotId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_code_key" ON "Vehicle"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_defaultDriverId_key" ON "Vehicle"("defaultDriverId");

-- CreateIndex
CREATE INDEX "Vehicle_homeDepotId_type_isRefrigerated_idx" ON "Vehicle"("homeDepotId", "type", "isRefrigerated");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryDate_fkey" FOREIGN KEY ("deliveryDate") REFERENCES "CalendarDay"("date") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_allocatedById_fkey" FOREIGN KEY ("allocatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deferral" ADD CONSTRAINT "Deferral_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deferral" ADD CONSTRAINT "Deferral_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deferral" ADD CONSTRAINT "Deferral_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deferral" ADD CONSTRAINT "Deferral_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DispatchPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveredLine" ADD CONSTRAINT "DeliveredLine_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveredLine" ADD CONSTRAINT "DeliveredLine_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchPlan" ADD CONSTRAINT "DispatchPlan_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchPlan" ADD CONSTRAINT "DispatchPlan_deliveryDate_fkey" FOREIGN KEY ("deliveryDate") REFERENCES "CalendarDay"("date") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchPlan" ADD CONSTRAINT "DispatchPlan_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchPlan" ADD CONSTRAINT "DispatchPlan_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLedgerEntry" ADD CONSTRAINT "FuelLedgerEntry_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLedgerEntry" ADD CONSTRAINT "FuelLedgerEntry_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuePhoto" ADD CONSTRAINT "IssuePhoto_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuePhoto" ADD CONSTRAINT "IssuePhoto_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingItemCheck" ADD CONSTRAINT "LoadingItemCheck_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingItemCheck" ADD CONSTRAINT "LoadingItemCheck_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingItemCheck" ADD CONSTRAINT "LoadingItemCheck_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LoadingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingSession" ADD CONSTRAINT "LoadingSession_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingSession" ADD CONSTRAINT "LoadingSession_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingSession" ADD CONSTRAINT "LoadingSession_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationPing" ADD CONSTRAINT "LocationPing_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletEmployee" ADD CONSTRAINT "OutletEmployee_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodPhoto" ADD CONSTRAINT "PodPhoto_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodPhoto" ADD CONSTRAINT "PodPhoto_podId_fkey" FOREIGN KEY ("podId") REFERENCES "ProofOfDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfDelivery" ADD CONSTRAINT "ProofOfDelivery_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfDelivery" ADD CONSTRAINT "ProofOfDelivery_signatureFileId_fkey" FOREIGN KEY ("signatureFileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfDelivery" ADD CONSTRAINT "ProofOfDelivery_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "RefreshToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceChangeRequest" ADD CONSTRAINT "SequenceChangeRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceChangeRequest" ADD CONSTRAINT "SequenceChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceChangeRequest" ADD CONSTRAINT "SequenceChangeRequest_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stop" ADD CONSTRAINT "Stop_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stop" ADD CONSTRAINT "Stop_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopEvent" ADD CONSTRAINT "StopEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopEvent" ADD CONSTRAINT "StopEvent_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncMutation" ADD CONSTRAINT "SyncMutation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DispatchPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDepot" ADD CONSTRAINT "UserDepot_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDepot" ADD CONSTRAINT "UserDepot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_defaultDriverId_fkey" FOREIGN KEY ("defaultDriverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_homeDepotId_fkey" FOREIGN KEY ("homeDepotId") REFERENCES "Depot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

