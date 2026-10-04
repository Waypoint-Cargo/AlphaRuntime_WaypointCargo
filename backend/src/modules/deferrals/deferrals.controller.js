import { sendSuccess } from "../../utils/apiResponse.js";
import * as s from "./deferrals.service.js";
export const create = async (req, res) =>
  sendSuccess(res, {
    statusCode: 201,
    message: "Deferral created",
    data: await s.deferOrder(req.user, req.body),
  });
export const list = async (req, res) =>
  sendSuccess(res, { data: await s.listDeferrals(req.user, req.query) });
export const summary = async (req, res) =>
  sendSuccess(res, { data: await s.summary(req.user, req.query) });
export const history = async (req, res) =>
  sendSuccess(res, {
    data: await s.history(req.user, req.params.outletId, req.query.limit),
  });
export const get = async (req, res) =>
  sendSuccess(res, { data: await s.get(req.user, req.params.id) });
export const decide = async (req, res) =>
  sendSuccess(res, { data: await s.decide(req.user, req.params.id, req.body) });
export const replan = async (req, res) =>
  sendSuccess(res, { data: await s.replan(req.user, req.params.id) });
