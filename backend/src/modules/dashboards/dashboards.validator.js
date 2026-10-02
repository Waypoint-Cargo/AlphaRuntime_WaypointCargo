import { z } from "zod";
import { idString, isoDate } from "../../utils/validation.js";

// every dashboard shows one business date, today when it is left out
export const dispatcherDashboardSchema = z.object({
    query: z.object({
        date: isoDate.optional(),
        depotId: idString.optional(),
    }),
});

export const storeManagerDashboardSchema = z.object({
    query: z.object({ date: isoDate.optional() }),
});

export const loaderDashboardSchema = z.object({
    query: z.object({ date: isoDate.optional() }),
});
