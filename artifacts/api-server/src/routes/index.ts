import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import assetsRouter from "./assets.js";
import expensesRouter from "./expenses.js";
import categoriesRouter from "./categories.js";
import currenciesRouter from "./currencies.js";
import loansRouter from "./loans.js";
import insightsRouter from "./insights.js";
import marketRouter from "./market.js";
import businessRouter from "./business.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(assetsRouter);
router.use(expensesRouter);
router.use(categoriesRouter);
router.use(currenciesRouter);
router.use(loansRouter);
router.use(insightsRouter);
router.use(marketRouter);
router.use(businessRouter);

export default router;
