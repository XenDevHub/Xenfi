import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

const BASE_PRICES = {
  BTC: 67500, ETH: 3800, BNB: 420, SOL: 185, ADA: 0.62,
  AAPL: 189, MSFT: 415, GOOGL: 175, NVDA: 870, TSLA: 245,
  GOLD: 2350, SILVER: 28.4,
  EUR: 1.085, GBP: 1.265, JPY: 0.0067,
};

function randomChange(base: number, volatility: number): number {
  const change = (Math.random() - 0.5) * volatility * 2;
  return parseFloat((base * (1 + change / 100)).toFixed(base >= 1000 ? 2 : base >= 1 ? 4 : 6));
}

function randomPct(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

router.get('/market', (_req, res) => {
  try {
    const now = Date.now();
    const seed = Math.floor(now / 60000);

    const crypto = [
      { symbol: 'BTC', name: 'Bitcoin', price: randomChange(BASE_PRICES.BTC, 3), changePercent: randomPct(-5, 5), type: 'crypto' as const },
      { symbol: 'ETH', name: 'Ethereum', price: randomChange(BASE_PRICES.ETH, 3.5), changePercent: randomPct(-6, 6), type: 'crypto' as const },
      { symbol: 'BNB', name: 'BNB', price: randomChange(BASE_PRICES.BNB, 2.5), changePercent: randomPct(-4, 4), type: 'crypto' as const },
      { symbol: 'SOL', name: 'Solana', price: randomChange(BASE_PRICES.SOL, 4), changePercent: randomPct(-7, 7), type: 'crypto' as const },
      { symbol: 'ADA', name: 'Cardano', price: randomChange(BASE_PRICES.ADA, 5), changePercent: randomPct(-8, 8), type: 'crypto' as const },
    ];

    const stocks = [
      { symbol: 'AAPL', name: 'Apple Inc.', price: randomChange(BASE_PRICES.AAPL, 1.5), changePercent: randomPct(-2, 2), type: 'stock' as const },
      { symbol: 'MSFT', name: 'Microsoft', price: randomChange(BASE_PRICES.MSFT, 1.5), changePercent: randomPct(-2, 2), type: 'stock' as const },
      { symbol: 'GOOGL', name: 'Alphabet', price: randomChange(BASE_PRICES.GOOGL, 1.5), changePercent: randomPct(-2, 2), type: 'stock' as const },
      { symbol: 'NVDA', name: 'NVIDIA', price: randomChange(BASE_PRICES.NVDA, 2.5), changePercent: randomPct(-3, 3), type: 'stock' as const },
      { symbol: 'TSLA', name: 'Tesla', price: randomChange(BASE_PRICES.TSLA, 3), changePercent: randomPct(-4, 4), type: 'stock' as const },
    ];

    const gold = [
      { symbol: 'GOLD', name: 'Gold (oz)', price: randomChange(BASE_PRICES.GOLD, 0.8), changePercent: randomPct(-1.5, 1.5), type: 'gold' as const },
      { symbol: 'SILVER', name: 'Silver (oz)', price: randomChange(BASE_PRICES.SILVER, 1.2), changePercent: randomPct(-2, 2), type: 'gold' as const },
    ];

    const forex = [
      { symbol: 'EUR/USD', name: 'Euro', price: randomChange(BASE_PRICES.EUR, 0.3), changePercent: randomPct(-0.5, 0.5), type: 'currency' as const },
      { symbol: 'GBP/USD', name: 'Pound', price: randomChange(BASE_PRICES.GBP, 0.4), changePercent: randomPct(-0.6, 0.6), type: 'currency' as const },
      { symbol: 'USD/JPY', name: 'Yen', price: randomChange(BASE_PRICES.JPY, 0.3), changePercent: randomPct(-0.4, 0.4), type: 'currency' as const },
    ];

    res.json({ crypto, stocks, gold, forex });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
