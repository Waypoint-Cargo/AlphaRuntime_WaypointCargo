import { AppError } from "../../utils/appError.js";
import { getPrisma } from "../../config/database.js";

const CUTOFF_HOUR = 16;
const COLOMBO_OFFSET_MINUTES = 5 * 60 + 30;

const dateParts = (date) => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Colombo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const [year, month, day] = formatter.format(date).split("-").map(Number);
    return { year, month, day };
};

const toDate = (date) => new Date(`${date}T00:00:00.000Z`);
const formatDate = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => {
    const result = toDate(date);
    result.setUTCDate(result.getUTCDate() + days);
    return formatDate(result);
};

const isOperatingDate = (date, actor) => {
    const configured = actor?.operatingDates;
    if (Array.isArray(configured)) return configured.includes(date);
    const weekday = toDate(date).getUTCDay();
    return weekday !== 0;
};

const previousOperatingDate = (date, actor) => {
    let candidate = addDays(date, -1);
    for (let attempt = 0; attempt < 14; attempt += 1) {
        if (isOperatingDate(candidate, actor)) return candidate;
        candidate = addDays(candidate, -1);
    }
    return null;
};

const nextOperatingDate = (date, actor) => {
    let candidate = addDays(date, 1);
    for (let attempt = 0; attempt < 14; attempt += 1) {
        if (isOperatingDate(candidate, actor)) return candidate;
        candidate = addDays(candidate, 1);
    }
    return null;
};

const colomboDateTime = (date, hour, minute = 0) => {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, hour, minute) - COLOMBO_OFFSET_MINUTES * 60_000);
};

export const getScope = async (actor = {}) => {
    const role = actor.role ?? "USER";
    if (role === "ADMIN") return { all: true, role };

    const user = actor.id && !actor.outletId && !actor.depotId
        ? await getPrisma().user.findUnique({
            where: { id: actor.id },
            select: { outletId: true, UserDepot: { select: { depotId: true } } },
        })
        : null;
    const outletId = actor.outletId ?? actor.outlet?.id ?? user?.outletId ?? null;
    const depotIds = actor.depotIds ?? user?.UserDepot?.map((assignment) => assignment.depotId) ?? [];
    const depotId = actor.depotId ?? actor.outlet?.depotId ?? depotIds[0] ?? null;
    if (role === "STORE_MANAGER" && !outletId) {
        throw new AppError("The signed-in user is not assigned to an outlet.", 403, { code: "NO_OUTLET" });
    }
    if (role === "DISPATCHER" && !depotId && !depotIds.length) {
        throw new AppError("The signed-in user is not assigned to a depot.", 403, { code: "NO_DEPOT" });
    }

    return {
        all: false,
        role,
        outletId,
        outletIds: outletId ? [outletId] : undefined,
        depotIds: depotIds.length ? depotIds : (depotId ? [depotId] : undefined),
    };
};

export const getOrderContext = async (actor = {}) => {
    const scope = await getScope(actor);
    const user = actor.id && !actor.outlet ? await getPrisma().user.findUnique({
        where: { id: actor.id },
        select: {
            outletId: true,
            Outlet: {
                select: {
                    id: true, depotId: true, brand: true, isActive: true, windowStartMin: true,
                    windowEndMin: true, vanOnly: true, isMall: true, unloadingType: true,
                },
            },
        },
    }) : null;
    const outlet = actor.outlet ?? user?.Outlet ?? {};
    if (outlet.isActive === false) throw new AppError("The outlet is inactive.", 422, { code: "OUTLET_INACTIVE" });
    const outletId = actor.outletId ?? outlet.id ?? user?.outletId ?? scope.outletId;
    const depotId = actor.depotId ?? outlet.depotId ?? scope.depotIds?.[0];
    if (!outletId) throw new AppError("An outlet is required to create an order.", 403, { code: "NO_OUTLET" });
    if (!depotId) throw new AppError("A depot is required to create an order.", 403, { code: "NO_DEPOT" });

    const vehicles = actor.vehicles ?? await getPrisma().vehicle.findMany({ where: { homeDepotId: depotId, isActive: true }, select: { id: true, type: true, isRefrigerated: true, maxWeightKg: true, maxVolumeM3: true, homeDepotId: true } });
    const todayParts = dateParts(new Date());
    const today = `${todayParts.year}-${String(todayParts.month).padStart(2, "0")}-${String(todayParts.day).padStart(2, "0")}`;
    const calendar = actor.operatingDates
        ? null
        : await getPrisma().calendarDay.findMany({
            where: { date: { gte: toDate(today), lte: toDate(addDays(today, 14)) } },
            select: { date: true, isOperatingDay: true },
        });
    return {
        scope,
        outletId,
        depotId,
        brand: actor.brand ?? outlet.brand,
        snapshot: {
            windowStartMin: actor.windowStartMin ?? outlet.windowStartMin ?? null,
            windowEndMin: actor.windowEndMin ?? outlet.windowEndMin ?? null,
            vanOnly: actor.vanOnly ?? outlet.vanOnly ?? false,
            isMall: actor.isMall ?? outlet.isMall ?? false,
            unloadingType: actor.unloadingType ?? outlet.unloadingType ?? null,
        },
        vehicles,
        operatingDates: actor.operatingDates ?? calendar?.filter((day) => day.isOperatingDay).map((day) => formatDate(day.date)) ?? [],
    };
};

