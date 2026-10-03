import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import ordersRoutes from "../modules/orders/orders.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/orders", ordersRoutes);

export default router;
