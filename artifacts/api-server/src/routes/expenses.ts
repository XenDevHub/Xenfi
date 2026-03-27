import { Router } from 'express';
import pool from '../lib/db.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/expenses', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT id, tx_type as "txType", amount::float, category, currency, description, date FROM expenses WHERE user_id = $1 ORDER BY date DESC',
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/expenses', async (req: AuthRequest, res) => {
  try {
    const { amount, category, description, date, txType = 'expense', currency = 'USD' } = req.body;
    if (!amount || !category) {
      res.status(400).json({ error: 'amount and category required' });
      return;
    }
    const result = await pool.query(
      'INSERT INTO expenses (user_id, tx_type, amount, category, currency, description, date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, tx_type as "txType", amount::float, category, currency, description, date',
      [req.user!.id, txType, amount, category, currency, description || category, date || new Date()]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/expenses/:id', async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
