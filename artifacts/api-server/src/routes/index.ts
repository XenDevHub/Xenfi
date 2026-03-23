import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import assetsRouter from "./assets.js";
import expensesRouter from "./expenses.js";
import loansRouter from "./loans.js";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/assets", assetsRouter);
router.use("/expenses", expensesRouter);
router.use("/loans", loansRouter);

export default router;
