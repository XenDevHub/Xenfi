import { Router } from 'express';
import pool from '../lib/db.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

router.patch('/business/mode', async (req: AuthRequest, res) => {
  try {
    const { businessMode } = req.body;
    if (typeof businessMode !== 'boolean') {
      res.status(400).json({ error: 'businessMode must be boolean' });
      return;
    }
    await pool.query('UPDATE users SET business_mode = $1 WHERE id = $2', [businessMode, req.user!.id]);
    res.json({ ok: true, businessMode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
