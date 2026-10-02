import { pipeline } from "node:stream/promises";
import { sendSuccess } from "../../utils/apiResponse.js";
import { getFileService, uploadFileService } from "./files.service.js";

export const uploadFileController = async (req, res) => {
    const { kind, clientFileId } = req.body;

    const { file, created } = await uploadFileService({ userId: req.user.id, kind, clientFileId, file: req.file });

    return sendSuccess(res, {
        statusCode: created ? 201 : 200,
        message: created ? "File uploaded successfully." : "File was already uploaded.",
        data: file,
    });
};

export const getFileController = async (req, res) => {
    const { stream, mimeType, sizeBytes } = await getFileService({ userId: req.user.id, id: req.params.id });

    res.status(200);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", String(sizeBytes));
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("Content-Disposition", "inline");

    try {
        await pipeline(stream, res);
    } catch (error) {
        // a client that hangs up halfway is not an error; anything else ends the response abruptly
        if (error?.code !== "ERR_STREAM_PREMATURE_CLOSE") res.destroy(error);
    }
};
