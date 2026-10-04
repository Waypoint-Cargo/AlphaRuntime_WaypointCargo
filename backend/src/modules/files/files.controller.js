import { sendSuccess } from "../../utils/apiResponse.js";
import * as s from "./files.service.js";
export const upload = async (req, res) =>
  sendSuccess(res, {
    statusCode: 201,
    message: "File uploaded",
    data: await s.uploadFile(req.user, req.body),
  });
export const download = async (req, res) => {
  const { mimeType, bytes } = await s.readFile(req.user, req.params.id);
  res.set("Content-Type", mimeType).set("Cache-Control", "private, max-age=3600");
  res.send(bytes);
};
