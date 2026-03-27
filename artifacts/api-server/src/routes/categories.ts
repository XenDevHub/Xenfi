import { Router } from 'express';
import pool from '../lib/db.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/categories', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, icon, color, tx_type as "txType" FROM categories WHERE user_id = $1 ORDER BY created_at ASC',
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/categories', async (req: AuthRequest, res) => {
  try {
    const { name, icon = 'tag', color = '#D4AF37', txType = 'expense' } = req.body;
    if (!name) { res.status(400).json({ error: 'name required' }); return; }
    const result = await pool.query(
      'INSERT INTO categories (user_id, name, icon, color, tx_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, icon, color, tx_type as "txType"',
      [req.user!.id, name, icon, color, txType]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/categories/:id', async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
