import { sendSuccess } from "../../utils/apiResponse.js";
import {
    getHomeSummaryService,
    listTasksService,
    listIssuesService,
    getTaskService,
    getTaskSummaryService,
    startTaskService,
    pauseTaskService,
    updateTaskLinesService,
    reportShortfallService,
    completeTaskService,
} from "./loading.service.js";

// request metadata recorded in the audit trail
const auditContext = (req, res) => ({
    ip: req.ip,
    requestId: res.locals.requestId,
});

// GET /loading/summary — Home screen figures for one operating day
export const getHomeSummaryController = async (req, res) => {
    const { date } = req.query;
    const summary = await getHomeSummaryService({ userId: req.user.id, date });
    return sendSuccess(res, { statusCode: 200, message: "Loading summary retrieved successfully.", data: summary });
};

// GET /loading/issues — the shortfall reports of the loader's depots (Pending until the dispatcher resolves them)
export const listIssuesController = async (req, res) => {
    const { tab, limit } = req.query;
    const { items, meta } = await listIssuesService({ userId: req.user.id, tab, limit });
    return sendSuccess(res, { statusCode: 200, message: "Loading issues retrieved successfully.", data: items, meta });
};

// GET /loading/tasks — the shared task pool for a tab, filterable by route/vehicle search and brand
export const listTasksController = async (req, res) => {
    const { tab, search, brand, date, page, limit } = req.query;
    const { items, meta } = await listTasksService({ userId: req.user.id, tab, search, brand, date, page, limit });
    return sendSuccess(res, { statusCode: 200, message: "Loading tasks retrieved successfully.", data: items, meta });
};

// GET /loading/tasks/:tripId — the live task: stops, lines, saved quantities, lock and allowed actions
export const getTaskController = async (req, res) => {
    const { tripId } = req.params;
    const task = await getTaskService({ userId: req.user.id, tripId });
    return sendSuccess(res, { statusCode: 200, message: "Loading task retrieved successfully.", data: task });
};

// GET /loading/tasks/:tripId/summary — Review & Complete / Loading Completed figures
export const getTaskSummaryController = async (req, res) => {
    const { tripId } = req.params;
    const summary = await getTaskSummaryService({ userId: req.user.id, tripId });
    return sendSuccess(res, { statusCode: 200, message: "Loading summary retrieved successfully.", data: summary });
};

// POST /loading/tasks/:tripId/start — claim / resume the task ("Open Task"); also the lock heartbeat
export const startTaskController = async (req, res) => {
    const { tripId } = req.params;
    const task = await startTaskService({ userId: req.user.id, tripId, ...auditContext(req, res) });
    return sendSuccess(res, { statusCode: 200, message: "Loading started.", data: task });
};

// POST /loading/tasks/:tripId/pause — release the task back to the shared pool
export const pauseTaskController = async (req, res) => {
    const { tripId } = req.params;
    const task = await pauseTaskService({ userId: req.user.id, tripId, ...auditContext(req, res) });
    return sendSuccess(res, { statusCode: 200, message: "Loading paused.", data: task });
};

// PATCH /loading/tasks/:tripId/lines — save loaded quantities for one or more order lines
export const updateTaskLinesController = async (req, res) => {
    const { tripId } = req.params;
    const { lines, planRevision } = req.body;
    const result = await updateTaskLinesService({ userId: req.user.id, tripId, lines, planRevision });
    return sendSuccess(res, { statusCode: 200, message: "Loaded quantities saved.", data: result });
};

// POST /loading/tasks/:tripId/shortfall — report missing / damaged items and put the load on hold
export const reportShortfallController = async (req, res) => {
    const { tripId } = req.params;
    const { lines, reason, clientMutationId } = req.body;
    const task = await reportShortfallService({
        userId: req.user.id,
        tripId,
        lines,
        reason,
        clientMutationId,
        ...auditContext(req, res),
    });
    return sendSuccess(res, {
        statusCode: 201,
        message: "Shortfall reported. The load is on hold until the dispatcher reviews it.",
        data: task,
    });
};

// POST /loading/tasks/:tripId/complete — finish loading and mark the vehicle ready for its driver
export const completeTaskController = async (req, res) => {
    const { tripId } = req.params;
    const { planRevision } = req.body;
    const summary = await completeTaskService({
        userId: req.user.id,
        tripId,
        planRevision,
        ...auditContext(req, res),
    });
    return sendSuccess(res, { statusCode: 200, message: "Loading completed.", data: summary });
};
