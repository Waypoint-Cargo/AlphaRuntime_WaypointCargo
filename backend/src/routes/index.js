import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import employeesRoutes from "../modules/employees/employees.routes.js";
import usersRoutes from "../modules/users/users.routes.js";
import tripsRoutes from "../modules/trips/trips.routes.js";
import deferralsRoutes from "../modules/deferrals/deferrals.routes.js";
import deliveriesRoutes from "../modules/deliveries/deliveries.routes.js";
import issuesRoutes from "../modules/issues/issues.routes.js";

const router = Router();

router.use('/auth', authRoutes);
router.use('/employees', employeesRoutes);
router.use('/users', usersRoutes);
router.use("/trips", tripsRoutes);
router.use("/deferrals", deferralsRoutes);
router.use("/deliveries", deliveriesRoutes);
router.use("/issues", issuesRoutes);

export default router;