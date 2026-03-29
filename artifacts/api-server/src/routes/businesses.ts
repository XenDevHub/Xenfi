import { Router } from 'express';
import pool from '../lib/db.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/businesses', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, type, color, icon, description FROM businesses WHERE user_id = $1 ORDER BY created_at ASC',
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/businesses', async (req: AuthRequest, res) => {
  try {
    const { name, type = 'General', color = '#D4AF37', icon = 'briefcase', description = '' } = req.body;
    if (!name) { res.status(400).json({ error: 'name required' }); return; }
    const result = await pool.query(
      'INSERT INTO businesses (user_id, name, type, color, icon, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, type, color, icon, description',
      [req.user!.id, name, type, color, icon, description]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/businesses/:id', async (req: AuthRequest, res) => {
  try {
    const { name, type, color, icon, description } = req.body;
    const result = await pool.query(
      `UPDATE businesses SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        color = COALESCE($3, color),
        icon = COALESCE($4, icon),
        description = COALESCE($5, description)
      WHERE id = $6 AND user_id = $7
      RETURNING id, name, type, color, icon, description`,
      [name, type, color, icon, description, req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/businesses/:id', async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM businesses WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/businesses/:id/summary', async (req: AuthRequest, res) => {
  try {
    const bizId = parseInt(req.params.id);
    const bizRes = await pool.query('SELECT * FROM businesses WHERE id = $1 AND user_id = $2', [bizId, req.user!.id]);
    if (bizRes.rows.length === 0) { res.status(404).json({ error: 'Not found' }); return; }

    const expRes = await pool.query(
      `SELECT tx_type, SUM(amount)::float as total, category
       FROM expenses WHERE user_id = $1 AND entity_type = 'business' AND entity_id = $2
       GROUP BY tx_type, category`,
      [req.user!.id, bizId]
    );

    let income = 0, expenses = 0;
    const breakdown: Record<string, number> = {};
    expRes.rows.forEach((r: any) => {
      if (r.tx_type === 'income') income += r.total;
      else { expenses += r.total; breakdown[r.category] = (breakdown[r.category] || 0) + r.total; }
    });

    res.json({
      business: bizRes.rows[0],
      summary: { income, expenses, balance: income - expenses, breakdown },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
