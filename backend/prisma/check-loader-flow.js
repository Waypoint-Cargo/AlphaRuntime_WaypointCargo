// READ-ONLY check of the dispatcher -> loader flow. Changes nothing: it only reads.
// Run with: npm run db:check:loader
//   -- --date=YYYY-MM-DD   look at one delivery day only (default: today and later)
//
// 1. every plan and trip, and whether loaders can see it - with the reason when they cannot
// 2. every loader account: its depots, and what GET /api/loading/tasks?tab=pending would return for it right now
import { getPrisma, disconnectDatabase } from "../src/config/database.js";
import { listTasksService } from "../src/modules/loading/loading.service.js";
import {
    isUnstartedSession,
    OPEN_SESSION_STATUSES,
    PENDING_TRIP_STATUSES,
    VISIBLE_PLAN_STATUSES,
} from "../src/modules/loading/loading.rules.js";

const dateArg = process.argv.slice(2).find((a) => a.startsWith("--date="))?.slice("--date=".length);
const colomboToday = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const today = colomboToday();
const dayOf = (value) => value.toISOString().slice(0, 10);

// Why a trip is (not) in the loader pool - the same conditions the loader query applies.
const diagnose = (trip) => {
    const session = trip.loadingSession;
    if (!VISIBLE_PLAN_STATUSES.includes(trip.plan.status)) {
        return { visible: false, reason: `plan is ${trip.plan.status}: loaders see trips once the queue is closed and orders are allocated (CLOSED, DRAFT or PUBLISHED plan)` };
    }
    if (trip.status === "CANCELLED") return { visible: false, reason: "trip is CANCELLED" };
    if (trip.stops.every((stop) => stop.allocations.length === 0)) return { visible: false, reason: "no order is allocated to this trip" };
    if (session?.status === "COMPLETED") return { visible: true, reason: "loading completed (Completed tab)" };
    if (!PENDING_TRIP_STATUSES.includes(trip.status)) return { visible: false, reason: `trip is ${trip.status}, it has already left` };
    if (dayOf(trip.deliveryDate) < today && !dateArg) return { visible: false, reason: `delivery day ${dayOf(trip.deliveryDate)} is in the past` };
    if (session && !isUnstartedSession(session) && !OPEN_SESSION_STATUSES.includes(session.status)) {
        return { visible: false, reason: `loading session is ${session.status}` };
    }
    const state = !session || isUnstartedSession(session) ? "PENDING" : session.status;
    return { visible: true, reason: `Pending tab, state ${state}` };
};

const run = async () => {
    const db = getPrisma();
    try {
        console.log(`Colombo today: ${today}   (read-only: nothing is written)\n`);

        const trips = await db.trip.findMany({
            where: { deliveryDate: dateArg ? new Date(`${dateArg}T00:00:00.000Z`) : { gte: new Date(`${today}T00:00:00.000Z`) } },
            orderBy: [{ deliveryDate: "asc" }, { code: "asc" }],
            select: {
                code: true, status: true, deliveryDate: true,
                vehicle: { select: { code: true } },
                plan: { select: { status: true, depot: { select: { code: true } } } },
                loadingSession: { select: { status: true, startedAt: true, lockedById: true, completedAt: true } },
                stops: { select: { allocations: { select: { id: true } } } },
            },
        });

        console.log("TRIPS");
        if (trips.length === 0) console.log("  none for this period (the dispatcher has not allocated any order to a trip yet)");
        for (const trip of trips) {
            const { visible, reason } = diagnose(trip);
            const allocations = trip.stops.reduce((sum, stop) => sum + stop.allocations.length, 0);
            console.log(
                `  ${visible ? "VISIBLE " : "HIDDEN  "} ${trip.code.padEnd(10)} ${dayOf(trip.deliveryDate)}  ${trip.plan.depot.code}  ${trip.vehicle.code.padEnd(8)} ` +
                    `${trip.stops.length} stop(s), ${allocations} order(s)   plan ${trip.plan.status}, trip ${trip.status}\n` +
                    `             -> ${reason}`,
            );
        }

        const loaders = await db.user.findMany({
            where: { role: "LOADER" },
            orderBy: { createdAt: "asc" },
            select: { id: true, fullName: true, isApproved: true, isActive: true, depots: { select: { depot: { select: { code: true } } } }, outlet: { select: { code: true, depot: { select: { code: true } } } } },
        });

        console.log("\nLOADERS - what the app receives from GET /api/loading/tasks?tab=pending&limit=100");
        for (const loader of loaders) {
            const depots = loader.depots.map((d) => d.depot.code);
            const scope = depots.length > 0 ? depots.join(",") : loader.outlet ? `${loader.outlet.depot.code} (through outlet ${loader.outlet.code})` : "NONE";
            console.log(`  ${loader.fullName}   approved ${loader.isApproved}, active ${loader.isActive}, depots: ${scope}`);
            try {
                const { items, meta } = await listTasksService({ userId: loader.id, tab: "pending", date: dateArg, page: 1, limit: 100 });
                const list = items.map((t) => `${t.routeCode} (${t.status}${t.lock?.heldBy ? ", held by " + t.lock.heldBy.fullName : ""})`).join(", ");
                console.log(`     -> ${meta.total} task(s)${list ? ": " + list : ""}`);
            } catch (error) {
                console.log(`     -> ${error.statusCode ?? ""} ${error.details?.code ?? ""} ${error.message}`);
            }
        }
    } finally {
        await disconnectDatabase();
    }
};

run().catch((error) => {
    console.error("Check failed:", error.message ?? error);
    process.exitCode = 1;
});
