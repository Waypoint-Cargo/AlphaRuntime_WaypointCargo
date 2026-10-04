import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import employeesRoutes from "../modules/employees/employees.routes.js";
import usersRoutes from "../modules/users/users.routes.js";
import fleetRoutes from "../modules/fleet/fleet.routes.js";
import ordersRoutes from "../modules/orders/orders.routes.js";
import trackingRoutes from "../modules/tracking/tracking.routes.js";
import planningRoutes from "../modules/planning/planning.routes.js";
import allocationsRoutes from "../modules/allocations/allocations.routes.js";


const router = Router();

router.use('/auth', authRoutes);
router.use('/employees', employeesRoutes);
router.use('/users', usersRoutes);
router.use('/vehicles', fleetRoutes);
router.use("/orders", ordersRoutes);
router.use('/tracking', trackingRoutes);
router.use('/plans', planningRoutes);
router.use('/allocations', allocationsRoutes);
// add all routes here...

export default router;