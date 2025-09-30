// api/auth/[...all].js
import { query } from '../../lib/db.js';
import { getUser, setTokenCookie, clearTokenCookie } from '../../lib/auth.js';
import crypto from 'crypto';

function send(res, code, data){ res.statusCode=code; res.setHeader('content-type','application/json'); res.end(JSON.stringify(data)); }
async function body(req){ return await new Promise(r=>{ let s=''; req.on('data',d=>s+=d); req.on('end',()=>r(s)); }); }
function json(b){ try{ return b?JSON.parse(b):{} }catch{ return {} } }
function path(req){ try{ return new URL(req.url,'http://x').pathname.replace(/^\/api\/auth/, '') || '/'; } catch { return '/'; } }

function hashPassword(pw, salt){
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex');
  return `pbkdf2$${salt}$${hash}`;
}
function verifyPassword(pw, stored){
  if (!stored) return false;
  if (stored.startsWith('pbkdf2$')){
    const [,salt,expect] = stored.split('$');
    const calc = crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex');
    try{ return crypto.timingSafeEqual(Buffer.from(calc,'hex'), Buffer.from(expect,'hex')); } catch { return false; }
  }
  return pw === stored; // legacy plaintext
}

export default async function handler(req, res){
  const p = path(req);
  const method = req.method || 'GET';

  // /api/auth/login
  if (p === '/login' && method === 'POST'){
    const b = json(await body(req));
    const email = (b.email||'').trim().toLowerCase(); const password = String(b.password||'');
    if (!email || !password) return send(res, 400, { ok:false, error:'Email and password required' });
    const r = await query(`SELECT * FROM users WHERE email=$1 LIMIT 1`, [email]);
    const u = r.rows[0]; if (!u) return send(res, 401, { ok:false, error:'Invalid credentials' });
    const stored = u.password_hash ?? u.password;
    if (!verifyPassword(password, stored)) return send(res, 401, { ok:false, error:'Invalid credentials' });

    // upgrade legacy plaintext to pbkdf2
    if (!String(stored).startsWith('pbkdf2$')){
      const newHash = hashPassword(password);
      try{
        if ('password_hash' in u) await query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [newHash, u.id]);
        else await query(`UPDATE users SET password=$1 WHERE id=$2`, [newHash, u.id]);
      }catch{}
    }
    const out = { id: u.id, email: u.email, role: u.role || 'customer' };
    setTokenCookie(res, out);
    return send(res, 200, { ok:true, data: out });
  }

  // /api/auth/register
  if (p === '/register' && method === 'POST'){
    const b = json(await body(req));
    const email = (b.email||'').trim().toLowerCase(); const password = String(b.password||'');
    if (!email || !password) return send(res, 400, { ok:false, error:'Email and password required' });

    const hashed = hashPassword(password);
    let row;
    try{
      const r = await query(`INSERT INTO users (email, password_hash, role) VALUES ($1,$2,'customer') RETURNING id,email,role`, [email, hashed]);
      row = r.rows[0];
    }catch(e1){
      // fallback if only 'password' column exists
      try{
        const r2 = await query(`INSERT INTO users (email, password, role) VALUES ($1,$2,'customer') RETURNING id,email,role`, [email, hashed]);
        row = r2.rows[0];
      }catch(e2){
        if (String(e2.code) === '23505') return send(res, 409, { ok:false, error:'Email already registered' });
        return send(res, 500, { ok:false, error:'Register failed' });
      }
    }
    setTokenCookie(res, row);
    return send(res, 200, { ok:true, data: row });
  }

  // /api/auth/logout
  if (p === '/logout' && method === 'POST'){
    clearTokenCookie(res);
    return send(res, 200, { ok:true, data: true });
  }

  // /api/auth/me
  if (p === '/me' && method === 'GET'){
    const me = getUser(req);
    if (!me) return send(res, 401, { ok:false, error:'Unauthorized' });
    return send(res, 200, { ok:true, data: me });
  }

  return send(res, 404, { ok:false, error:'Not Found' });
}
