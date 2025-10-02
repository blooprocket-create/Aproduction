import { query } from '../../utils/db.js';
import { signJwt, cookieHeaderFromToken } from '../../utils/jwt.js';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Use POST' });
  }

  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const pw = String(password || '');

  if (!normalizedEmail || !pw) {
    return res.status(400).json({ ok: false, error: 'Email and password required' });
  }
  if (pw.length < 8) {
    return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters long' });
  }

  let hash;
  try {
    hash = await hashPassword(pw);
  } catch {
    return res.status(500).json({ ok: false, error: 'Failed to hash password' });
  }

  try {
    const result = await query(
      'insert into users (email, password_hash, role) values ($1,$2,$3) returning id, email, role',
      [normalizedEmail, hash, 'customer']
    );
    const user = result.rows[0];
    const token = signJwt(user);
    res.setHeader('Set-Cookie', cookieHeaderFromToken(token));
    return res.status(200).json({ ok: true, data: user });
  } catch (error) {
    const message = (error?.message || '').toLowerCase();
    if (message.includes('duplicate key')) {
      return res.status(400).json({ ok: false, error: 'Email already registered' });
    }
    return res.status(500).json({ ok: false, error: 'Registration failed' });
  }
}

