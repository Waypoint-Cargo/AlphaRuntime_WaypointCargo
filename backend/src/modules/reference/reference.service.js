import { AppError } from "../../utils/appError.js";
import { Role } from "../../generated/prisma/index.js";
import { assertDepotAccess } from "../../utils/scope.js";
import { addDays, diffDays, fromYmd, toUtcInstant, toYmd, todayBusinessDate } from "../../utils/businessTime.js";
import * as usersService from "../users/users.service.js";
import * as settingsService from "../settings/settings.service.js";
import {
    findCalendarDay,
    findNextOperatingDay,
    findOutletById,
    findOutletRoutingInfo,
    findPreviousOperatingDay,
    listCalendarDays,
    listDepots,
    listOutlets,
} from "./reference.repository.js";
import {
    toCalendarDTO,
    toCutoffDTO,
    toDepotListDTO,
    toOutletDTO,
    toOutletListDTO,
} from "./reference.dto.js";

const outsideCalendar = () => new AppError("Date is outside the operating calendar", 422);

// ---- operating calendar (dates are "YYYY-MM-DD") ----

// false for non-operating days and for dates that have no calendar row
export const isOperatingDate = async (date) => {
    const day = await findCalendarDay(fromYmd(date));
    return Boolean(day?.isOperatingDay);
};

export const nextOperatingDate = async (date) => {
    const day = await findNextOperatingDay(fromYmd(date));
    if (!day) throw outsideCalendar();
    return toYmd(day.date);
};

export const previousOperatingDate = async (date) => {
    const day = await findPreviousOperatingDay(fromYmd(date));
    if (!day) throw outsideCalendar();
    return toYmd(day.date);
};

// A requested delivery date must not be in the past and must have a calendar row.
// Returns the calendar day.
export const validateRequestedDate = async (requestedDate, now = new Date()) => {
    if (requestedDate < todayBusinessDate(now)) {
        throw new AppError("The delivery date cannot be in the past.", 422);
    }
    const day = await findCalendarDay(fromYmd(requestedDate));
    if (!day) throw outsideCalendar();
    return day;
};

// The UTC instant at which orders for a delivery date close:
// order_cutoff_local_time (Asia/Colombo) on the previous operating day.
export const getCutoffAt = async (deliveryDate) => {
    const cutoffTime = await settingsService.getSetting("order_cutoff_local_time");
    return toUtcInstant(await previousOperatingDate(deliveryDate), cutoffTime);
};

// The delivery date an order requested for `requestedDate` gets if submitted at `now`:
// a non-operating day moves to the next operating day, and so does a date whose cut-off has passed.
export const resolveDeliveryDate = async ({ requestedDate, now = new Date() }) => {
    const day = await validateRequestedDate(requestedDate, now);
    const cutoffTime = await settingsService.getSetting("order_cutoff_local_time");

    let candidate = day.isOperatingDay ? requestedDate : await nextOperatingDate(requestedDate);

    // each pass either returns or moves one operating day forward; the calendar is finite
    for (let pass = 0; pass < 60; pass++) {
        const cutoffAt = toUtcInstant(await previousOperatingDate(candidate), cutoffTime);
        if (now.getTime() <= cutoffAt.getTime()) {
            return { deliveryDate: candidate, cutoffAt, rolledOver: candidate !== requestedDate };
        }
        candidate = await nextOperatingDate(candidate);
    }
    throw outsideCalendar();
};

// ---- outlets ----

// One outlet in the client shape (used by other modules). 404 when it does not exist.
export const getOutlet = async (outletId) => {
    const outlet = await findOutletById(outletId);
    if (!outlet) throw new AppError("Outlet not found.", 404);
    return toOutletDTO(outlet);
};

// An outlet's position and district-travel attributes, for route and fuel estimates (internal use).
export const getOutletRouting = async (outletId) => {
    const outlet = await findOutletRoutingInfo(outletId);
    if (!outlet) throw new AppError("Outlet not found.", 404);
    return {
        district: outlet.district,
        lat: outlet.lat === null ? null : Number(outlet.lat),
        lng: outlet.lng === null ? null : Number(outlet.lng),
        sourceAttributes: outlet.sourceAttributes,
    };
};

// Rows the signed-in user may see: store managers their outlet, dispatchers and loaders their
// depots, admins everything. Anyone else (drivers) gets nothing.
const outletScopeWhere = (scope) => {
    if (scope.role === Role.STORE_MANAGER) return { id: scope.outletId ?? "" };
    if (scope.role === Role.DISPATCHER || scope.role === Role.LOADER) return { depotId: { in: scope.depotIds } };
    if (scope.role === Role.ADMIN) return {};
    return { id: "" };
};

export const listDepotsService = async () => toDepotListDTO(await listDepots());

export const listOutletsService = async ({ userId, depotId, brand, district, isMall, vanOnly, q, page, pageSize }) => {
    const scope = await usersService.getScope(userId);
    if (depotId && scope.role !== Role.STORE_MANAGER) assertDepotAccess(scope, depotId);

    const where = {
        AND: [
            outletScopeWhere(scope),
            {
                ...(depotId && { depotId }),
                ...(brand && { brand }),
                ...(district && { district: { equals: district, mode: "insensitive" } }),
                ...(isMall !== undefined && { isMall }),
                ...(vanOnly !== undefined && { vanOnly }),
                ...(q && {
                    OR: [
                        { name: { contains: q, mode: "insensitive" } },
                        { code: { contains: q, mode: "insensitive" } },
                    ],
                }),
            },
        ],
    };

    const { rows, total } = await listOutlets({ where, skip: (page - 1) * pageSize, take: pageSize });
    return toOutletListDTO(rows, { page, pageSize, total });
};

export const getOutletService = async ({ userId, id }) => {
    const scope = await usersService.getScope(userId);
    const outlet = await findOutletById(id);
    if (!outlet) throw new AppError("Outlet not found.", 404);

    if (scope.role === Role.STORE_MANAGER) {
        if (scope.outletId !== outlet.id) throw new AppError("You do not have access to this resource.", 403);
    } else {
        assertDepotAccess(scope, outlet.depotId);
    }
    return toOutletDTO(outlet);
};

// ---- calendar and cut-off endpoints ----

export const listCalendarService = async ({ from, to }) => {
    if (diffDays(from, to) < 0) throw new AppError("'from' must not be after 'to'.", 422);
    return toCalendarDTO(await listCalendarDays(fromYmd(from), fromYmd(to)));
};

export const getCutoffService = async ({ deliveryDate, now = new Date() }) => {
    // default: the next day, the date orders are normally placed for
    const requestedDate = deliveryDate ?? addDays(todayBusinessDate(now), 1);
    const resolved = await resolveDeliveryDate({ requestedDate, now });
    return toCutoffDTO({ requestedDate, ...resolved });
};
