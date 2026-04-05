import { Router } from 'express';
import pool from '../lib/db.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

/**
 * Helper to normalize name keys from frontend (handles personName, person_name, or name)
 */
function pickPersonName(body: Record<string, unknown>): string | undefined {
  const v = body.person_name ?? body.personName ?? body.name;
  return typeof v === 'string' ? v : undefined;
}

/**
 * Helper to normalize date keys from frontend (handles dueDate or due_date)
 */
function pickDueDate(body: Record<string, unknown>): any {
  return body.due_date ?? body.dueDate ?? null;
}

router.get('/loans', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT id, person_name AS "personName", type, amount::float, due_date AS "dueDate", status
       FROM loans WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/loans', async (req: AuthRequest, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const personName = pickPersonName(body);
    const type = (body.type as string) || 'given';
    const amount = body.amount;
    const dueDate = pickDueDate(body); // Fixed: Check both snake_case and camelCase
    const status = (body.status as string) || 'pending';

    if (!personName || amount === undefined || amount === null) {
      res.status(400).json({ error: 'person_name and amount required' });
      return;
    }

    if (type !== 'given' && type !== 'received') {
      res.status(400).json({ error: 'type must be given or received' });
      return;
    }

    // Explicitly mapping to the new database columns you created
    const result = await pool.query(
      `INSERT INTO loans (user_id, person_name, type, amount, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, person_name AS "personName", type, amount::float, due_date AS "dueDate", status`,
      [req.user!.id, personName, type, amount, dueDate, status]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    // If database columns still mismatch, this error message will tell us exactly why
    res.status(500).json({ error: err.message });
  }
});

router.put('/loans/:id', async (req: AuthRequest, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const personName = pickPersonName(body);
    const dueDate = pickDueDate(body);
    const type = body.type as string | undefined;
    const amount = body.amount as number | undefined;
    const status = body.status as string | undefined;

    const result = await pool.query(
      `UPDATE loans SET
        person_name = COALESCE($1, person_name),
        type = COALESCE($2, type),
        amount = COALESCE($3, amount),
        due_date = COALESCE($4, due_date),
        status = COALESCE($5, status)
      WHERE id = $6 AND user_id = $7
      RETURNING id, person_name AS "personName", type, amount::float, due_date AS "dueDate", status`,
      [
        personName ?? null,
        type ?? null,
        amount ?? null,
        dueDate ?? null,
        status ?? null,
        req.params.id,
        req.user!.id,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
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