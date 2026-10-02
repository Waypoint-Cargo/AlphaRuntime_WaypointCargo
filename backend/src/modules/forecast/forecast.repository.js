import { getPrisma } from "../../config/database.js";

const forecastSelect = {
    id: true,
    forecastDate: true,
    depotId: true,
    brand: true,
    tempClass: true,
    ordersExpected: true,
    weightKg: true,
    volumeM3: true,
    lowerBound: true,
    upperBound: true,
    modelVersion: true,
    generatedAt: true,
};

// createMany sends one bind value per column and row; this keeps every statement far below PostgreSQL's limit
const CREATE_CHUNK = 1000;

// ---- reads ----

// forecast rows of the depots in a date range (every model version), in date order
export const listForecasts = async ({ depotIds, from, to }) => {
    return getPrisma().demandForecast.findMany({
        where: { depotId: { in: depotIds }, forecastDate: { gte: from, lte: to } },
        orderBy: [{ forecastDate: "asc" }, { depotId: "asc" }, { brand: "asc" }, { tempClass: "asc" }],
        select: forecastSelect,
    });
};

// ---- import ----

// Imports of one model version run one after the other, so the same rows are never written twice at once.
export const lockImportTx = async (tx, modelVersion) => {
    await tx.$queryRaw`SELECT 1 AS "locked" FROM (SELECT pg_advisory_xact_lock(hashtext(${`forecast:${modelVersion}`}))) AS import_lock`;
};

// rows of a model version that already exist for the given depots and dates
export const findExistingTx = (tx, { modelVersion, depotIds, from, to }) => {
    return tx.demandForecast.findMany({
        where: { modelVersion, depotId: { in: depotIds }, forecastDate: { gte: from, lte: to } },
        select: { id: true, forecastDate: true, depotId: true, brand: true, tempClass: true },
    });
};

export const deleteForecastsTx = (tx, ids) => {
    return tx.demandForecast.deleteMany({ where: { id: { in: ids } } });
};

export const createForecastsTx = async (tx, rows) => {
    let created = 0;
    for (let start = 0; start < rows.length; start += CREATE_CHUNK) {
        const { count } = await tx.demandForecast.createMany({ data: rows.slice(start, start + CREATE_CHUNK) });
        created += count;
    }
    return created;
};