export const resolveDeliveryDate = ({ requestedDate, now = new Date(), actor = {} }) => {
    const todayParts = dateParts(now);
    const today = `${todayParts.year}-${String(todayParts.month).padStart(2, "0")}-${String(todayParts.day).padStart(2, "0")}`;
    if (requestedDate < today) {
        throw new AppError("The requested delivery date is in the past.", 422, { code: "DATE_IN_PAST" });
    }

    let candidate = requestedDate;
    if (!isOperatingDate(candidate, actor)) candidate = nextOperatingDate(candidate, actor);
    for (let attempt = 0; attempt < 14; attempt += 1) {
        if (!candidate) break;
        const cutoffAt = colomboDateTime(previousOperatingDate(candidate, actor), CUTOFF_HOUR);
        if (now <= cutoffAt) {
            return { deliveryDate: candidate, cutoffAt, rolledOver: candidate !== requestedDate };
        }
        candidate = nextOperatingDate(candidate, actor);
    }

    throw new AppError("No operating delivery date could be resolved.", 422, { code: "DATE_OUTSIDE_CALENDAR" });
};

export const evaluateStockCheck = (order, stockRows = []) => {
    const bySku = new Map(stockRows.map((row) => [String(row.sku).toLowerCase(), row]));
    const byName = new Map(stockRows.map((row) => [String(row.itemName).toLowerCase(), row]));
    const demand = new Map();
    const lines = (order.items ?? []).map((item) => {
        const row = (item.sku && bySku.get(String(item.sku).toLowerCase())) || byName.get(String(item.itemName).toLowerCase()) || null;
        if (row) demand.set(row.id, (demand.get(row.id) ?? 0) + item.quantity);
        return { item, row };
    });
    const value = lines.map(({ item, row }) => {
        const available = row ? Math.max(0, row.quantityOnHand - row.reservedQty) : 0;
        const requested = row ? demand.get(row.id) : item.quantity;
        const inStock = Boolean(row);
        return { lineNo: item.lineNo, itemName: item.itemName, sku: item.sku, unit: item.unit, requested: item.quantity, available, inStock, status: inStock && available >= requested ? "PASS" : "FAIL" };
    });
    const failed = value.filter((line) => line.status === "FAIL");
    return {
        code: "STOCK_AVAILABILITY", label: "Product availability", status: failed.length ? "FAIL" : "PASS", value, limit: null,
        message: failed.length ? `${failed.length} line(s) lack sufficient stock at this depot.` : "All items are in stock at this depot.",
    };
};

export const evaluateOrderChecks = (order, context, now = new Date(), extraChecks = []) => {
    const checks = [];
    const cutoffAt = order.cutoffAt ?? resolveDeliveryDate({
        requestedDate: formatDate(order.deliveryDate),
        now,
        actor: context,
    }).cutoffAt;
    const vehicles = (context.vehicles ?? []).filter((vehicle) => vehicle.isActive !== false);
    const compatibleVehicles = vehicles.filter((vehicle) =>
        vehicle.homeDepotId === context.depotId &&
        (order.tempClass === "AMBIENT" || vehicle.isRefrigerated) &&
        (!order.vanOnly || vehicle.type === "VAN"),
    );
    const largestWeight = Math.max(0, ...compatibleVehicles.map((vehicle) => Number(vehicle.maxWeightKg ?? 0)));
    const largestVolume = Math.max(0, ...compatibleVehicles.map((vehicle) => Number(vehicle.maxVolumeM3 ?? 0)));

    checks.push({ code: "CUTOFF", status: now <= cutoffAt ? "PASS" : "WARN", label: "Order cutoff", value: cutoffAt.toISOString(), limit: CUTOFF_HOUR, message: now <= cutoffAt ? "Within cutoff." : "The cutoff has passed; confirmation will roll the delivery date." });
    checks.push({ code: "OPERATING_DAY", status: isOperatingDate(formatDate(order.deliveryDate), context) ? "PASS" : "FAIL", label: "Operating day", value: formatDate(order.deliveryDate), limit: null, message: "Delivery date must be an operating day." });
    checks.push({ code: "VEHICLE_TYPE", status: compatibleVehicles.length ? "PASS" : "FAIL", label: "Vehicle type", value: order.tempClass, limit: null, message: compatibleVehicles.length ? "A compatible active vehicle is available." : "No compatible vehicle is available at this depot." });
    checks.push({ code: "WEIGHT_FIT", status: largestWeight >= Number(order.totalWeightKg) ? "PASS" : "FAIL", label: "Weight capacity", value: Number(order.totalWeightKg), limit: largestWeight, message: largestWeight >= Number(order.totalWeightKg) ? "Order weight fits." : "Order weight exceeds available vehicle capacity." });
    checks.push({ code: "VOLUME_FIT", status: largestVolume >= Number(order.totalVolumeM3) ? "PASS" : "FAIL", label: "Volume capacity", value: Number(order.totalVolumeM3), limit: largestVolume, message: largestVolume >= Number(order.totalVolumeM3) ? "Order volume fits." : "Order volume exceeds available vehicle capacity." });
    checks.push({ code: "OUTLET_REQUIREMENTS", status: "INFO", label: "Outlet requirements", value: { vanOnly: order.vanOnly, isMall: order.isMall, unloadingType: order.unloadingType }, limit: null, message: "Outlet delivery requirements are recorded on the order snapshot." });

    checks.push(...extraChecks);
    const verdict = checks.some((check) => check.status === "FAIL")
        ? "FAIL"
        : checks.some((check) => check.status === "WARN") ? "WARN" : "PASS";
    return { verdict, checks };
};

export { addDays, dateParts, formatDate, isOperatingDate, nextOperatingDate, previousOperatingDate };
