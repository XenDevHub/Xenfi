import { Router } from 'express';
import pool from '../lib/db.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/categories', async (req: AuthRequest, res) => {
  try {
    const { entityType, entityId } = req.query;
    let query = `SELECT id, name, icon, color, tx_type as "txType", entity_type as "entityType", entity_id as "entityId"
      FROM categories WHERE user_id = $1`;
    const params: any[] = [req.user!.id];

    if (entityType) {
      params.push(entityType);
      query += ` AND entity_type = $${params.length}`;
    }
    if (entityId) {
      params.push(parseInt(entityId as string));
      query += ` AND entity_id = $${params.length}`;
    }
    query += ' ORDER BY created_at ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/categories', async (req: AuthRequest, res) => {
  try {
    const { name, icon = 'tag', color = '#D4AF37', txType = 'expense', entityType = 'personal', entityId = null } = req.body;
    if (!name) { res.status(400).json({ error: 'name required' }); return; }
    const result = await pool.query(
      `INSERT INTO categories (user_id, name, icon, color, tx_type, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, icon, color, tx_type as "txType", entity_type as "entityType", entity_id as "entityId"`,
      [req.user!.id, name, icon, color, txType, entityType, entityId]
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
