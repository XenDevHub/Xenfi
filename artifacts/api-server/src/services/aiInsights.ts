import { db } from "@workspace/db";
import { aiInsightsTable, assetsTable, expensesTable, loansTable, usersTable } from "@workspace/db/schema";
import { eq, desc, gte } from "drizzle-orm";

interface FinancialContext {
  userId: number;
  assets: Array<{ type: string; value: number; purchaseValue: number | null }>;
  expenses: Array<{ amount: number; category: string; date: Date }>;
  loans: Array<{ type: string; amount: number; status: string; dueDate: Date | null }>;
  user: { isPremium: boolean; role: string };
}

export async function analyzeExpenses(ctx: FinancialContext) {
  const { expenses } = ctx;
  const insights: string[] = [];

  const byCategory: Record<string, number> = {};
  const total = expenses.reduce((sum, e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    return sum + e.amount;
  }, 0);

  const sorted = Object.entries(byCategory).sort(([, a], [, b]) => b - a);

  if (sorted.length > 0) {
    const [topCat, topAmt] = sorted[0];
    const pct = total > 0 ? Math.round((topAmt / total) * 100) : 0;
    insights.push(`Your highest spending category is ${topCat} at ${pct}% of total expenses ($${topAmt.toLocaleString()}).`);
  }

  if (total > 5000) {
    insights.push(`Your total tracked expenses of $${total.toLocaleString()} are above average. Review discretionary spending.`);
  }

  const dining = byCategory["dining"] || 0;
  const travel = byCategory["travel"] || 0;
  if (dining > 800) {
    insights.push(`Dining expenses ($${dining.toLocaleString()}) are elevated. Reducing by 20% could save $${Math.round(dining * 0.2)} monthly.`);
  }
  if (travel > 2000) {
    insights.push(`Travel spending of $${travel.toLocaleString()} is significant. Consider economy alternatives for non-essential trips.`);
  }

  return insights;
}

export async function generateInvestmentGuidance(ctx: FinancialContext) {
  const { assets } = ctx;
  const insights: string[] = [];

  const totalValue = assets.reduce((s, a) => s + a.value, 0);
  const byType: Record<string, number> = {};
  for (const a of assets) byType[a.type] = (byType[a.type] || 0) + a.value;

  const stockPct = totalValue > 0 ? ((byType["stocks"] || 0) / totalValue) * 100 : 0;
  const cryptoPct = totalValue > 0 ? ((byType["crypto"] || 0) / totalValue) * 100 : 0;
  const cashPct = totalValue > 0 ? ((byType["cash"] || 0) / totalValue) * 100 : 0;
  const rePct = totalValue > 0 ? ((byType["real_estate"] || 0) / totalValue) * 100 : 0;

  if (stockPct < 20) {
    insights.push(`Your portfolio is underweight in equities (${Math.round(stockPct)}%). Consider allocating 10–15% to diversified index funds.`);
  }
  if (cryptoPct > 40) {
    insights.push(`Crypto represents ${Math.round(cryptoPct)}% of your portfolio — above the recommended 10–15% for risk management. Consider rebalancing.`);
  }
  if (cashPct > 30) {
    insights.push(`Cash holdings of ${Math.round(cashPct)}% are high. Deploying idle cash into T-bills or index funds could generate returns.`);
  }
  if (rePct < 10 && totalValue > 100000) {
    insights.push(`Real estate is absent from your portfolio. Adding a REIT position can provide passive income and portfolio stability.`);
  }

  const totalGain = assets.reduce((s, a) => s + (a.value - (a.purchaseValue || a.value)), 0);
  if (totalGain > 0) {
    const gainPct = ((totalGain / (totalValue - totalGain)) * 100).toFixed(1);
    insights.push(`Your total portfolio gain is $${totalGain.toLocaleString()} (+${gainPct}%). Consider tax-loss harvesting strategies to optimize returns.`);
  }

  return insights;
}

