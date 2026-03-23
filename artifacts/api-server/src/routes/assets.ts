import { Router } from "express";
import { db, assetsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

const FREE_ASSET_LIMIT = 3;

router.get("/", async (req: AuthRequest, res) => {
  try {
    const assets = await db
      .select()
      .from(assetsTable)
      .where(eq(assetsTable.userId, req.userId!));
    res.json(assets);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  const { type, name, value, purchaseValue } = req.body;
  if (!type || !name || value == null || purchaseValue == null) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

    if (!user?.isPremium) {
      const existing = await db
        .select()
        .from(assetsTable)
        .where(eq(assetsTable.userId, req.userId!));
      if (existing.length >= FREE_ASSET_LIMIT) {
        res.status(403).json({
          error: `Free plan limited to ${FREE_ASSET_LIMIT} assets. Upgrade to Pro for unlimited.`,
        });
        return;
      }
    }

    const [asset] = await db
      .insert(assetsTable)
      .values({ userId: req.userId!, type, name, value, purchaseValue })
      .returning();
    res.status(201).json(asset);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const { name, value, purchaseValue } = req.body;
  try {
    const [asset] = await db
      .update(assetsTable)
      .set({ name, value, purchaseValue })
      .where(and(eq(assetsTable.id, id), eq(assetsTable.userId, req.userId!)))
      .returning();
    if (!asset) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }
    res.json(asset);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  try {
    await db
      .delete(assetsTable)
      .where(and(eq(assetsTable.id, id), eq(assetsTable.userId, req.userId!)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
