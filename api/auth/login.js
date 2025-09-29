import { query } from '../_utils/db.js';
import { bad } from '../_utils/responses.js';
import { signJwt, setAuthCookie } from '../_utils/jwt.js';
import crypto from 'crypto';

async function verify(pw, stored) {
  const [saltHex, hashHex] = stored.split('.');
  return new Promise((resolve, reject) => {
    crypto.scrypt(pw, Buffer.from(saltHex, 'hex'), 64, (err, dk) => err ? reject(err) : resolve(crypto.timingSafeEqual(Buffer.from(hashHex, 'hex'), dk)));
  });
}

export default async function handler(req) {
  if (req.method !== 'POST') return bad('Use POST', 405);
  const { email, password } = await req.json();
  const r = await query('select id, email, password_hash, role from users where email=$1', [email.toLowerCase()]);
  if (!r.rowCount) return bad('Invalid credentials', 401);
  const u = r.rows[0];
  const okPw = await verify(password, u.password_hash).catch(() => false);
  if (!okPw) return bad('Invalid credentials', 401);
  const token = signJwt({ id: u.id, email: u.email, role: u.role });
  return new Response(JSON.stringify({ ok: true, data: { id: u.id, email: u.email, role: u.role } }), { status: 200, headers: { 'content-type': 'application/json', ...setAuthCookie(token) } });
}
