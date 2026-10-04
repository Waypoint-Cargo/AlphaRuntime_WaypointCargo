import { sendSuccess } from "../../utils/apiResponse.js";
import * as s from "./trips.service.js";
export const list = async (req, res) =>
  sendSuccess(res, { data: await s.listTrips(req.user, req.query) });
export const get = async (req, res) =>
  sendSuccess(res, { data: await s.getTrip(req.user, req.params.id) });
export const reorder = async (req, res) =>
  sendSuccess(res, {
    message: "Stop sequence updated",
    data: await s.reorderStops(req.user, req.params.id, req.body.stopIds),
  });
export const driver = async (req, res) =>
  sendSuccess(res, {
    message: "Driver updated",
    data: await s.changeDriver(req.user, req.params.id, req.body.driverId),
  });
export const request = async (req, res) =>
  sendSuccess(res, {
    statusCode: 201,
    message: "Sequence change requested",
    data: await s.requestSequenceChange(req.user, req.params.id, req.body),
  });
export const requests = async (req, res) =>
  sendSuccess(res, {
    data: await s.listSequenceRequests(req.user, req.params.id),
  });
export const decide = async (req, res) =>
  sendSuccess(res, {
    message: "Sequence request decided",
    data: await s.decideSequenceRequest(
      req.user,
      req.params.requestId,
      req.body.decision,
    ),
  });
