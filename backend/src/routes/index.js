import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import employeesRoutes from "../modules/employees/employees.routes.js";
import usersRoutes from "../modules/users/users.routes.js";
import tripsRoutes from "../modules/trips/trips.routes.js";
import deferralsRoutes from "../modules/deferrals/deferrals.routes.js";
import deliveriesRoutes from "../modules/deliveries/deliveries.routes.js";
import issuesRoutes from "../modules/issues/issues.routes.js";
import fleetRoutes from "../modules/fleet/fleet.routes.js";
import ordersRoutes from "../modules/orders/orders.routes.js";
import trackingRoutes from "../modules/tracking/tracking.routes.js";
import loadingRoutes from "../modules/loading/loading.routes.js";


const router = Router();

router.use('/auth', authRoutes);
router.use('/employees', employeesRoutes);
router.use('/users', usersRoutes);
router.use("/trips", tripsRoutes);
router.use("/deferrals", deferralsRoutes);
router.use("/deliveries", deliveriesRoutes);
router.use("/issues", issuesRoutes);
router.use('/vehicles', fleetRoutes);
router.use("/orders", ordersRoutes);
router.use('/tracking', trackingRoutes);
router.use('/loading', loadingRoutes);
// add all routes here...

export default router;