import { z } from "zod";

// Value rule per known key (defaults live in settings.service.js under the same names).
const VALUE_RULES = {
    // 24-hour local time
    order_cutoff_local_time: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be a 24-hour time in HH:MM format"),
    near_capacity_threshold: z
        .number("Must be a number")
        .min(0.5, "Must be at least 0.5")
        .max(1, "Must be at most 1"),
};

// Unknown keys pass here on purpose: the service answers them with 404.
export const updateSettingSchema = z
    .object({
        params: z.object({
            key: z.string().trim().min(1).max(100),
        }),
        body: z.object({
            // presence is checked per key below, with a clearer message
            value: z.unknown().optional(),
        }),
    })
    .superRefine((data, ctx) => {
        if (!Object.hasOwn(VALUE_RULES, data.params.key)) return;

        if (data.body.value === undefined) {
            ctx.addIssue({ code: "custom", path: ["body", "value"], message: "A value is required" });
            return;
        }

        const result = VALUE_RULES[data.params.key].safeParse(data.body.value);
        if (result.success) return;

        for (const issue of result.error.issues) {
            ctx.addIssue({ code: "custom", path: ["body", "value", ...issue.path], message: issue.message });
        }
    });
