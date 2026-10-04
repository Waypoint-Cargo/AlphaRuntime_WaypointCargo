import { sendSuccess } from "../../utils/apiResponse.js";
import * as s from "./deliveries.service.js";
export const today = async (req, res) =>
  sendSuccess(res, { data: await s.getToday(req.user, req.query) });
export const available = async (req, res) =>
  sendSuccess(res, { data: await s.getAvailable(req.user, req.query) });
export const select = async (req, res) =>
  sendSuccess(res, {
    data: await s.selectTask(req.user, req.params.tripId),
  });
export const summary = async (req, res) =>
  sendSuccess(res, { data: await s.getSummary(req.user, req.query) });
export const depart = async (req, res) =>
  sendSuccess(res, {
    data: await s.depart(req.user, { ...req.body, tripId: req.params.tripId }),
  });
export const event = async (req, res) =>
  sendSuccess(res, {
    data: await s.recordStopEvent(req.user, {
      ...req.body,
      stopId: req.params.stopId,
    }),
  });
export const proof = async (req, res) =>
  sendSuccess(res, {
    statusCode: 201,
    data: await s.submitProof(req.user, {
      ...req.body,
      stopId: req.params.stopId,
    }),
  });
