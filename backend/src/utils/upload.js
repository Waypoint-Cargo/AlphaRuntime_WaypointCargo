import multer from "multer";
import { AppError } from "./appError.js";
import { MAX_FILE_BYTES } from "./fileStorage.js";

// multipart/form-data parsing for uploads: one file, held in memory (at most 5 MB),
// the other form fields land in req.body. Parser errors become AppErrors, so the
// central error handler answers them like any other client error.
const parser = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 10, fieldSize: 1024 },
});

const translate = (error) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") return new AppError("The file is larger than 5 MB.", 413);
        if (error.code === "LIMIT_UNEXPECTED_FILE") return new AppError(`Unexpected file field '${error.field}'.`, 422);
        return new AppError(`Invalid upload: ${error.message}`, 422);
    }
    return error;
};

export const singleFileUpload = (fieldName) => (req, res, next) => {
    parser.single(fieldName)(req, res, (error) => (error ? next(translate(error)) : next()));
};
