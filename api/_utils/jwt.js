import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const COOKIE = process.env.COOKIE_NAME || 'auth';
const SEC = process.env.JWT_SECRET;

export function signJwt(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, SEC, { expiresIn: '7d' });
}

function getCookieHeader(req){
  if (!req) return null;
  if (typeof req.headers?.get === 'function') return req.headers.get('cookie') || null;
  if (req.headers && typeof req.headers === 'object') return req.headers.cookie || null;
  return null;
}

export function readAuth(req) {
  const hdr = getCookieHeader(req);
  if (!hdr) return null;
  const c = cookie.parse(hdr || '');
  if (!c[COOKIE]) return null;
  try { return jwt.verify(c[COOKIE], SEC); } catch { return null; }
}

export function cookieHeaderFromToken(token){
  return cookie.serialize(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
}
export function clearCookieHeader(){
  return cookie.serialize(COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 0 });
}
