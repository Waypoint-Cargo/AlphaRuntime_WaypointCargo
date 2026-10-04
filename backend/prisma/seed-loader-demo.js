// Two example loading scenarios for trying the loader app (Home, Tasks, Start Loading, shortfall, Loading Completed).
// Run with: npm run db:seed:loader-demo
//   (no flag)          create the scenarios for today (Colombo), or put them back to their starting state
//   -- --date=YYYY-MM-DD   use another delivery day
//   -- --remove        take the scenarios out again
//   -- --resolve       play the dispatcher: resolve the shortfall reports of the demo trips and release their hold
//
// Only adds rows: new ORD-DEMO-* orders, R-DEMO-* trips on existing PLY vehicles/outlets, and a published plan for the day
// when there is none. Nothing that already exists is changed, except that loaders with no depot get PLY (so a second
// loader can try the "task already taken" case). Everything runs in one transaction.
import { getPrisma, disconnectDatabase } from "../src/config/database.js";

const args = process.argv.slice(2);
const REMOVE = args.includes("--remove");
const RESOLVE = args.includes("--resolve");
const dateArg = args.find((a) => a.startsWith("--date="))?.slice("--date=".length);

const DEPOT_CODE = "PLY";
const ORDER_PREFIX = "ORD-DEMO-";

// Scenario 1 is a clean run (claim, pause/resume, complete); scenario 2 is for trouble (taken by another loader, shortfall).
const SCENARIOS = [
    {
        tripCode: "R-DEMO-1",
        vehicleCode: "VEH001", // refrigerated truck
        departure: "06:15",
        stops: [
            {
                outletCode: "OUT004", // Fresh
                arrival: "07:05",
                orders: [
                    { ref: "ORD-DEMO-01", tempClass: "CHILLED", lines: [["Whole Milk 1L", 24], ["Yogurt Strawberry 500g", 12], ["Cheddar Cheese 200g", 8]] },
                    { ref: "ORD-DEMO-02", tempClass: "AMBIENT", lines: [["Brown Bread", 20], ["Large Eggs (12)", 10]] },
                ],
            },
            {
                outletCode: "OUT005", // Fresh
                arrival: "07:40",
                orders: [{ ref: "ORD-DEMO-03", tempClass: "AMBIENT", lines: [["Fresh Bananas", 30], ["Apples Red 1kg", 18]] }],
            },
        ],
    },
    {
        tripCode: "R-DEMO-2",
        vehicleCode: "VEH008", // dry box truck
        departure: "08:40",
        stops: [
            {
                outletCode: "OUT019", // Style
                arrival: "10:05",
                orders: [{ ref: "ORD-DEMO-04", tempClass: "AMBIENT", lines: [["Cotton Shirt", 40], ["Denim Jeans", 24], ["Canvas Sneakers", 16]] }],
            },
            {
                outletCode: "OUT023", // Tech
                arrival: "11:00",
                orders: [{ ref: "ORD-DEMO-05", tempClass: "AMBIENT", lines: [["LED TV 43in", 6], ["Smartphone", 12], ["Wireless Headphones", 10]] }],
            },
        ],
    },
];

const colomboToday = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const day = dateArg ?? colomboToday();
if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(new Date(`${day}T00:00:00Z`).getTime())) {
    throw new Error(`Invalid --date "${day}" (use YYYY-MM-DD)`);
}
const date = new Date(`${day}T00:00:00.000Z`);

// "HH:MM" Colombo time on the delivery day -> the instant (Colombo is UTC+05:30, no daylight saving)
const atColombo = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    const [y, mo, d] = day.split("-").map(Number);
    return new Date(Date.UTC(y, mo - 1, d, h, m) - 330 * 60_000);
};

const hostOf = () => {
    try {
        return new URL(process.env.DATABASE_URL).host;
    } catch {
        return "(unknown)";
    }
};

