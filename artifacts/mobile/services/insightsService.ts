import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/hooks/useApi';

export interface FinancialScore {
  score: number;
  breakdown: { diversity: number; expenses: number; assets: number; debt: number };
  summary: string;
}

export interface InsightsData {
  financialScore: FinancialScore;
  expenseInsights: string[];
  investmentInsights: string[];
  predictions: {
    projected6mAssets: number;
    projected6mSavings: number;
    monthlyBurnRate: number;
    insights: string[];
  };
}

export interface MonthlyReport {
  generatedAt: string;
  netWorth: number;
  totalExpenses: number;
  totalInvestmentGain: number;
  pendingDebt: number;
  expenseBreakdown: Record<string, number>;
  financialScore: FinancialScore;
  expenseInsights: string[];
  investmentInsights: string[];
  predictions: { projected6mAssets: number; projected6mSavings: number; monthlyBurnRate: number; insights: string[] };
  recommendations: string[];
}

export function useInsights() {
  const { apiFetch } = useApi();
  return useQuery<InsightsData>({
    queryKey: ['insights'],
    queryFn: () => apiFetch('/insights'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useMonthlyReport() {
  const { apiFetch } = useApi();
  return useQuery<MonthlyReport>({
    queryKey: ['insights', 'report'],
    queryFn: () => apiFetch('/insights/report'),
    staleTime: 10 * 60 * 1000,
  });
}

export interface BusinessReport {
  id: number; name: string; color: string; icon: string;
  income: number; expenses: number; balance: number;
  breakdown: Record<string, number>; insights: string[];
}

export interface FullReport {
  generatedAt: string;
  personal: InsightsData;
  businesses: BusinessReport[];
  consolidated: {
    totalBusinessIncome: number; totalBusinessExpenses: number;
    totalBusinessBalance: number; totalEntities: number;
  };
}

export function useFullReport() {
  const { apiFetch } = useApi();
  return useQuery<FullReport>({
    queryKey: ['insights', 'full-report'],
    queryFn: () => apiFetch('/insights/full-report'),
    staleTime: 5 * 60 * 1000,
  });
}
