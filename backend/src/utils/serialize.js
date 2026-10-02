import { minutesToHHMM } from "./businessTime.js";

// Small helpers for DTOs.

// Prisma Decimal (or number / numeric string) -> number; null stays null
export const toNumber = (value) => (value === null || value === undefined ? null : Number(value));

// round to a fixed number of decimals without floating-point noise (1.005 -> 1.01)
export const roundTo = (value, decimals) => {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
};

// a delivery window as minutes after midnight and "HH:MM" (null when either end is missing)
export const toWindowDTO = (startMin, endMin) =>
    startMin === null || startMin === undefined || endMin === null || endMin === undefined
        ? null
        : { startMin, endMin, start: minutesToHHMM(startMin), end: minutesToHHMM(endMin) };
