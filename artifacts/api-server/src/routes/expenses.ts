import { Router } from 'express';
import pool from '../lib/db.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/expenses', async (req: AuthRequest, res) => {
  try {
    const { entityType, entityId } = req.query;
    let query = `SELECT id, tx_type as "txType", amount::float, category, currency, description, date, entity_type as "entityType", entity_id as "entityId"
      FROM expenses WHERE user_id = $1`;
    const params: any[] = [req.user!.id];

    if (entityType) {
      params.push(entityType);
      query += ` AND entity_type = $${params.length}`;
    }
    if (entityId) {
      params.push(parseInt(entityId as string));
      query += ` AND entity_id = $${params.length}`;
    }
    query += ' ORDER BY date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/expenses', async (req: AuthRequest, res) => {
  try {
    const { amount, category, description, date, txType = 'expense', currency = 'USD', entityType = 'personal', entityId = null } = req.body;
    if (!amount || !category) {
      res.status(400).json({ error: 'amount and category required' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO expenses (user_id, tx_type, amount, category, currency, description, date, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, tx_type as "txType", amount::float, category, currency, description, date, entity_type as "entityType", entity_id as "entityId"`,
      [req.user!.id, txType, amount, category, currency, description || category, date || new Date(), entityType, entityId]
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
