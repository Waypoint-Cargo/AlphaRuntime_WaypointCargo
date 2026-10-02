import { getPrisma } from "../../config/database.js";

const depotSelect = { id: true, code: true, name: true, address: true, lat: true, lng: true };

const outletSelect = {
    id: true,
    code: true,
    name: true,
    brand: true,
    district: true,
    depotId: true,
    depot: { select: { id: true, code: true, name: true } },
    address: true,
    lat: true,
    lng: true,
    phone: true,
    vanOnly: true,
    isMall: true,
    windowStartMin: true,
    windowEndMin: true,
    mallAccessStartMin: true,
    mallAccessEndMin: true,
    unloadingType: true,
    unloadingNotes: true,
    isActive: true,
};

const calendarSelect = {
    date: true,
    isOperatingDay: true,
    isWeekend: true,
    isPayday: true,
    festivalName: true,
    isMonsoon: true,
};

export const listDepots = async () => {
    const db = getPrisma();
    return db.depot.findMany({ orderBy: { code: "asc" }, select: depotSelect });
};

// page of outlets + total count for the same filter
export const listOutlets = async ({ where, skip, take }) => {
    const db = getPrisma();
    const [rows, total] = await db.$transaction([
        db.outlet.findMany({ where, orderBy: [{ code: "asc" }], skip, take, select: outletSelect }),
        db.outlet.count({ where }),
    ]);
    return { rows, total };
};

export const findOutletById = async (id) => {
    const db = getPrisma();
    return db.outlet.findUnique({ where: { id }, select: outletSelect });
};

export const listCalendarDays = async (from, to) => {
    const db = getPrisma();
    return db.calendarDay.findMany({
        where: { date: { gte: from, lte: to } },
        orderBy: { date: "asc" },
        select: calendarSelect,
    });
};

export const findCalendarDay = async (date) => {
    const db = getPrisma();
    return db.calendarDay.findUnique({ where: { date }, select: calendarSelect });
};

// first operating day strictly after the date
export const findNextOperatingDay = async (date) => {
    const db = getPrisma();
    return db.calendarDay.findFirst({
        where: { date: { gt: date }, isOperatingDay: true },
        orderBy: { date: "asc" },
        select: { date: true },
    });
};

// last operating day strictly before the date
export const findPreviousOperatingDay = async (date) => {
    const db = getPrisma();
    return db.calendarDay.findFirst({
        where: { date: { lt: date }, isOperatingDay: true },
        orderBy: { date: "desc" },
        select: { date: true },
    });
};

// what route estimation needs about an outlet (including the district-travel attributes kept from the data files)
export const findOutletRoutingInfo = async (id) => {
    const db = getPrisma();
    return db.outlet.findUnique({
        where: { id },
        select: { id: true, district: true, lat: true, lng: true, sourceAttributes: true },
    });
};