export function calculateFinancialScore(ctx: FinancialContext): { score: number; breakdown: Record<string, number>; summary: string } {
  const { assets, expenses, loans } = ctx;

  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const pendingLoans = loans.filter((l) => l.status === "pending");
  const loansGiven = pendingLoans.filter((l) => l.type === "given").reduce((s, l) => s + l.amount, 0);
  const loansReceived = pendingLoans.filter((l) => l.type === "received").reduce((s, l) => s + l.amount, 0);

  const byType: Record<string, number> = {};
  for (const a of assets) byType[a.type] = (byType[a.type] || 0) + a.value;
  const uniqueTypes = Object.keys(byType).length;

  let diversityScore = Math.min(uniqueTypes * 20, 40);
  let expenseScore = totalExpenses === 0 ? 30 : Math.max(0, 30 - Math.round((totalExpenses / 1000) * 2));
  expenseScore = Math.min(expenseScore, 30);
  let assetScore = Math.min(Math.round((totalAssets / 100000) * 20), 20);
  let debtScore = loansReceived === 0 ? 10 : Math.max(0, 10 - Math.round(loansReceived / 5000));

  const score = Math.min(100, diversityScore + expenseScore + assetScore + debtScore);

  let summary = "Building";
  if (score >= 80) summary = "Excellent";
  else if (score >= 65) summary = "Strong";
  else if (score >= 50) summary = "Good";
  else if (score >= 35) summary = "Fair";

  return {
    score,
    breakdown: { diversity: diversityScore, expenses: expenseScore, assets: assetScore, debt: debtScore },
    summary,
  };
}

export function generatePredictions(ctx: FinancialContext) {
  const { assets, expenses } = ctx;

  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const monthlyExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const assumed6mGrowth = totalAssets * 0.06;
  const projected6mSavings = assumed6mGrowth - monthlyExpenses * 3;
  const projectedAssets = totalAssets + assumed6mGrowth;

  return {
    projected6mAssets: Math.round(projectedAssets),
    projected6mSavings: Math.round(Math.max(0, projected6mSavings)),
    monthlyBurnRate: Math.round(monthlyExpenses),
    insights: [
      `At current growth rates, your portfolio could reach $${projectedAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })} in 6 months.`,
      monthlyExpenses > 0
        ? `Your monthly expense run-rate is $${monthlyExpenses.toLocaleString()}. Cutting 15% could yield $${Math.round(monthlyExpenses * 0.15 * 6).toLocaleString()} in savings over 6 months.`
        : `Start tracking expenses to unlock personalized savings predictions.`,
    ],
  };
}

export async function generateMonthlyReport(ctx: FinancialContext) {
  const { assets, expenses, loans, userId } = ctx;

  const totalNetWorth = assets.reduce((s, a) => s + a.value, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalGain = assets.reduce((s, a) => s + (a.value - (a.purchaseValue || a.value)), 0);
  const pendingLoansReceived = loans.filter((l) => l.type === "received" && l.status === "pending").reduce((s, l) => s + l.amount, 0);

  const byCategory: Record<string, number> = {};
  for (const e of expenses) byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;

  const scoreData = calculateFinancialScore(ctx);
  const expenseInsights = await analyzeExpenses(ctx);
  const investmentInsights = await generateInvestmentGuidance(ctx);
  const predictions = generatePredictions(ctx);

  return {
    generatedAt: new Date().toISOString(),
    netWorth: totalNetWorth,
    totalExpenses,
    totalInvestmentGain: totalGain,
    pendingDebt: pendingLoansReceived,
    expenseBreakdown: byCategory,
    financialScore: scoreData,
    expenseInsights,
    investmentInsights,
    predictions,
    recommendations: [
      ...expenseInsights.slice(0, 2),
      ...investmentInsights.slice(0, 2),
      ...predictions.insights.slice(0, 1),
    ],
  };
}

export async function getUserFinancialContext(userId: number): Promise<FinancialContext> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const assets = await db.select().from(assetsTable).where(eq(assetsTable.userId, userId));
  const expenses = await db.select().from(expensesTable).where(eq(expensesTable.userId, userId));
  const loans = await db.select().from(loansTable).where(eq(loansTable.userId, userId));

  return {
    userId,
    assets,
    expenses,
    loans,
    user: { isPremium: user?.isPremium ?? false, role: user?.role ?? "user" },
  };
}
