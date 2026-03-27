import { Router } from 'express';
import bcrypt from 'bcrypt';
import pool from '../lib/db.js';
import { signToken } from '../lib/jwt.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();

router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email and password are required' });
      return;
    }
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, is_premium, role, business_mode, created_at',
      [name, email, passwordHash]
    );
    const user = result.rows[0];
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isPremium: user.is_premium,
        role: user.role,
        businessMode: user.business_mode,
        createdAt: user.created_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isPremium: user.is_premium,
        role: user.role,
        businessMode: user.business_mode,
        createdAt: user.created_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/auth/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, is_premium, role, business_mode, created_at FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const u = result.rows[0];
    res.json({
      id: u.id,
      name: u.name,
      email: u.email,
      isPremium: u.is_premium,
      role: u.role,
      businessMode: u.business_mode,
      createdAt: u.created_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
