import { Router } from 'express';
import pool from '../lib/db.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

async function computeInsights(userId: number) {
  const [assetsRes, expensesRes, loansRes] = await Promise.all([
    pool.query('SELECT type, value::float, purchase_value::float FROM assets WHERE user_id = $1', [userId]),
    pool.query('SELECT amount::float, category, tx_type FROM expenses WHERE user_id = $1', [userId]),
    pool.query('SELECT amount::float, status, type FROM loans WHERE user_id = $1', [userId]),
  ]);

  const assets = assetsRes.rows;
  const expenses = expensesRes.rows;
  const loans = loansRes.rows;

  const totalAssets = assets.reduce((s: number, a: any) => s + a.value, 0);
  const totalCost = assets.reduce((s: number, a: any) => s + a.purchase_value, 0);
  const types = new Set(assets.map((a: any) => a.type));

  const expenseItems = expenses.filter((e: any) => e.tx_type === 'expense');
  const incomeItems = expenses.filter((e: any) => e.tx_type === 'income');
  const totalExpenses = expenseItems.reduce((s: number, e: any) => s + e.amount, 0);
  const totalIncome = incomeItems.reduce((s: number, e: any) => s + e.amount, 0);
  const monthlyBurnRate = totalExpenses / Math.max(1, 3);

  const pendingLoans = loans.filter((l: any) => l.status === 'pending' && l.type === 'received');
  const pendingDebt = pendingLoans.reduce((s: number, l: any) => s + l.amount, 0);

  const diversityScore = Math.min(40, types.size * 10);
  const expenseScore = totalExpenses === 0 ? 30 : Math.max(0, Math.round(30 - (totalExpenses / Math.max(totalIncome, 1)) * 20));
  const assetScore = totalAssets > 0 ? Math.min(20, Math.round((totalAssets / 10000) * 5)) : 0;
  const debtScore = pendingDebt === 0 ? 10 : Math.max(0, Math.round(10 - (pendingDebt / totalAssets) * 10));

  const totalScore = diversityScore + expenseScore + assetScore + debtScore;
  const summary = totalScore >= 80 ? 'Excellent' : totalScore >= 65 ? 'Good' : totalScore >= 50 ? 'Fair' : totalScore >= 35 ? 'Poor' : 'Critical';

  const expenseInsights: string[] = [];
  if (totalExpenses > totalIncome && totalIncome > 0) {
    expenseInsights.push(`You're spending ${((totalExpenses / totalIncome - 1) * 100).toFixed(0)}% more than your income.`);
  }
  if (totalExpenses === 0) {
    expenseInsights.push('No expenses tracked yet. Start logging your spending for insights.');
  } else {
    const catMap: Record<string, number> = {};
    expenseItems.forEach((e: any) => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
    const topCat = Object.entries(catMap).sort(([, a], [, b]) => b - a)[0];
    if (topCat) expenseInsights.push(`Your top expense category is "${topCat[0]}" at $${topCat[1].toFixed(2)}.`);
    if (monthlyBurnRate > 0) expenseInsights.push(`Estimated monthly burn rate: $${monthlyBurnRate.toFixed(2)}.`);
  }

  const investmentInsights: string[] = [];
  if (assets.length === 0) {
    investmentInsights.push('Add assets to your portfolio to see investment guidance.');
  } else {
    const gain = totalAssets - totalCost;
    investmentInsights.push(`Portfolio ${gain >= 0 ? 'gain' : 'loss'}: $${Math.abs(gain).toFixed(2)} (${totalCost > 0 ? ((gain / totalCost) * 100).toFixed(1) : '0'}%)`);
    if (types.size < 3) investmentInsights.push('Consider diversifying across more asset classes for better risk management.');
    if (!types.has('crypto')) investmentInsights.push('Adding crypto exposure can increase portfolio diversity.');
    if (!types.has('real_estate')) investmentInsights.push('Real estate assets can provide stable long-term returns.');
  }

  const projected6mAssets = totalAssets * 1.04;
  const projected6mSavings = Math.max(0, (totalIncome - totalExpenses) * 6);
  const predictionInsights: string[] = [
    totalIncome > totalExpenses ? `You're saving $${((totalIncome - totalExpenses) * 6).toFixed(0)} projected over 6 months.` : 'Focus on reducing expenses to improve savings.',
    totalAssets > 0 ? `Portfolio projected to reach $${projected6mAssets.toFixed(0)} in 6 months (4% growth).` : 'Start building your portfolio to see projections.',
  ];

  return {
    financialScore: {
      score: totalScore,
      breakdown: { diversity: diversityScore, expenses: expenseScore, assets: assetScore, debt: debtScore },
      summary,
    },
    expenseInsights,
    investmentInsights,
    predictions: {
      projected6mAssets: Math.round(projected6mAssets),
      projected6mSavings: Math.round(projected6mSavings),
      monthlyBurnRate: Math.round(monthlyBurnRate),
      insights: predictionInsights,
    },
  };
}

router.get('/insights', async (req: AuthRequest, res) => {
  try {
    const insights = await computeInsights(req.user!.id);
    res.json(insights);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/insights/report', async (req: AuthRequest, res) => {
  try {
    const insights = await computeInsights(req.user!.id);
    const assetsRes = await pool.query('SELECT value::float FROM assets WHERE user_id = $1', [req.user!.id]);
    const expensesRes = await pool.query(
      'SELECT amount::float, category, tx_type FROM expenses WHERE user_id = $1',
      [req.user!.id]
    );
    const loansRes = await pool.query(
      'SELECT amount::float, status, type FROM loans WHERE user_id = $1 AND status = $2 AND type = $3',
      [req.user!.id, 'pending', 'received']
    );

    const netWorth = assetsRes.rows.reduce((s: number, a: any) => s + a.value, 0);
    const expItems = expensesRes.rows.filter((e: any) => e.tx_type === 'expense');
    const totalExpenses = expItems.reduce((s: number, e: any) => s + e.amount, 0);
    const pendingDebt = loansRes.rows.reduce((s: number, l: any) => s + l.amount, 0);

    const expenseBreakdown: Record<string, number> = {};
    expItems.forEach((e: any) => { expenseBreakdown[e.category] = (expenseBreakdown[e.category] || 0) + e.amount; });

    const recommendations = [
      ...insights.expenseInsights.slice(0, 2),
      ...insights.investmentInsights.slice(0, 2),
    ];

    res.json({
      generatedAt: new Date().toISOString(),
      netWorth: Math.round(netWorth),
      totalExpenses: Math.round(totalExpenses),
      totalInvestmentGain: 0,
      pendingDebt: Math.round(pendingDebt),
      expenseBreakdown,
      financialScore: insights.financialScore,
      expenseInsights: insights.expenseInsights,
      investmentInsights: insights.investmentInsights,
      predictions: insights.predictions,
      recommendations,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
