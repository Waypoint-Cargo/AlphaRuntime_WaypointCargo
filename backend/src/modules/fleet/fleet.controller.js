import { sendSuccess } from "../../utils/apiResponse.js";
import {
    createVehicleService,
    listVehiclesService,
    getVehicleService,
    updateVehicleService,
    updateVehicleStatusService,
    deleteVehicleService,
    listAvailableVehiclesService,
    listInRouteVehiclesService,
    listMaintenanceVehiclesService,
    listCompatibleVehiclesService,
    listDepotsService,
    fleetStatsService,
    createFuelEntryService,
} from "./fleet.service.js";

// POST /vehicles — register a new vehicle
export const createVehicleController = async (req, res) => {
    const vehicle = await createVehicleService(req.body);
    return sendSuccess(res, { statusCode: 201, message: "Vehicle created successfully.", data: vehicle });
};

// GET /vehicles — list vehicles, filterable by type/temp/depot/status/search
export const listVehiclesController = async (req, res) => {
    const { type, isRefrigerated, depotId, status, isActive, search, page, limit } = req.query;
    const { items, meta } = await listVehiclesService({
        type,
        isRefrigerated,
        depotId,
        status,
        isActive,
        search,
        page,
        limit,
    });
    return sendSuccess(res, { statusCode: 200, message: "Vehicles retrieved successfully.", data: items, meta });
};

// GET /vehicles/stats — fleet summary tiles (total/available/in-route/maintenance + breakdowns)
export const fleetStatsController = async (req, res) => {
    const stats = await fleetStatsService();
    return sendSuccess(res, { statusCode: 200, message: "Fleet statistics retrieved successfully.", data: stats });
};

// GET /vehicles/available — vehicles ready for assignment
export const listAvailableVehiclesController = async (req, res) => {
    const { type, depotId } = req.query;
    const vehicles = await listAvailableVehiclesService({ type, depotId });
    return sendSuccess(res, { statusCode: 200, message: "Available vehicles retrieved successfully.", data: vehicles });
};

// GET /vehicles/in-route — vehicles currently assigned or delivering
export const listInRouteVehiclesController = async (req, res) => {
    const { type, depotId } = req.query;
    const vehicles = await listInRouteVehiclesService({ type, depotId });
    return sendSuccess(res, { statusCode: 200, message: "In-route vehicles retrieved successfully.", data: vehicles });
};

// GET /vehicles/maintenance — vehicles under service
export const listMaintenanceVehiclesController = async (req, res) => {
    const { type, depotId } = req.query;
    const vehicles = await listMaintenanceVehiclesService({ type, depotId });
    return sendSuccess(res, { statusCode: 200, message: "Vehicles under maintenance retrieved successfully.", data: vehicles });
};

// GET /vehicles/compatible — vehicles that satisfy a temp/capacity/depot requirement
export const listCompatibleVehiclesController = async (req, res) => {
    const { tempClass, weightKg, volumeM3, depotId, vanOnly } = req.query;
    const vehicles = await listCompatibleVehiclesService({ tempClass, weightKg, volumeM3, depotId, vanOnly });
    return sendSuccess(res, { statusCode: 200, message: "Compatible vehicles retrieved successfully.", data: vehicles });
};

// GET /vehicles/depots — home-depot picker for the create/update vehicle forms
export const listDepotsController = async (req, res) => {
    const depots = await listDepotsService();
    return sendSuccess(res, { statusCode: 200, message: "Depots retrieved successfully.", data: depots });
};

// GET /vehicles/:vehicleId — single vehicle detail
export const getVehicleController = async (req, res) => {
    const { vehicleId } = req.params;
    const vehicle = await getVehicleService({ vehicleId });
    return sendSuccess(res, { statusCode: 200, message: "Vehicle retrieved successfully.", data: vehicle });
};

// PATCH /vehicles/:vehicleId — update vehicle details (capacity, fuel profile, depot, driver, isActive)
export const updateVehicleController = async (req, res) => {
    const { vehicleId } = req.params;
    const vehicle = await updateVehicleService({ vehicleId, ...req.body });
    return sendSuccess(res, { statusCode: 200, message: "Vehicle updated successfully.", data: vehicle });
};

// PATCH /vehicles/:vehicleId/status — change operational status (Available/Assigned/On Route/Maintenance)
export const updateVehicleStatusController = async (req, res) => {
    const { vehicleId } = req.params;
    const { status, statusNote } = req.body;
    const vehicle = await updateVehicleStatusService({ vehicleId, status, statusNote });
    return sendSuccess(res, { statusCode: 200, message: "Vehicle status updated successfully.", data: vehicle });
};

// POST /vehicles/:vehicleId/fuel-entries — log actual fuel usage against this week's quota
export const createFuelEntryController = async (req, res) => {
    const { vehicleId } = req.params;
    const { litres, distanceKm, note } = req.body;
    const vehicle = await createFuelEntryService({ vehicleId, litres, distanceKm, note });
    return sendSuccess(res, { statusCode: 201, message: "Fuel entry recorded successfully.", data: vehicle });
};

// DELETE /vehicles/:vehicleId — permanently remove a vehicle
export const deleteVehicleController = async (req, res) => {
    const { vehicleId } = req.params;
    await deleteVehicleService({ vehicleId });
    return sendSuccess(res, { statusCode: 200, message: "Vehicle deleted successfully.", data: null });
};
