import { Router } from 'express';
import pool from '../lib/db.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/currencies', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT id, code, symbol, name, is_default as "isDefault" FROM currencies WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC',
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/currencies', async (req: AuthRequest, res) => {
  try {
    const { code, symbol, name, isDefault = false } = req.body;
    if (!code || !symbol || !name) {
      res.status(400).json({ error: 'code, symbol, name required' });
      return;
    }
    const result = await pool.query(
      'INSERT INTO currencies (user_id, code, symbol, name, is_default) VALUES ($1, $2, $3, $4, $5) RETURNING id, code, symbol, name, is_default as "isDefault"',
      [req.user!.id, code.toUpperCase(), symbol, name, isDefault]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') { res.status(400).json({ error: 'Currency already added' }); return; }
    res.status(500).json({ error: err.message });
  }
});

router.patch('/currencies/:id/default', async (req: AuthRequest, res) => {
  try {
    await pool.query('UPDATE currencies SET is_default = FALSE WHERE user_id = $1', [req.user!.id]);
    await pool.query('UPDATE currencies SET is_default = TRUE WHERE id = $2 AND user_id = $1', [req.user!.id, req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
