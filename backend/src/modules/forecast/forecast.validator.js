import { z } from "zod";
import { Brand, TempClass } from "../../generated/prisma/index.js";
import { diffDays, isValidYmd, mondayOf } from "../../utils/businessTime.js";
import { idString, isoDate, isoDateTime } from "../../utils/validation.js";

const MAX_DEMAND_DAYS = 92;

// the largest values the columns can hold: Decimal(8,1), Decimal(12,2) and Decimal(12,3)
const orders = z.number().min(0).max(9_999_999.9);
const weight = z.number().min(0).max(9_999_999_999.99);
const volume = z.number().min(0).max(999_999_999.999);

const forecastRow = z
    .object({
        forecastDate: isoDate,
        depotId: idString,
        brand: z.enum(Brand),
        tempClass: z.enum(TempClass),
        ordersExpected: orders.optional(),
        weightKg: weight.optional(),
        volumeM3: volume.optional(),
        lowerBound: weight.optional(),
        upperBound: weight.optional(),
    })
    .refine((row) => row.lowerBound === undefined || row.upperBound === undefined || row.lowerBound <= row.upperBound, {
        message: "lowerBound must not be above upperBound",
        path: ["lowerBound"],
    });

export const importForecastSchema = z.object({
    body: z
        .object({
            modelVersion: z.string().trim().min(1).max(100),
            generatedAt: isoDateTime,
            rows: z.array(forecastRow).min(1).max(5000),
        })
        .superRefine((body, ctx) => {
            const seen = new Set();
            body.rows.forEach((row, index) => {
                const key = `${row.forecastDate}|${row.depotId}|${row.brand}|${row.tempClass}`;
                if (seen.has(key)) {
                    ctx.addIssue({ code: "custom", path: ["rows", index], message: "Another row has the same date, depot, brand and temperature class." });
                }
                seen.add(key);
            });
        }),
});

export const demandSchema = z.object({
    query: z
        .object({
            from: isoDate,
            to: isoDate,
            depotId: idString.optional(),
            brand: z.enum(Brand).optional(),
            tempClass: z.enum(TempClass).optional(),
            modelVersion: z.string().trim().min(1).max(100).optional(),
            page: z.coerce.number().int().min(1).default(1),
            pageSize: z.coerce.number().int().min(1).max(1000).default(500),
        })
        .superRefine((query, ctx) => {
            // a date that is not valid has already been reported by isoDate (and cannot be measured)
            if (!isValidYmd(query.from) || !isValidYmd(query.to)) return;
            const days = diffDays(query.from, query.to) + 1;
            if (days < 1) ctx.addIssue({ code: "custom", path: ["to"], message: "'from' must not be after 'to'" });
            else if (days > MAX_DEMAND_DAYS) {
                ctx.addIssue({ code: "custom", path: ["to"], message: `The range can be at most ${MAX_DEMAND_DAYS} days` });
            }
        }),
});

export const capacitySchema = z.object({
    query: z.object({
        weekStart: isoDate.refine((date) => !isValidYmd(date) || mondayOf(date) === date, "weekStart must be a Monday"),
        depotId: idString.optional(),
    }),
});
