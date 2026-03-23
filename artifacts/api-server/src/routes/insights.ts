import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import {
  analyzeExpenses,
  generateInvestmentGuidance,
  calculateFinancialScore,
  generatePredictions,
  generateMonthlyReport,
  getUserFinancialContext,
} from "../services/aiInsights";

const router = Router();
router.use(authenticateToken);

router.get("/", async (req, res) => {
  const ctx = await getUserFinancialContext(req.user!.userId);
  const score = calculateFinancialScore(ctx);
  const expenseInsights = await analyzeExpenses(ctx);
  const investmentInsights = await generateInvestmentGuidance(ctx);
  const predictions = generatePredictions(ctx);

  res.json({
    financialScore: score,
    expenseInsights,
    investmentInsights,
    predictions,
  });
});

router.get("/score", async (req, res) => {
  const ctx = await getUserFinancialContext(req.user!.userId);
  const score = calculateFinancialScore(ctx);
  res.json(score);
});

router.get("/report", async (req, res) => {
  const ctx = await getUserFinancialContext(req.user!.userId);
  const report = await generateMonthlyReport(ctx);
  res.json(report);
});

export default router;
