import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { businessesTable, transactionsTable, usersTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res) => {
  const businesses = await db.select().from(businessesTable).where(eq(businessesTable.userId, req.userId!));
  res.json(businesses);
});

router.post("/", async (req: AuthRequest, res) => {
  const { businessName, industry } = req.body as { businessName: string; industry?: string };
  if (!businessName) return res.status(400).json({ error: "businessName required" });
  const [biz] = await db.insert(businessesTable).values({ userId: req.userId!, businessName, industry }).returning();
  res.status(201).json(biz);
});

router.get("/:id/transactions", async (req: AuthRequest, res) => {
  const bizId = parseInt(req.params.id);
  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, bizId));
  if (!biz || biz.userId !== req.userId!) return res.status(404).json({ error: "Not found" });
  const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.businessId, bizId)).orderBy(desc(transactionsTable.date));
  res.json(txs);
});

router.post("/:id/transactions", async (req: AuthRequest, res) => {
  const bizId = parseInt(req.params.id);
  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, bizId));
  if (!biz || biz.userId !== req.userId!) return res.status(404).json({ error: "Not found" });
  const { type, category, amount, description, date } = req.body as { type: "income" | "expense"; category: string; amount: number; description: string; date: string };
  const [tx] = await db.insert(transactionsTable).values({ businessId: bizId, userId: req.userId!, type, category: category as any, amount, description, date: new Date(date) }).returning();
  res.status(201).json(tx);
});

router.get("/:id/summary", async (req: AuthRequest, res) => {
  const bizId = parseInt(req.params.id);
  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, bizId));
  if (!biz || biz.userId !== req.userId!) return res.status(404).json({ error: "Not found" });
  const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.businessId, bizId));
  const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const byCategory: Record<string, number> = {};
  for (const t of txs) byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  res.json({ income, expenses, profit: income - expenses, byCategory, transactionCount: txs.length });
});

router.patch("/mode", async (req: AuthRequest, res) => {
  const { businessMode } = req.body as { businessMode: boolean };
  const [updated] = await db.update(usersTable).set({ businessMode }).where(eq(usersTable.id, req.userId!)).returning();
  res.json({ businessMode: updated.businessMode });
});

export default router;
