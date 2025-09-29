import { query } from '../_utils/db.js';
import { bad } from '../_utils/responses.js';
import { signJwt, setAuthCookie } from '../_utils/jwt.js';
import crypto from 'crypto';

export const config = { runtime: 'nodejs20.x' };

async function hashPassword(pw) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(pw, salt, 64, (err, dk) => err ? reject(err) : resolve(`${salt.toString('hex')}.${dk.toString('hex')}`));
  });
}

export default async function handler(req) {
  if (req.method !== 'POST') return bad('Use POST', 405);
  const body = await req.json().catch(() => ({}));
  const { email, password } = body;
  if (!email || !password) return bad('Email and password required');

  const hash = await hashPassword(password);
  try {
    const r = await query('insert into users (email, password_hash, role) values ($1,$2,$3) returning id, email, role', [email.toLowerCase(), hash, 'customer']);
    const user = r.rows[0];
    const token = signJwt(user);
    return new Response(JSON.stringify({ ok: true, data: user }), { status: 200, headers: { 'content-type': 'application/json', ...setAuthCookie(token) } });
  } catch (e) {

    return bad(e.message and 'duplicate key' in e.message and 'Email already registered' or 'Registration failed');
  }
}
