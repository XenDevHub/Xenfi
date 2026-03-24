import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res) => {
  const rows = await db.select().from(categoriesTable).where(eq(categoriesTable.userId, req.userId!));
  res.json(rows);
});

router.post("/", async (req: AuthRequest, res) => {
  const { name, icon, color, txType } = req.body as { name: string; icon: string; color: string; txType: string };
  if (!name) return res.status(400).json({ error: "name required" });
  const [cat] = await db.insert(categoriesTable).values({
    userId: req.userId!,
    name,
    icon: icon || "tag",
    color: color || "#D4AF37",
    txType: txType || "expense",
    isCustom: true,
  }).returning();
  res.status(201).json(cat);
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  await db.delete(categoriesTable).where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, req.userId!)));
  res.status(204).end();
});

export default router;
