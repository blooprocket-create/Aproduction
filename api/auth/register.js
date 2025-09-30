import { query } from '../_utils/db.js';
import { signJwt, cookieHeaderFromToken } from '../_utils/jwt.js';
import crypto from 'crypto';

function hashPassword(pw){
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(pw, salt, 64, (err, dk) => err ? reject(err) : resolve(`${salt.toString('hex')}.${dk.toString('hex')}`));
  });
}

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Use POST' });
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok:false, error:'Email and password required' });
  const hash = await hashPassword(password);
  try {
    const r = await query('insert into users (email, password_hash, role) values ($1,$2,$3) returning id, email, role', [String(email).toLowerCase(), hash, 'customer']);
    const user = r.rows[0];
    const token = signJwt(user);
    res.setHeader('Set-Cookie', cookieHeaderFromToken(token));
    return res.status(200).json({ ok:true, data:user });
  } catch (e) {
    if ((e.message||'').includes('duplicate key')) return res.status(400).json({ ok:false, error:'Email already registered' });
    return res.status(500).json({ ok:false, error:'Registration failed' });
  }
}
