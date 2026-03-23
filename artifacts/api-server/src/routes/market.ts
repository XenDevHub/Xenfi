import { Router } from "express";
import { getMarketData } from "../services/marketData";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const data = await getMarketData();
    const grouped = {
      crypto: data.filter((d) => d.type === "crypto"),
      stocks: data.filter((d) => d.type === "stock"),
      gold: data.filter((d) => d.type === "gold"),
      forex: data.filter((d) => d.type === "currency"),
    };
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch market data" });
  }
});

export default router;
