import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { currenciesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res) => {
  const rows = await db.select().from(currenciesTable).where(eq(currenciesTable.userId, req.userId!));
  res.json(rows);
});

router.post("/", async (req: AuthRequest, res) => {
  const { code, symbol, name, isDefault } = req.body as { code: string; symbol: string; name: string; isDefault?: boolean };
  if (!code || !symbol || !name) return res.status(400).json({ error: "code, symbol, name required" });

  if (isDefault) {
    await db.update(currenciesTable).set({ isDefault: false }).where(eq(currenciesTable.userId, req.userId!));
  }

  const existing = await db.select().from(currenciesTable).where(and(eq(currenciesTable.userId, req.userId!), eq(currenciesTable.code, code.toUpperCase())));
  if (existing.length > 0) return res.status(409).json({ error: "Currency already added" });

  const [cur] = await db.insert(currenciesTable).values({
    userId: req.userId!,
    code: code.toUpperCase(),
    symbol,
    name,
    isDefault: isDefault ?? false,
  }).returning();
  res.status(201).json(cur);
});

router.patch("/:id/default", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  await db.update(currenciesTable).set({ isDefault: false }).where(eq(currenciesTable.userId, req.userId!));
  const [cur] = await db.update(currenciesTable).set({ isDefault: true }).where(and(eq(currenciesTable.id, id), eq(currenciesTable.userId, req.userId!))).returning();
  res.json(cur);
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  await db.delete(currenciesTable).where(and(eq(currenciesTable.id, id), eq(currenciesTable.userId, req.userId!)));
  res.status(204).end();
});

export default router;
