import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/hooks/useApi';

export interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  type: 'stock' | 'crypto' | 'gold' | 'currency' | 'commodity';
}

export interface MarketData {
  crypto: MarketItem[];
  stocks: MarketItem[];
  gold: MarketItem[];
  forex: MarketItem[];
}

export function useMarketData() {
  const { apiFetch } = useApi();
  return useQuery<MarketData>({
    queryKey: ['market'],
    queryFn: () => apiFetch('/market'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });
}
