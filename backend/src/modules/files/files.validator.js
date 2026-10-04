import { z } from "zod";
export const MIME_TYPES = ["image/png", "image/jpeg"];
export const uploadSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({
    kind: z.enum(["SIGNATURE", "POD_PHOTO", "ISSUE_PHOTO"]),
    mimeType: z.enum(MIME_TYPES),
    // the image itself, base64 encoded (no "data:" prefix)
    dataBase64: z.string().min(1),
    // lets an offline client retry the same upload safely
    clientFileId: z.string().min(1).max(100).optional(),
  }),
});
export const fileIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().min(1).max(40) }),
});
