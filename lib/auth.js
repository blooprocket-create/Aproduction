import { verifyJWT, signJWT } from './jwt.js';

export function getUser(req){
  try{
    const cookies = req.headers.cookie || '';
    const m = cookies.match(/(?:^|; )token=([^;]+)/);
    if (!m) return null;
    const token = decodeURIComponent(m[1]);
    const user = verifyJWT(token, process.env.JWT_SECRET || 'dev-secret');
    return user; // { id, email, role, exp }
  }catch{ return null }
}

export function requireUser(req, res){
  const u = getUser(req);
  if (!u){
    res.statusCode = 401;
    res.setHeader('content-type','application/json');
    res.end(JSON.stringify({ ok:false, error:'Unauthorized' }));
    return null;
  }
  return u;
}

export function setTokenCookie(res, user){
  const token = signJWT({ id:user.id, email:user.email, role:user.role||'customer' }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '30d' });
  const cookie = [
    `token=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=2592000',
    // omit 'Secure' for local dev; Vercel prod will add via edge if needed. Add if you want:
    // 'Secure'
  ].join('; ');
  res.setHeader('Set-Cookie', cookie);
}

export function clearTokenCookie(res){
  const cookie = [
    'token=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ].join('; ');
  res.setHeader('Set-Cookie', cookie);
}
