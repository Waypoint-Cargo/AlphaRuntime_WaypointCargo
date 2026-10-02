import { z } from "zod";
import { FileKind } from "../../generated/prisma/index.js";
import { clientId, idString } from "../../utils/validation.js";

// POST /files is multipart: `kind` and `clientFileId` are text fields next to the `file` part
export const uploadFileSchema = z.object({
    body: z.object({
        kind: z.enum(FileKind),
        clientFileId: clientId.optional(),
    }),
});

export const fileIdSchema = z.object({
    params: z.object({ id: idString }),
});
