/**
 * Standalone demo dataset generator for Waypoint Cargo:
 * - 36 rich catalog items in Stock for every depot (with 10,000 units on hand each)
 * - 10 active, available vehicles assigned to drivers DRV-001 through DRV-010
 * - Specific setup for Dispatcher Ezza Davis (dis_003 / ezzadavis398@gmail.com) with depot assignments
 * - Tailored orders for OUT060 (Matara Fresh - Ezza Davis outlet) and OUT001 (Colombo Fresh - Store Manager outlet)
 * - Rich orders across all statuses: CONFIRMED, PENDING_REVIEW, DRAFT, DEFERRED, PLANNED, IN_TRANSIT, DELIVERED
 *
 * Run with: node prisma/seed-demo-dataset.js
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { getPrisma, disconnectDatabase } from "../src/config/database.js";

const CATALOG_ITEMS = [
  // FRESH AMBIENT
  { sku: "PRO-BAN-020", itemName: "Embul Bananas 1kg", unit: "KG", weightKg: 1.0, volumeM3: 0.002, brand: "FRESH", tempClass: "AMBIENT" },
  { sku: "PRO-TOM-021", itemName: "Fresh Tomatoes 1kg", unit: "KG", weightKg: 1.0, volumeM3: 0.002, brand: "FRESH", tempClass: "AMBIENT" },
  { sku: "BAK-BRD-010", itemName: "Sliced White Bread Loaf", unit: "EA", weightKg: 0.45, volumeM3: 0.003, brand: "FRESH", tempClass: "AMBIENT" },
  { sku: "BAK-BUN-011", itemName: "Fish Bun Pack of 6", unit: "PACK", weightKg: 0.6, volumeM3: 0.003, brand: "FRESH", tempClass: "AMBIENT" },
  { sku: "GRO-RIC-050", itemName: "Keeri Samba Rice 5kg", unit: "BAG", weightKg: 5.0, volumeM3: 0.008, brand: "FRESH", tempClass: "AMBIENT" },
  { sku: "GRO-TEA-051", itemName: "Pure Ceylon Black Tea 500g", unit: "BOX", weightKg: 0.5, volumeM3: 0.001, brand: "FRESH", tempClass: "AMBIENT" },

  // FRESH CHILLED
  { sku: "DAI-MILK-001", itemName: "Organic Whole Milk 1L", unit: "EA", weightKg: 1.05, volumeM3: 0.0015, brand: "FRESH", tempClass: "CHILLED" },
  { sku: "DAI-CHE-002", itemName: "Cheddar Cheese Block 250g", unit: "EA", weightKg: 0.26, volumeM3: 0.0005, brand: "FRESH", tempClass: "CHILLED" },
  { sku: "DAI-YOG-003", itemName: "Natural Set Yoghurt 500g", unit: "EA", weightKg: 0.52, volumeM3: 0.0008, brand: "FRESH", tempClass: "CHILLED" },
  { sku: "DAI-BUT-004", itemName: "Salted Table Butter 200g", unit: "EA", weightKg: 0.21, volumeM3: 0.0004, brand: "FRESH", tempClass: "CHILLED" },
  { sku: "MEA-CHK-030", itemName: "Fresh Chilled Chicken Whole 1kg", unit: "KG", weightKg: 1.2, volumeM3: 0.0025, brand: "FRESH", tempClass: "CHILLED" },
  { sku: "SEA-TUN-031", itemName: "Yellowfin Tuna Fillet 1kg", unit: "KG", weightKg: 1.1, volumeM3: 0.002, brand: "FRESH", tempClass: "CHILLED" },

  // FRESH FROZEN
  { sku: "FRO-PEA-060", itemName: "Frozen Green Peas 1kg", unit: "PACK", weightKg: 1.0, volumeM3: 0.002, brand: "FRESH", tempClass: "FROZEN" },
  { sku: "FRO-SAU-061", itemName: "Chicken Sausages 500g", unit: "PACK", weightKg: 0.5, volumeM3: 0.001, brand: "FRESH", tempClass: "FROZEN" },
  { sku: "FRO-ICE-062", itemName: "Vanilla Dairy Ice Cream 1L", unit: "TUB", weightKg: 0.6, volumeM3: 0.0015, brand: "FRESH", tempClass: "FROZEN" },
  { sku: "FRO-FSH-063", itemName: "Frozen Fish Fingers 400g", unit: "BOX", weightKg: 0.42, volumeM3: 0.0009, brand: "FRESH", tempClass: "FROZEN" },

  // STYLE AMBIENT
  { sku: "APP-TSH-100", itemName: "Premium Cotton T-Shirt (M)", unit: "EA", weightKg: 0.22, volumeM3: 0.001, brand: "STYLE", tempClass: "AMBIENT" },
  { sku: "APP-TSH-101", itemName: "Premium Cotton T-Shirt (L)", unit: "EA", weightKg: 0.25, volumeM3: 0.0012, brand: "STYLE", tempClass: "AMBIENT" },
  { sku: "APP-JNS-102", itemName: "Slim Denim Jeans (32)", unit: "EA", weightKg: 0.65, volumeM3: 0.003, brand: "STYLE", tempClass: "AMBIENT" },
  { sku: "APP-SAR-103", itemName: "Traditional Handloom Saree", unit: "EA", weightKg: 0.8, volumeM3: 0.004, brand: "STYLE", tempClass: "AMBIENT" },
  { sku: "APP-SHO-104", itemName: "Urban Canvas Sneakers (42)", unit: "PAIR", weightKg: 0.95, volumeM3: 0.006, brand: "STYLE", tempClass: "AMBIENT" },
  { sku: "APP-BAG-105", itemName: "Genuine Leather Handbag", unit: "EA", weightKg: 0.75, volumeM3: 0.008, brand: "STYLE", tempClass: "AMBIENT" },
  { sku: "APP-POL-106", itemName: "Classic Pique Polo Shirt", unit: "EA", weightKg: 0.3, volumeM3: 0.0015, brand: "STYLE", tempClass: "AMBIENT" },
  { sku: "APP-DRS-107", itemName: "Floral Summer Dress", unit: "EA", weightKg: 0.4, volumeM3: 0.002, brand: "STYLE", tempClass: "AMBIENT" },
  { sku: "APP-BEL-108", itemName: "Formal Leather Belt", unit: "EA", weightKg: 0.2, volumeM3: 0.0005, brand: "STYLE", tempClass: "AMBIENT" },
  { sku: "APP-SCM-109", itemName: "Silk Blend Scarf", unit: "EA", weightKg: 0.15, volumeM3: 0.0005, brand: "STYLE", tempClass: "AMBIENT" },

  // TECH AMBIENT
  { sku: "TEC-PHN-200", itemName: "Waypoint Pro Smartphone 128GB", unit: "EA", weightKg: 0.45, volumeM3: 0.001, brand: "TECH", tempClass: "AMBIENT" },
  { sku: "TEC-LAP-201", itemName: "Ultrabook Laptop 15.6in", unit: "EA", weightKg: 2.2, volumeM3: 0.008, brand: "TECH", tempClass: "AMBIENT" },
  { sku: "TEC-HDP-202", itemName: "Noise Cancelling Headphones", unit: "EA", weightKg: 0.55, volumeM3: 0.003, brand: "TECH", tempClass: "AMBIENT" },
  { sku: "TEC-CHG-203", itemName: "GaN 65W Fast Charger", unit: "EA", weightKg: 0.18, volumeM3: 0.0004, brand: "TECH", tempClass: "AMBIENT" },
  { sku: "TEC-TV-204", itemName: "Smart 4K LED TV 43in", unit: "EA", weightKg: 9.8, volumeM3: 0.12, brand: "TECH", tempClass: "AMBIENT" },
  { sku: "TEC-PWR-205", itemName: "Heavy Duty Power Bank 20000mAh", unit: "EA", weightKg: 0.48, volumeM3: 0.0008, brand: "TECH", tempClass: "AMBIENT" },
  { sku: "TEC-WAT-206", itemName: "Fitness Smartwatch Gen 4", unit: "EA", weightKg: 0.25, volumeM3: 0.0006, brand: "TECH", tempClass: "AMBIENT" },
  { sku: "TEC-SPK-207", itemName: "Portable Bluetooth Speaker", unit: "EA", weightKg: 0.85, volumeM3: 0.0025, brand: "TECH", tempClass: "AMBIENT" },
  { sku: "TEC-TAB-208", itemName: "Slim Tablet 10.5in 64GB", unit: "EA", weightKg: 0.62, volumeM3: 0.0018, brand: "TECH", tempClass: "AMBIENT" },
  { sku: "TEC-MOU-209", itemName: "Ergonomic Wireless Mouse", unit: "EA", weightKg: 0.16, volumeM3: 0.0005, brand: "TECH", tempClass: "AMBIENT" },
];

const DEFERRAL_REASONS = [
  { reason: "CAPACITY_UNAVAILABLE", note: "Vehicle maximum allowable payload reached. Order deferred to next delivery wave." },
  { reason: "DELIVERY_WINDOW_CONFLICT", note: "Outlet delivery window conflict with prior high-priority refrigerated drops." },
  { reason: "VEHICLE_RESTRICTION", note: "Outlet requires dedicated Van access; all depot vans are committed on regional circuits." },
  { reason: "FUEL_LIMITATION", note: "Vehicle weekly fuel allocation quota reached limit for this corridor." },
  { reason: "LOADING_SHORTFALL", note: "Loading dock staging buffer shortfall during dispatch wave." },
];

function buildLineItems(brand, tempClass, count) {
  let pool = CATALOG_ITEMS.filter((item) => item.brand === brand && item.tempClass === tempClass);
  if (!pool.length) pool = CATALOG_ITEMS.filter((item) => item.brand === brand);
  if (!pool.length) pool = CATALOG_ITEMS;

  const chosen = pool.slice(0, count);
  let totalWeight = 0;
  let totalVolume = 0;
  let totalUnits = 0;

  const lines = chosen.map((item, idx) => {
    const qty = (idx + 1) * 25;
    const lineWeight = Math.round(item.weightKg * qty * 100) / 100;
    const lineVolume = Math.round(item.volumeM3 * qty * 1000) / 1000;
    totalWeight += lineWeight;
    totalVolume += lineVolume;
    totalUnits += qty;

    return {
      lineNo: idx + 1,
      itemName: item.itemName,
      sku: item.sku,
      unit: item.unit,
      quantity: qty,
      weightKg: lineWeight,
      volumeM3: lineVolume,
      notes: `Packaged lot #${idx + 1}`,
    };
  });

  return { lines, totalWeight, totalVolume, totalUnits };
}

async function seed() {
  const db = getPrisma();
  console.log("Starting enhanced demo dataset generation...");

  // 1. Get Depots
  const depots = await db.depot.findMany({ orderBy: { code: "asc" } });
  if (!depots.length) throw new Error("No depots found in database.");
  const plyDepot = depots.find((d) => d.code === "PLY") || depots[0];
  const kdyDepot = depots.find((d) => d.code === "KDY") || depots[1] || plyDepot;
  console.log(`Using depots: PLY (${plyDepot.id}), KDY (${kdyDepot.id})`);

  // 1.5 Seed Calendar Days for order date foreign keys
  console.log("Seeding calendar days...");
  const startDate = new Date("2026-09-01T00:00:00.000Z");
  const endDate = new Date("2026-12-31T00:00:00.000Z");
  const days = [];
  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateObj = new Date(d);
    const dayOfWeek = dateObj.getUTCDay();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    const dateStr = dateObj.toISOString().slice(0, 10);
    const isOperatingDay = dateStr === "2026-10-04" ? true : !isSunday;
    days.push({
      date: dateObj,
      isOperatingDay,
      isWeekend: isSaturday || isSunday,
      isPayday: dateObj.getUTCDate() === 25,
      isMonsoon: false,
    });
  }
  for (const day of days) {
    await db.calendarDay.upsert({
      where: { date: day.date },
      update: { isOperatingDay: day.isOperatingDay },
      create: day,
    });
  }
  console.log(`Calendar ready: ${days.length} days (2026-09-01 to 2026-12-31).`);

  // 2. Ensure User Ezza Davis (dis_003) and core accounts exist
  const defaultPassword = process.env.DISPATCHER_PASSWORD || "Passw0rd123#";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  let ezza = await db.user.findFirst({
    where: {
      OR: [
        { email: "ezzadavis398@gmail.com" },
        { employeeNumber: "dis_003" },
      ],
    },
  });

  if (!ezza) {
    ezza = await db.user.create({
      data: {
        email: "ezzadavis398@gmail.com",
        password: passwordHash,
        fullName: "Ezza Davis",
        role: "DISPATCHER",
        employeeNumber: "dis_003",
        phone: "+94778995366",
        isActive: true,
        isApproved: true,
        approvedAt: new Date(),
      },
    });
    console.log("Created Dispatcher account: ezzadavis398@gmail.com / Passw0rd123#");
  } else {
    await db.user.update({
      where: { id: ezza.id },
      data: { isActive: true, isApproved: true },
    });
  }

  for (const d of [plyDepot, kdyDepot]) {
    await db.userDepot.upsert({
      where: { userId_depotId: { userId: ezza.id, depotId: d.id } },
      update: {},
      create: { userId: ezza.id, depotId: d.id },
    });
  }
  console.log(`Dispatcher Ezza Davis assigned to depots PLY & KDY.`);

  // Ensure Admin User exists
  const adminEmail = process.env.ADMIN_EMAIL || "admin@waypoint.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "WpiV05CF1Y-X6U7";
  const adminHash = await bcrypt.hash(adminPassword, 10);
  await db.user.upsert({
    where: { email: adminEmail },
    update: { isActive: true, isApproved: true },
    create: {
      email: adminEmail,
      password: adminHash,
      fullName: process.env.ADMIN_FULL_NAME || "System Administrator",
      role: "ADMIN",
      employeeNumber: process.env.ADMIN_EMPLOYEE_NUMBER || "adm_001",
      phone: "+94770000001",
      isActive: true,
      isApproved: true,
      approvedAt: new Date(),
    },
  });

  // Ensure Store Manager exists for OUT001
  const out001Outlet = await db.outlet.findFirst({ where: { code: "OUT001" } });
  if (out001Outlet) {
    const smEmail = "store.manager@waypointcargo.lk";
    const smHash = await bcrypt.hash("StoreManager@123#", 10);
    await db.user.upsert({
      where: { email: smEmail },
      update: { outletId: out001Outlet.id, isActive: true, isApproved: true },
      create: {
        email: smEmail,
        password: smHash,
        fullName: "Colombo Store Manager",
        role: "STORE_MANAGER",
        employeeNumber: "sm_001",
        phone: "+94770000002",
        outletId: out001Outlet.id,
        isActive: true,
        isApproved: true,
        approvedAt: new Date(),
      },
    });
  }

  // 3. Upsert Stock Catalog (10,000 units on hand for each SKU)
  console.log("Populating stock catalog across depots...");
  for (const depot of depots) {
    for (const item of CATALOG_ITEMS) {
      await db.stock.upsert({
        where: { depotId_sku: { depotId: depot.id, sku: item.sku } },
        update: {
          itemName: item.itemName,
          unit: item.unit,
          quantityOnHand: 10000,
          reservedQty: 0,
        },
        create: {
          depotId: depot.id,
          sku: item.sku,
          itemName: item.itemName,
          unit: item.unit,
          quantityOnHand: 10000,
          reservedQty: 0,
        },
      });
    }
  }
  console.log(`Stock catalog populated with ${CATALOG_ITEMS.length} SKUs per depot.`);

  // 4. Ensure 10 Active Vehicles with Drivers
  const drivers = await db.user.findMany({
    where: { role: "DRIVER", isActive: true },
    orderBy: { employeeNumber: "asc" },
    take: 10,
  });

  const vehicles = await db.vehicle.findMany({ orderBy: { code: "asc" }, take: 10 });
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    const drv = drivers[i % drivers.length];
    await db.vehicle.update({
      where: { id: v.id },
      data: {
        status: "AVAILABLE",
        isActive: true,
        homeDepotId: plyDepot.id,
        defaultDriverId: drv ? drv.id : null,
      },
    });
  }
  console.log("10 vehicles verified AVAILABLE and stationed at Peliyagoda depot.");

  // 5. Identify Key Outlets
  const out060 = await db.outlet.findFirst({
    where: { code: "OUT060" },
    include: { depot: true },
  });

  const out001 = await db.outlet.findFirst({
    where: { code: "OUT001" },
    include: { depot: true },
  });

  const otherOutlets = await db.outlet.findMany({
    where: {
      isActive: true,
      code: { notIn: ["OUT001", "OUT060"] },
      depotId: plyDepot.id,
    },
    take: 15,
  });

  if (!out060) console.warn("Warning: OUT060 not found!");
  if (!out001) console.warn("Warning: OUT001 not found!");

  const primaryAuthor = (await db.user.findFirst({ where: { role: "STORE_MANAGER", isActive: true } }))
    || (await db.user.findFirst({ where: { role: "ADMIN" } }));

  const now = new Date();
  const deliveryDate = new Date("2026-10-05T00:00:00.000Z");
  const nextDay = new Date("2026-10-06T00:00:00.000Z");

  // Helper to upsert order
  async function createOrUpdateOrder(ref, outlet, status, tempClass, itemCount, opts = {}) {
    const brand = outlet.brand;
    const { lines, totalWeight, totalVolume, totalUnits } = buildLineItems(brand, tempClass, itemCount);

    // Delete existing lines if updating
    const existing = await db.order.findUnique({ where: { reference: ref }, include: { items: true } });
    if (existing) {
      await db.orderItem.deleteMany({ where: { orderId: existing.id } });
    }

    const isConfirmed = ["CONFIRMED", "PLANNED", "LOADED", "IN_TRANSIT", "DELIVERED"].includes(status);
    const isSubmitted = ["PENDING_REVIEW", "CONFIRMED", "DEFERRED", "PLANNED", "LOADED", "IN_TRANSIT", "DELIVERED"].includes(status);

    const order = await db.order.upsert({
      where: { reference: ref },
      update: {
        status,
        tempClass,
        totalWeightKg: totalWeight,
        totalVolumeM3: totalVolume,
        itemCount: totalUnits,
        confirmedAt: isConfirmed ? now : null,
        submittedAt: isSubmitted ? now : null,
        deliveryDate,
        requestedDeliveryDate: deliveryDate,
        windowStartMin: outlet.windowStartMin ?? 480,
        windowEndMin: outlet.windowEndMin ?? 960,
        vanOnly: outlet.vanOnly ?? false,
        isMall: outlet.isMall ?? false,
        unloadingType: outlet.unloadingType ?? "CURB",
        items: { create: lines },
      },
      create: {
        reference: ref,
        outletId: outlet.id,
        depotId: outlet.depotId,
        brand: outlet.brand,
        tempClass,
        requestedDeliveryDate: deliveryDate,
        deliveryDate,
        status,
        totalWeightKg: totalWeight,
        totalVolumeM3: totalVolume,
        itemCount: totalUnits,
        windowStartMin: outlet.windowStartMin ?? 480,
        windowEndMin: outlet.windowEndMin ?? 960,
        vanOnly: outlet.vanOnly ?? false,
        isMall: outlet.isMall ?? false,
        unloadingType: outlet.unloadingType ?? "CURB",
        isFragile: opts.isFragile ?? false,
        isHighValue: opts.isHighValue ?? false,
        specialInstructions: opts.notes ?? `Order for ${outlet.code}`,
        createdById: primaryAuthor.id,
        submittedAt: isSubmitted ? now : null,
        confirmedAt: isConfirmed ? now : null,
        items: { create: lines },
        events: {
          create: [
            { fromStatus: null, toStatus: "DRAFT", actorId: primaryAuthor.id, reason: "CREATED" },
            ...(isSubmitted ? [{ fromStatus: "DRAFT", toStatus: "PENDING_REVIEW", actorId: primaryAuthor.id, reason: "SUBMITTED" }] : []),
            ...(isConfirmed ? [{ fromStatus: "PENDING_REVIEW", toStatus: "CONFIRMED", actorId: primaryAuthor.id, reason: "CONFIRMED" }] : []),
            ...(status === "DEFERRED" ? [{ fromStatus: "CONFIRMED", toStatus: "DEFERRED", actorId: primaryAuthor.id, reason: opts.deferralReason || "CAPACITY_UNAVAILABLE" }] : []),
            ...(status === "PLANNED" ? [{ fromStatus: "CONFIRMED", toStatus: "PLANNED", actorId: primaryAuthor.id, reason: "ALLOCATED" }] : []),
          ],
        },
      },
    });

    if (status === "DEFERRED") {
      const scenario = DEFERRAL_REASONS.find((r) => r.reason === opts.deferralReason) || DEFERRAL_REASONS[0];
      await db.deferral.deleteMany({ where: { orderId: order.id } });
      await db.deferral.create({
        data: {
          orderId: order.id,
          outletId: outlet.id,
          fromDate: deliveryDate,
          toDate: nextDay,
          status: "DEFERRED",
          reason: scenario.reason,
          note: scenario.note,
          consecutiveCount: 1,
          detectedConflicts: [{ check: scenario.reason, description: scenario.note }],
          decidedById: primaryAuthor.id,
          decidedAt: now,
        },
      });
    }

    return order;
  }

  // 6. Seed Specific Orders for OUT060 (Ezza Davis's Outlet - Matara Fresh)
  if (out060) {
    console.log("Seeding comprehensive order set for OUT060 (Matara Fresh)...");
    // 5 Confirmed orders for Plan & Allocate
    await createOrUpdateOrder("ORD-60001", out060, "CONFIRMED", "AMBIENT", 3, { notes: "Morning delivery - Fresh fruits and bakery" });
    await createOrUpdateOrder("ORD-60002", out060, "CONFIRMED", "CHILLED", 4, { notes: "Fresh milk, cheese, yoghurt supply" });
    await createOrUpdateOrder("ORD-60003", out060, "CONFIRMED", "CHILLED", 2, { isFragile: true, notes: "Yellowfin tuna & whole chicken" });
    await createOrUpdateOrder("ORD-60004", out060, "CONFIRMED", "FROZEN", 3, { notes: "Frozen sausages, peas, and ice cream" });
    await createOrUpdateOrder("ORD-60005", out060, "CONFIRMED", "AMBIENT", 2, { notes: "Bulk samba rice and tea boxes" });

    // 2 Planned orders
    await createOrUpdateOrder("ORD-60006", out060, "PLANNED", "CHILLED", 3, { notes: "Allocated morning run" });
    await createOrUpdateOrder("ORD-60007", out060, "PLANNED", "AMBIENT", 3, { notes: "Allocated afternoon run" });

    // 2 Deferred orders
    await createOrUpdateOrder("ORD-60008", out060, "DEFERRED", "AMBIENT", 3, { deferralReason: "CAPACITY_UNAVAILABLE" });
    await createOrUpdateOrder("ORD-60009", out060, "DEFERRED", "CHILLED", 3, { deferralReason: "DELIVERY_WINDOW_CONFLICT" });

    // 3 Pending Review orders
    await createOrUpdateOrder("ORD-60010", out060, "PENDING_REVIEW", "AMBIENT", 2, { notes: "Awaiting store manager signoff" });
    await createOrUpdateOrder("ORD-60011", out060, "PENDING_REVIEW", "CHILLED", 2, { notes: "Awaiting temperature verification" });
    await createOrUpdateOrder("ORD-60012", out060, "PENDING_REVIEW", "FROZEN", 2, { notes: "Awaiting stock check" });
  }

  // 7. Seed Specific Orders for OUT001 (Colombo Fresh - Store Manager Chamindu)
  if (out001) {
    console.log("Seeding comprehensive order set for OUT001 (Colombo Fresh)...");
    // 5 Confirmed orders
    await createOrUpdateOrder("ORD-10001", out001, "CONFIRMED", "AMBIENT", 3);
    await createOrUpdateOrder("ORD-10002", out001, "CONFIRMED", "CHILLED", 4);
    await createOrUpdateOrder("ORD-10003", out001, "CONFIRMED", "CHILLED", 2, { isFragile: true });
    await createOrUpdateOrder("ORD-10004", out001, "CONFIRMED", "FROZEN", 3);
    await createOrUpdateOrder("ORD-10005", out001, "CONFIRMED", "AMBIENT", 2);

    // 4 Pending Review orders (for Store Manager Review modal)
    await createOrUpdateOrder("ORD-10006", out001, "PENDING_REVIEW", "AMBIENT", 3, { notes: "Ready for scan and confirm" });
    await createOrUpdateOrder("ORD-10007", out001, "PENDING_REVIEW", "CHILLED", 3, { notes: "Ready for scan and confirm" });
    await createOrUpdateOrder("ORD-10008", out001, "PENDING_REVIEW", "FROZEN", 2, { notes: "Ready for scan and confirm" });
    await createOrUpdateOrder("ORD-10009", out001, "PENDING_REVIEW", "AMBIENT", 2, { notes: "Ready for scan and confirm" });

    // 3 Draft orders
    await createOrUpdateOrder("ORD-10010", out001, "DRAFT", "AMBIENT", 2, { notes: "Draft replenishment order" });
    await createOrUpdateOrder("ORD-10011", out001, "DRAFT", "CHILLED", 2, { notes: "Draft dairy order" });
    await createOrUpdateOrder("ORD-10012", out001, "DRAFT", "FROZEN", 2, { notes: "Draft frozen items" });

    // 3 Deferred orders
    await createOrUpdateOrder("ORD-10013", out001, "DEFERRED", "AMBIENT", 3, { deferralReason: "VEHICLE_RESTRICTION" });
    await createOrUpdateOrder("ORD-10014", out001, "DEFERRED", "CHILLED", 3, { deferralReason: "FUEL_LIMITATION" });
    await createOrUpdateOrder("ORD-10015", out001, "DEFERRED", "FROZEN", 2, { deferralReason: "LOADING_SHORTFALL" });

    // 3 Planned orders
    await createOrUpdateOrder("ORD-10016", out001, "PLANNED", "AMBIENT", 3);
    await createOrUpdateOrder("ORD-10017", out001, "PLANNED", "CHILLED", 3);
    await createOrUpdateOrder("ORD-10018", out001, "PLANNED", "FROZEN", 2);

    // 2 In Transit orders
    await createOrUpdateOrder("ORD-10019", out001, "IN_TRANSIT", "CHILLED", 3);
    await createOrUpdateOrder("ORD-10020", out001, "IN_TRANSIT", "AMBIENT", 3);

    // 2 Delivered orders
    await createOrUpdateOrder("ORD-10021", out001, "DELIVERED", "AMBIENT", 3);
    await createOrUpdateOrder("ORD-10022", out001, "DELIVERED", "CHILLED", 3);
  }

  // 8. Seed Additional Orders Across Other Outlets in Peliyagoda
  console.log("Seeding additional orders across other Peliyagoda outlets...");
  for (let i = 0; i < otherOutlets.length; i++) {
    const o = otherOutlets[i];
    const ref = `ORD-REG-${(50000 + i + 1)}`;
    const temp = i % 3 === 0 ? "CHILLED" : i % 3 === 1 ? "FROZEN" : "AMBIENT";
    await createOrUpdateOrder(ref, o, "CONFIRMED", temp, 3, { notes: `Regional replenishment for ${o.code}` });
  }

  // 9. Summary Counts
  const [totalOrders, confirmedCount, deferredCount, plannedCount, pendingCount, draftCount, inTransitCount, deliveredCount] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { status: "CONFIRMED" } }),
    db.order.count({ where: { status: "DEFERRED" } }),
    db.order.count({ where: { status: "PLANNED" } }),
    db.order.count({ where: { status: "PENDING_REVIEW" } }),
    db.order.count({ where: { status: "DRAFT" } }),
    db.order.count({ where: { status: "IN_TRANSIT" } }),
    db.order.count({ where: { status: "DELIVERED" } }),
  ]);

  const out060Count = out060 ? await db.order.count({ where: { outletId: out060.id } }) : 0;
  const out001Count = out001 ? await db.order.count({ where: { outletId: out001.id } }) : 0;

  console.log("\n================ ENHANCED DEMO DATASET GENERATED ================");
  console.log(`Total Orders in DB:   ${totalOrders}`);
  console.log(` - Confirmed:         ${confirmedCount}`);
  console.log(` - Pending Review:    ${pendingCount}`);
  console.log(` - Drafts:            ${draftCount}`);
  console.log(` - Deferred:          ${deferredCount}`);
  console.log(` - Planned:           ${plannedCount}`);
  console.log(` - In Transit:        ${inTransitCount}`);
  console.log(` - Delivered:         ${deliveredCount}`);
  console.log(`Orders for OUT060 (Ezza Davis): ${out060Count}`);
  console.log(`Orders for OUT001 (Store Mgr):  ${out001Count}`);
  console.log("=================================================================\n");
}

seed()
  .catch((err) => {
    console.error("Error generating demo dataset:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
