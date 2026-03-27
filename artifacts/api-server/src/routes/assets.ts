import { Router } from 'express';
import pool from '../lib/db.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/assets', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT id, type, name, value::float, purchase_value::float as "purchaseValue" FROM assets WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/assets', async (req: AuthRequest, res) => {
  try {
    const { type, name, value, purchaseValue } = req.body;
    if (!type || !name || value == null || purchaseValue == null) {
      res.status(400).json({ error: 'type, name, value, purchaseValue required' });
      return;
    }
    const result = await pool.query(
      'INSERT INTO assets (user_id, type, name, value, purchase_value) VALUES ($1, $2, $3, $4, $5) RETURNING id, type, name, value::float, purchase_value::float as "purchaseValue"',
      [req.user!.id, type, name, value, purchaseValue]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/assets/:id', async (req: AuthRequest, res) => {
  try {
    const { name, value, purchaseValue } = req.body;
    const result = await pool.query(
      'UPDATE assets SET name = COALESCE($1, name), value = COALESCE($2, value), purchase_value = COALESCE($3, purchase_value) WHERE id = $4 AND user_id = $5 RETURNING id, type, name, value::float, purchase_value::float as "purchaseValue"',
      [name, value, purchaseValue, req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/assets/:id', async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM assets WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
