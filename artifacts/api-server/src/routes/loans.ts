import { Router } from "express";
import { db, loansTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const loans = await db
      .select()
      .from(loansTable)
      .where(eq(loansTable.userId, req.userId!));
    res.json(loans);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  const { name, type, amount, dueDate, status } = req.body;
  if (!name || !type || !amount || !dueDate) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  try {
    const [loan] = await db
      .insert(loansTable)
      .values({
        userId: req.userId!,
        name,
        type,
        amount,
        dueDate: new Date(dueDate),
        status: status ?? "pending",
      })
      .returning();
    res.status(201).json(loan);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const { name, amount, dueDate, status } = req.body;
  try {
    const [loan] = await db
      .update(loansTable)
      .set({
        name,
        amount,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status,
      })
      .where(and(eq(loansTable.id, id), eq(loansTable.userId, req.userId!)))
      .returning();
    if (!loan) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }
    res.json(loan);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  try {
    await db
      .delete(loansTable)
      .where(and(eq(loansTable.id, id), eq(loansTable.userId, req.userId!)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
