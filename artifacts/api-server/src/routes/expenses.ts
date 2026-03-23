import { Router } from "express";
import { db, expensesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const expenses = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.userId, req.userId!));
    res.json(expenses);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  const { amount, category, description, date } = req.body;
  if (!amount || !category || !description || !date) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  try {
    const [expense] = await db
      .insert(expensesTable)
      .values({
        userId: req.userId!,
        amount,
        category,
        description,
        date: new Date(date),
      })
      .returning();
    res.status(201).json(expense);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  try {
    await db
      .delete(expensesTable)
      .where(and(eq(expensesTable.id, id), eq(expensesTable.userId, req.userId!)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
