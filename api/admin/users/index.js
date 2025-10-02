import { query } from '../../_utils/db.js';
import { readAuth } from '../../_utils/jwt.js';
import bcrypt from 'bcryptjs';

async function requireAdmin(req, res) {
  const user = readAuth(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ ok: false, error: 'Forbidden' });
    return null;
  }
  return user;
}

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    try {
      const result = await query('select id, email, role, created_at from users order by created_at desc');
      return res.status(200).json({ ok: true, data: result.rows });
    } catch (error) {
      return res.status(500).json({ ok: false, error: 'Failed to load users' });
    }
  }

  if (req.method === 'POST') {
    const { email, password, role = 'customer' } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password required' });
    }
    if (!['admin', 'editor', 'customer'].includes(role)) {
      return res.status(400).json({ ok: false, error: 'Invalid role' });
    }
    try {
      const hash = await bcrypt.hash(String(password), 12);
      const normalizedEmail = String(email).trim().toLowerCase();
      const result = await query(
        'insert into users (email, password_hash, role) values ($1,$2,$3) returning id, email, role, created_at',
        [normalizedEmail, hash, role]
      );
      return res.status(200).json({ ok: true, data: result.rows[0] });
    } catch (error) {
      if ((error.message || '').toLowerCase().includes('duplicate')) {
        return res.status(400).json({ ok: false, error: 'Email already exists' });
      }
      return res.status(500).json({ ok: false, error: 'Failed to create user' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
