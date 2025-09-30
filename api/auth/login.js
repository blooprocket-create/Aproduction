import { query } from '../_utils/db.js';
import { signJwt, cookieHeaderFromToken } from '../_utils/jwt.js';
import crypto from 'crypto';

function verify(pw, stored){
  const [saltHex, hashHex] = stored.split('.');
  return new Promise((resolve, reject) => {
    crypto.scrypt(pw, Buffer.from(saltHex, 'hex'), 64, (err, dk) => err ? reject(err) : resolve(crypto.timingSafeEqual(Buffer.from(hashHex, 'hex'), dk)));
  });
}

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Use POST' });
  const { email, password } = req.body || {};
  const r = await query('select id, email, password_hash, role from users where email=$1', [String(email||'').toLowerCase()]);
  if (!r.rowCount) return res.status(401).json({ ok:false, error:'Invalid credentials' });
  const u = r.rows[0];
  const okPw = await verify(password||'', u.password_hash).catch(() => false);
  if (!okPw) return res.status(401).json({ ok:false, error:'Invalid credentials' });
  const token = signJwt({ id: u.id, email: u.email, role: u.role });
  res.setHeader('Set-Cookie', cookieHeaderFromToken(token));
  return res.status(200).json({ ok:true, data: { id: u.id, email: u.email, role: u.role } });
}
