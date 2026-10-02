import { toYmd } from "../../utils/businessTime.js";
import { toNumber, toWindowDTO } from "../../utils/serialize.js";

export const toDepotDTO = (depot) => ({
    id: depot.id,
    code: depot.code,
    name: depot.name,
    address: depot.address ?? null,
    lat: toNumber(depot.lat),
    lng: toNumber(depot.lng),
});

export const toDepotListDTO = (depots) => ({ items: depots.map(toDepotDTO) });

export const toOutletDTO = (outlet) => ({
    id: outlet.id,
    code: outlet.code,
    name: outlet.name,
    brand: outlet.brand,
    district: outlet.district,
    depotId: outlet.depotId,
    depot: outlet.depot ? { id: outlet.depot.id, code: outlet.depot.code, name: outlet.depot.name } : null,
    address: outlet.address ?? null,
    lat: toNumber(outlet.lat),
    lng: toNumber(outlet.lng),
    phone: outlet.phone ?? null,
    vanOnly: outlet.vanOnly,
    isMall: outlet.isMall,
    window: toWindowDTO(outlet.windowStartMin, outlet.windowEndMin),
    mallAccessWindow: toWindowDTO(outlet.mallAccessStartMin, outlet.mallAccessEndMin),
    unloadingType: outlet.unloadingType ?? null,
    unloadingNotes: outlet.unloadingNotes ?? null,
    isActive: outlet.isActive,
});

export const toOutletListDTO = (rows, { page, pageSize, total }) => ({
    items: rows.map(toOutletDTO),
    pagination: { page, pageSize, total },
});

export const toCalendarDayDTO = (day) => ({
    date: toYmd(day.date),
    isOperatingDay: day.isOperatingDay,
    isWeekend: day.isWeekend,
    isPayday: day.isPayday,
    festivalName: day.festivalName ?? null,
    isMonsoon: day.isMonsoon,
});

export const toCalendarDTO = (days) => ({ items: days.map(toCalendarDayDTO) });

export const toCutoffDTO = ({ requestedDate, deliveryDate, cutoffAt, rolledOver }) => ({
    requestedDate,
    deliveryDate,
    cutoffAt: cutoffAt.toISOString(),
    isOpen: !rolledOver,
    rolledOver,
});
