import { Router } from 'express';
import pool from '../lib/db.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/loans', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, type, amount::float, due_date as "dueDate", status FROM loans WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/loans', async (req: AuthRequest, res) => {
  try {
    const { name, type = 'given', amount, dueDate, status = 'pending' } = req.body;
    if (!name || !amount) { res.status(400).json({ error: 'name and amount required' }); return; }
    const result = await pool.query(
      'INSERT INTO loans (user_id, name, type, amount, due_date, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, type, amount::float, due_date as "dueDate", status',
      [req.user!.id, name, type, amount, dueDate || null, status]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/loans/:id', async (req: AuthRequest, res) => {
  try {
    const { name, type, amount, dueDate, status } = req.body;
    const result = await pool.query(
      `UPDATE loans SET 
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        amount = COALESCE($3, amount),
        due_date = COALESCE($4, due_date),
        status = COALESCE($5, status)
      WHERE id = $6 AND user_id = $7
      RETURNING id, name, type, amount::float, due_date as "dueDate", status`,
      [name, type, amount, dueDate, status, req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/loans/:id', async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM loans WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
