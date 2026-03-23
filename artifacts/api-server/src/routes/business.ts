import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { db } from "@workspace/db";
import { businessesTable, transactionsTable, usersTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();
router.use(authenticateToken);

router.get("/", async (req, res) => {
  const businesses = await db.select().from(businessesTable).where(eq(businessesTable.userId, req.user!.userId));
  res.json(businesses);
});

router.post("/", async (req, res) => {
  const { businessName, industry } = req.body as { businessName: string; industry?: string };
  if (!businessName) return res.status(400).json({ error: "businessName required" });

  const [biz] = await db.insert(businessesTable).values({
    userId: req.user!.userId,
    businessName,
    industry,
  }).returning();
  res.status(201).json(biz);
});

router.get("/:id/transactions", async (req, res) => {
  const bizId = parseInt(req.params.id);
  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, bizId));
  if (!biz || biz.userId !== req.user!.userId) return res.status(404).json({ error: "Not found" });

  const txs = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.businessId, bizId))
    .orderBy(desc(transactionsTable.date));
  res.json(txs);
});

router.post("/:id/transactions", async (req, res) => {
  const bizId = parseInt(req.params.id);
  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, bizId));
  if (!biz || biz.userId !== req.user!.userId) return res.status(404).json({ error: "Not found" });

  const { type, category, amount, description, date } = req.body as {
    type: "income" | "expense";
    category: string;
    amount: number;
    description: string;
    date: string;
  };

  const [tx] = await db.insert(transactionsTable).values({
    businessId: bizId,
    userId: req.user!.userId,
    type,
    category: category as any,
    amount,
    description,
    date: new Date(date),
  }).returning();
  res.status(201).json(tx);
});

router.get("/:id/summary", async (req, res) => {
  const bizId = parseInt(req.params.id);
  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, bizId));
  if (!biz || biz.userId !== req.user!.userId) return res.status(404).json({ error: "Not found" });

  const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.businessId, bizId));

  const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = income - expenses;

  const byCategory: Record<string, number> = {};
  for (const t of txs) byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;

  res.json({ income, expenses, profit, byCategory, transactionCount: txs.length });
});

router.patch("/mode", async (req, res) => {
  const { businessMode } = req.body as { businessMode: boolean };
  const [updated] = await db.update(usersTable)
    .set({ businessMode })
    .where(eq(usersTable.id, req.user!.userId))
    .returning();
  res.json({ businessMode: updated.businessMode });
});

export default router;
