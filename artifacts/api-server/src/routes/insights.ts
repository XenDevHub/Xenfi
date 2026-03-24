import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.js";
import {
  analyzeExpenses,
  generateInvestmentGuidance,
  calculateFinancialScore,
  generatePredictions,
  generateMonthlyReport,
  getUserFinancialContext,
} from "../services/aiInsights.js";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res) => {
  const ctx = await getUserFinancialContext(req.userId!);
  const score = calculateFinancialScore(ctx);
  const expenseInsights = await analyzeExpenses(ctx);
  const investmentInsights = await generateInvestmentGuidance(ctx);
  const predictions = generatePredictions(ctx);
  res.json({ financialScore: score, expenseInsights, investmentInsights, predictions });
});

router.get("/score", async (req: AuthRequest, res) => {
  const ctx = await getUserFinancialContext(req.userId!);
  res.json(calculateFinancialScore(ctx));
});

router.get("/report", async (req: AuthRequest, res) => {
  const ctx = await getUserFinancialContext(req.userId!);
  res.json(await generateMonthlyReport(ctx));
});

export default router;
