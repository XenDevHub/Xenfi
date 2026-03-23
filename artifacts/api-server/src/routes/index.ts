import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import assetsRouter from "./assets.js";
import expensesRouter from "./expenses.js";
import loansRouter from "./loans.js";
import marketRouter from "./market.js";
import insightsRouter from "./insights.js";
import businessRouter from "./business.js";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/assets", assetsRouter);
router.use("/expenses", expensesRouter);
router.use("/loans", loansRouter);
router.use("/market", marketRouter);
router.use("/insights", insightsRouter);
router.use("/business", businessRouter);

export default router;
