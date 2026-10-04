import { sendSuccess } from "../../utils/apiResponse.js";
import * as s from "./issues.service.js";
export const create = async (req, res) => {
  const x = await s.createIssue(req.user, req.body);
  return sendSuccess(res, {
    statusCode: x.statusCode,
    message: "Issue recorded",
    data: x.data,
  });
};
export const list = async (req, res) =>
  sendSuccess(res, { data: await s.listIssues(req.user, req.query) });
export const get = async (req, res) =>
  sendSuccess(res, { data: await s.getIssue(req.user, req.params.id) });
export const status = async (req, res) =>
  sendSuccess(res, {
    message: "Issue status updated",
    data: await s.changeStatus(req.user, req.params.id, req.body),
  });
