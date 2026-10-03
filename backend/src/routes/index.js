import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import employeesRoutes from "../modules/employees/employees.routes.js";
import usersRoutes from "../modules/users/users.routes.js";
import fleetRoutes from "../modules/fleet/fleet.routes.js";
import ordersRoutes from "../modules/orders/orders.routes.js";

const router = Router();

router.use('/auth', authRoutes);
router.use('/employees', employeesRoutes);
router.use('/users', usersRoutes);
router.use('/vehicles', fleetRoutes);
router.use("/orders", ordersRoutes);
// add all routes here...

export default router;