import { query } from '../_utils/db.js';
import { signJwt, cookieHeaderFromToken } from '../_utils/jwt.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const SCRYPT_KEYLEN = 64;

function verifyScrypt(password, stored) {
  const parts = (stored || '').split('.');
  if (parts.length !== 2) return Promise.resolve(false);
  const [saltHex, hashHex] = parts;
  if (!saltHex || !hashHex) return Promise.resolve(false);
  return new Promise((resolve) => {
    crypto.scrypt(password, Buffer.from(saltHex, 'hex'), SCRYPT_KEYLEN, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const hash = Buffer.from(hashHex, 'hex');
        resolve(hash.length === derivedKey.length && crypto.timingSafeEqual(hash, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

async function verifyPassword(password, stored) {
  if (!stored) return false;
  if (stored.startsWith('$2')) {
    try { return await bcrypt.compare(password, stored); }
    catch { return false; }
  }
  if (stored.includes('.')) {
    return await verifyScrypt(password, stored);
  }
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Use POST' });
  }

  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ ok: false, error: 'Email and password required' });
  }

  const result = await query('select id, email, password_hash, role from users where email=$1', [normalizedEmail]);
  if (!result.rowCount) {
    return res.status(401).json({ ok: false, error: 'Invalid credentials' });
  }

  const user = result.rows[0];
  const okPw = await verifyPassword(password, user.password_hash);
  if (!okPw) {
    return res.status(401).json({ ok: false, error: 'Invalid credentials' });
  }

  const token = signJwt({ id: user.id, email: user.email, role: user.role });
  res.setHeader('Set-Cookie', cookieHeaderFromToken(token));
  return res.status(200).json({ ok: true, data: { id: user.id, email: user.email, role: user.role } });
}
