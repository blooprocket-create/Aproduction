import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const COOKIE = process.env.COOKIE_NAME || 'auth';
const SEC = process.env.JWT_SECRET;

export function signJwt(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, SEC, { expiresIn: '7d' });
}

export function readAuth(req) {
  const hdr = req.headers.get('cookie');
  if (!hdr) return null;
  const c = cookie.parse(hdr || '');
  if (!c[COOKIE]) return null;
  try { return jwt.verify(c[COOKIE], SEC); } catch { return null; }
}

export function setAuthCookie(token) {
  const c = cookie.serialize(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
  return { 'set-cookie': c };
}

export function clearAuthCookie() {
  const c = cookie.serialize(COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 0 });
  return { 'set-cookie': c };
}
