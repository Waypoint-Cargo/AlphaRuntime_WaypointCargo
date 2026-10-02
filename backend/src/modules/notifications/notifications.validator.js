import { z } from "zod";

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

export const listNotificationsSchema = z.object({
    query: z.object({
        unread: booleanString.optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(25),
    }),
});

export const markNotificationReadSchema = z.object({
    params: z.object({
        id: z.string().min(1),
    }),
});