const run = async () => {
    const db = getPrisma();
    console.log(`Database host: ${hostOf()}`);
    console.log(`Delivery day:  ${day}   ${REMOVE ? "(removing the demo scenarios)" : RESOLVE ? "(resolving the demo reports)" : "(creating or resetting the demo scenarios)"}`);

    const depot = await db.depot.findUnique({ where: { code: DEPOT_CODE } });
    if (!depot) throw new Error(`Depot ${DEPOT_CODE} not found. Run npm run db:seed:outlets first.`);

    const demoTrips = await db.trip.findMany({ where: { code: { in: SCENARIOS.map((s) => s.tripCode) } }, include: { plan: true } });

    await db.$transaction(
        async (tx) => {
            if (RESOLVE) {
                // What the dispatcher will do once that screen exists: resolve the report (it moves to the loader's
                // Resolved tab) and release the hold so the loader can carry on (ON_HOLD -> PAUSED).
                const dispatcher = await tx.user.findFirst({ where: { role: "DISPATCHER", isApproved: true }, orderBy: { createdAt: "asc" } });
                if (!dispatcher) throw new Error("Needs an approved DISPATCHER user to resolve the reports.");
                const resolved = await tx.issue.updateMany({
                    where: { tripId: { in: demoTrips.map((t) => t.id) }, source: "LOADER", status: { in: ["OPEN", "INVESTIGATING"] } },
                    data: { status: "RESOLVED", resolvedAt: new Date(), resolvedById: dispatcher.id, resolutionNote: "Replacement stock sent from the warehouse (demo)." },
                });
                const released = await tx.loadingSession.updateMany({
                    where: { tripId: { in: demoTrips.map((t) => t.id) }, status: "ON_HOLD" },
                    data: { status: "PAUSED" },
                });
                console.log(`Resolved ${resolved.count} report(s); released ${released.count} hold(s).`);
                return;
            }

            // ---- take what exists out of the way: loading progress and issues of the demo trips ----------------------
            const tripIds = demoTrips.map((t) => t.id);
            const orderIds = (await tx.order.findMany({ where: { reference: { startsWith: ORDER_PREFIX } }, select: { id: true } })).map((o) => o.id);

            if (tripIds.length > 0 || orderIds.length > 0) {
                await tx.issue.deleteMany({ where: { OR: [{ tripId: { in: tripIds } }, { orderId: { in: orderIds } }] } });
                await tx.loadingSession.deleteMany({ where: { tripId: { in: tripIds } } }); // its item checks go with it
            }

            if (REMOVE) {
                await tx.allocation.deleteMany({ where: { orderId: { in: orderIds } } });
                await tx.trip.deleteMany({ where: { id: { in: tripIds } } }); // stops go with them
                // An order that already has history (events are append-only) cannot be deleted: it is cancelled instead.
                let deleted = 0;
                let cancelled = 0;
                for (const id of orderIds) {
                    const events = await tx.orderEvent.count({ where: { orderId: id } });
                    if (events === 0) {
                        await tx.order.delete({ where: { id } });
                        deleted += 1;
                    } else {
                        await tx.order.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
                        cancelled += 1;
                    }
                }
                // a plan this script published (no publisher recorded) and that is now empty
                const plans = await tx.dispatchPlan.deleteMany({
                    where: { depotId: depot.id, deliveryDate: date, status: "PUBLISHED", publishedById: null, trips: { none: {} } },
                });
                console.log(`Removed ${tripIds.length} trip(s); ${deleted} order(s) deleted, ${cancelled} cancelled (they had history); ${plans.count} empty plan(s) removed.`);
                return;
            }

            if (tripIds.length > 0) {
                // already there: put the trips and their orders back to the starting state
                await tx.trip.updateMany({ where: { id: { in: tripIds } }, data: { status: "PLANNED", actualDeparture: null } });
                await tx.order.updateMany({ where: { id: { in: orderIds } }, data: { status: "PLANNED" } });
                console.log(`Scenarios already exist: reset ${tripIds.length} trip(s) to the starting state.`);
                const elsewhere = demoTrips.filter((t) => t.deliveryDate.getTime() !== date.getTime());
                if (elsewhere.length > 0) {
                    console.log(`Note: they are planned for ${elsewhere[0].deliveryDate.toISOString().slice(0, 10)}, not ${day}. Run with --remove first to move them.`);
                }
                return;
            }

            // ---- create ------------------------------------------------------------------------------------------------
            const creator = await tx.user.findFirst({ where: { role: "STORE_MANAGER", isApproved: true }, orderBy: { createdAt: "asc" } });
            const dispatcher = await tx.user.findFirst({ where: { role: "DISPATCHER", isApproved: true }, orderBy: { createdAt: "asc" } });
            if (!creator || !dispatcher) throw new Error("Needs one approved STORE_MANAGER and one approved DISPATCHER user to attribute the orders to.");

            await tx.calendarDay.upsert({ where: { date }, update: {}, create: { date, isOperatingDay: true } });

            // a published plan for the day (reuse one when it exists; a plan still being drafted is left as it is)
            let plan = await tx.dispatchPlan.findUnique({ where: { depotId_deliveryDate: { depotId: depot.id, deliveryDate: date } } });
            if (plan && !["CLOSED", "DRAFT", "PUBLISHED", "IN_EXECUTION"].includes(plan.status)) {
                throw new Error(`The ${DEPOT_CODE} plan for ${day} is ${plan.status}, so the loader does not see its trips. Close the queue or publish it first.`);
            }
            if (!plan) {
                plan = await tx.dispatchPlan.create({ data: { depotId: depot.id, deliveryDate: date, status: "PUBLISHED", publishedAt: new Date() } });
            }

            for (const scenario of SCENARIOS) {
                const vehicle = await tx.vehicle.findUnique({ where: { code: scenario.vehicleCode } });
                if (!vehicle) throw new Error(`Vehicle ${scenario.vehicleCode} not found.`);
                const taken = await tx.trip.findFirst({ where: { vehicleId: vehicle.id, deliveryDate: date, tripNumber: 1 } });
                if (taken) throw new Error(`Vehicle ${scenario.vehicleCode} already has trip ${taken.code} on ${day}.`);

                const trip = await tx.trip.create({
                    data: {
                        code: scenario.tripCode, planId: plan.id, vehicleId: vehicle.id, deliveryDate: date, tripNumber: 1,
                        status: "PLANNED", plannedDeparture: atColombo(scenario.departure),
                    },
                });

                let tripKg = 0;
                let tripM3 = 0;
                for (const [index, stopDef] of scenario.stops.entries()) {
                    const outlet = await tx.outlet.findUnique({ where: { code: stopDef.outletCode } });
                    if (!outlet) throw new Error(`Outlet ${stopDef.outletCode} not found.`);
                    const stop = await tx.stop.create({
                        data: { tripId: trip.id, outletId: outlet.id, sequence: index + 1, plannedArrival: atColombo(stopDef.arrival) },
                    });

                    for (const orderDef of stopDef.orders) {
                        const units = orderDef.lines.reduce((sum, line) => sum + line[1], 0);
                        const kg = units * 2;
                        const m3 = Math.round(units * 0.01 * 1000) / 1000;
                        tripKg += kg;
                        tripM3 += m3;

                        const order = await tx.order.create({
                            data: {
                                reference: orderDef.ref, outletId: outlet.id, depotId: depot.id, brand: outlet.brand, tempClass: orderDef.tempClass,
                                requestedDeliveryDate: date, deliveryDate: date, status: "CONFIRMED", itemCount: units,
                                totalWeightKg: kg, totalVolumeM3: m3,
                                windowStartMin: outlet.windowStartMin, windowEndMin: outlet.windowEndMin,
                                vanOnly: outlet.vanOnly, isMall: outlet.isMall, unloadingType: outlet.unloadingType,
                                submittedAt: new Date(), confirmedAt: new Date(), createdById: creator.id,
                                items: {
                                    create: orderDef.lines.map(([itemName, quantity], i) => ({
                                        lineNo: i + 1, itemName, sku: `${orderDef.ref}-${i + 1}`, unit: "EA", quantity,
                                        weightKg: quantity * 2, volumeM3: Math.round(quantity * 0.01 * 1000) / 1000,
                                    })),
                                },
                            },
                        });
                        // allocation rules check the order is CONFIRMED, then it becomes PLANNED like a real allocation
                        await tx.allocation.create({ data: { orderId: order.id, stopId: stop.id, allocatedById: dispatcher.id } });
                        await tx.order.update({ where: { id: order.id }, data: { status: "PLANNED" } });
                    }
                }
                await tx.trip.update({ where: { id: trip.id }, data: { plannedWeightKg: tripKg, plannedVolumeM3: tripM3 } });
                console.log(`Created ${scenario.tripCode}: ${scenario.vehicleCode}, ${scenario.stops.length} stops, departs ${scenario.departure}.`);
            }

            // loaders that can see no depot get PLY, so two loaders can be tried against each other
            const loaders = await tx.user.findMany({
                where: { role: "LOADER", isApproved: true, isActive: true, outletId: null, depots: { none: {} } },
                select: { id: true, fullName: true },
            });
            for (const loader of loaders) {
                await tx.userDepot.create({ data: { userId: loader.id, depotId: depot.id } });
                console.log(`Gave loader "${loader.fullName}" access to ${DEPOT_CODE} (it had no depot).`);
            }
        },
        { timeout: 60_000, maxWait: 15_000 },
    );
};

run()
    .then(() => console.log("Done."))
    .catch((error) => {
        console.error("Failed, nothing was changed:", error.message ?? error);
        process.exitCode = 1;
    })
    .finally(disconnectDatabase);
