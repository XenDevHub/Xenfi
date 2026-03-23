import { db } from "@workspace/db";
import { marketCacheTable } from "@workspace/db/schema";
import { lt, sql } from "drizzle-orm";

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  type: "stock" | "crypto" | "gold" | "currency" | "commodity";
}

let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

const MOCK_STOCKS: MarketItem[] = [
  { symbol: "AAPL", name: "Apple Inc.", price: 227.82, changePercent: 1.24, type: "stock" },
  { symbol: "TSLA", name: "Tesla Inc.", price: 248.50, changePercent: -2.31, type: "stock" },
  { symbol: "MSFT", name: "Microsoft", price: 415.33, changePercent: 0.89, type: "stock" },
  { symbol: "NVDA", name: "NVIDIA", price: 135.72, changePercent: 3.45, type: "stock" },
  { symbol: "AMZN", name: "Amazon", price: 228.94, changePercent: 0.62, type: "stock" },
  { symbol: "SPX", name: "S&P 500", price: 5618.26, changePercent: 0.41, type: "stock" },
];

const MOCK_GOLD: MarketItem[] = [
  { symbol: "XAU", name: "Gold (oz)", price: 3085.40, changePercent: 0.73, type: "gold" },
  { symbol: "XAG", name: "Silver (oz)", price: 34.21, changePercent: 1.12, type: "gold" },
];

const MOCK_FOREX: MarketItem[] = [
  { symbol: "EUR/USD", name: "Euro / USD", price: 1.0842, changePercent: -0.18, type: "currency" },
  { symbol: "GBP/USD", name: "GBP / USD", price: 1.2941, changePercent: 0.22, type: "currency" },
  { symbol: "USD/BDT", name: "USD / BDT", price: 110.25, changePercent: 0.05, type: "currency" },
  { symbol: "USD/JPY", name: "USD / JPY", price: 151.82, changePercent: -0.33, type: "currency" },
];

function addNoise(base: number, pct = 0.003): number {
  return parseFloat((base * (1 + (Math.random() - 0.5) * pct)).toFixed(2));
}

function addChangePctNoise(base: number): number {
  return parseFloat((base + (Math.random() - 0.5) * 0.3).toFixed(2));
}

async function fetchCrypto(): Promise<MarketItem[]> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,polkadot,avalanche-2,chainlink&order=market_cap_desc&per_page=10&sparkline=false",
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error("CoinGecko error");
    const data = await res.json() as Array<{
      symbol: string;
      name: string;
      current_price: number;
      price_change_percentage_24h: number;
    }>;
    return data.map((c) => ({
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      price: c.current_price,
      changePercent: parseFloat((c.price_change_percentage_24h ?? 0).toFixed(2)),
      type: "crypto" as const,
    }));
  } catch {
    return [
      { symbol: "BTC", name: "Bitcoin", price: 87240.50, changePercent: 2.41, type: "crypto" },
      { symbol: "ETH", name: "Ethereum", price: 2081.30, changePercent: 1.85, type: "crypto" },
      { symbol: "SOL", name: "Solana", price: 143.72, changePercent: 3.21, type: "crypto" },
      { symbol: "BNB", name: "BNB", price: 624.10, changePercent: 0.95, type: "crypto" },
      { symbol: "XRP", name: "Ripple", price: 2.31, changePercent: -1.12, type: "crypto" },
    ];
  }
}

export async function getMarketData(): Promise<MarketItem[]> {
  const now = Date.now();

  if (now - lastFetchTime > CACHE_TTL_MS) {
    lastFetchTime = now;

    const cryptoData = await fetchCrypto();
    const allData: MarketItem[] = [
      ...MOCK_STOCKS.map((s) => ({ ...s, price: addNoise(s.price), changePercent: addChangePctNoise(s.changePercent) })),
      ...cryptoData,
      ...MOCK_GOLD.map((g) => ({ ...g, price: addNoise(g.price), changePercent: addChangePctNoise(g.changePercent) })),
      ...MOCK_FOREX.map((f) => ({ ...f, price: addNoise(f.price, 0.001), changePercent: addChangePctNoise(f.changePercent) })),
    ];

    try {
      await db.delete(marketCacheTable).where(lt(marketCacheTable.updatedAt, new Date(now - CACHE_TTL_MS)));
      for (const item of allData) {
        await db.insert(marketCacheTable).values({
          type: item.type,
          symbol: item.symbol,
          name: item.name,
          price: item.price,
          changePercent: item.changePercent,
        }).onConflictDoNothing();
      }
    } catch {}

    return allData;
  }

  try {
    const cached = await db.select().from(marketCacheTable).orderBy(sql`type, name`);
    if (cached.length > 0) {
      return cached.map((c) => ({
        symbol: c.symbol,
        name: c.name,
        price: c.price,
        changePercent: c.changePercent,
        type: c.type as MarketItem["type"],
      }));
    }
  } catch {}

  const cryptoData = await fetchCrypto();
  return [
    ...MOCK_STOCKS,
    ...cryptoData,
    ...MOCK_GOLD,
    ...MOCK_FOREX,
  ];
}
