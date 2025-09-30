import { query } from '../lib/db.js';
import { getUser, requireUser, setTokenCookie, clearTokenCookie } from '../lib/auth.js';
import { isOwned } from '../lib/owned.js';
import crypto from 'crypto';

function send(res, code, data){ res.statusCode=code; res.setHeader('content-type','application/json'); res.end(JSON.stringify(data)); }
async function body(req){ return await new Promise(r=>{ let s=''; req.on('data',d=>s+=d); req.on('end',()=>r(s)); }); }
function json(b){ try{ return b?JSON.parse(b):{} }catch{ return {} } }
function path(req){ try{ const u=new URL(req.url, 'http://local'); return u.pathname.replace(/^\/api/, '')||'/' }catch{ return '/' } }
function q(req){ try{ const u=new URL(req.url,'http://local'); return Object.fromEntries(u.searchParams.entries()); }catch{ return {} } }

function hashPassword(pw, salt){
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex');
  return `pbkdf2$${salt}$${hash}`;
}
function verifyPassword(pw, stored){
  if (!stored || typeof stored !== 'string') return false;
  if (stored.startsWith('pbkdf2$')){
    const parts = stored.split('$');
    const salt = parts[1];
    const expect = parts[2];
    const calc = crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex');
    try{ return crypto.timingSafeEqual(Buffer.from(calc, 'hex'), Buffer.from(expect, 'hex')); } catch{ return false; }
  }
  return pw === stored;
}

export default async function handler(req, res){
  const p = path(req);
  const method = req.method || 'GET';
  const me = getUser(req);

  try{
    // health
    if (p==='/health'){ return send(res, 200, { ok:true, data:{ up:true } }); }

    // ---------- AUTH ----------
    if (p === '/auth/register' && method==='POST'){
      const b = json(await body(req));
      const email = (b.email||'').trim().toLowerCase();
      const password = String(b.password||'');
      if (!email || !password) return send(res, 400, { ok:false, error:'Email and password required' });

      const hashed = hashPassword(password);
      let row;
      try{
        const r = await query(`INSERT INTO users (email, password_hash, role) VALUES ($1,$2,'customer') RETURNING id,email,role`, [email, hashed]);
        row = r.rows[0];
      }catch(e1){
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

    if (p === '/auth/login' && method==='POST'){
      const b = json(await body(req));
      const email = (b.email||'').trim().toLowerCase();
      const password = String(b.password||'');
      if (!email || !password) return send(res, 400, { ok:false, error:'Email and password required' });

      const r = await query(`SELECT * FROM users WHERE email=$1 LIMIT 1`, [email]);
      const u = r.rows[0]; if (!u) return send(res, 401, { ok:false, error:'Invalid credentials' });
      const stored = u.password_hash ?? u.password;
      if (!verifyPassword(password, stored)) return send(res, 401, { ok:false, error:'Invalid credentials' });

      if (!String(stored).startsWith('pbkdf2$')){
        const newHash = hashPassword(password);
        try{
          if ('password_hash' in u){
            await query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [newHash, u.id]);
          } else if ('password' in u){
            await query(`UPDATE users SET password=$1 WHERE id=$2`, [newHash, u.id]);
          }
        }catch{}
      }
      const out = { id: u.id, email: u.email, role: u.role || 'customer' };
      setTokenCookie(res, out);
      return send(res, 200, { ok:true, data: out });
    }

    if (p === '/auth/logout' && method==='POST'){
      clearTokenCookie(res);
      return send(res, 200, { ok:true, data: true });
    }

    if (p === '/auth/me' && method==='GET'){
      if (!me) return send(res, 401, { ok:false, error:'Unauthorized' });
      return send(res, 200, { ok:true, data: me });
    }

    // ---------- PRODUCTS ----------
    if (p === '/products' && method==='GET'){
      const params = q(req);
      const showAll = params.all === '1' && me && ['admin','editor'].includes(me.role);
      const sql = showAll ? `SELECT * FROM products ORDER BY created_at DESC NULLS LAST` :
                            `SELECT * FROM products WHERE published=true ORDER BY created_at DESC NULLS LAST`;
      const { rows } = await query(sql);
      return send(res, 200, { ok:true, data: rows });
    }
    if (p === '/products' && method==='POST'){
      if (!me || !['admin','editor'].includes(me.role)) return send(res, 403, { ok:false, error:'Forbidden' });
      const b = json(await body(req));
      const { slug, title, description='', price_cents=0, published=false, kind='product' } = b;
      if (!slug || !title) return send(res, 400, { ok:false, error:'Missing slug/title' });
      const ins = await query(`INSERT INTO products (slug, title, description, price_cents, published, kind) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [slug, title, description, price_cents, published, kind]);
      return send(res, 200, { ok:true, data: ins.rows[0] });
    }
    if (p.startsWith('/products/') && method==='GET'){
      const id = p.split('/')[2];
      const { rows } = await query(`SELECT * FROM products WHERE id=$1`, [id]);
      const product = rows[0]; if (!product) return send(res, 404, { ok:false, error:'Not found' });
      const owned = me ? await isOwned(me.id, id) : false;
      let assets = [];
      try{
        if (owned){
          const a = await query(`SELECT id, label, file_key, mime_type, bytes, sort_index FROM product_assets WHERE product_id=$1 ORDER BY sort_index, created_at`, [id]);
          assets = a.rows;
        } else {
          const a = await query(`SELECT id, label, NULL as file_key, mime_type, bytes, sort_index FROM product_assets WHERE product_id=$1 ORDER BY sort_index, created_at`, [id]);
          assets = a.rows;
        }
      }catch{}
      return send(res, 200, { ok:true, data: { ...product, owned, assets } });
    }
    if (p.startsWith('/products/') && method==='PATCH'){
      if (!me || !['admin','editor'].includes(me.role)) return send(res, 403, { ok:false, error:'Forbidden' });
      const id = p.split('/')[2];
      const b = json(await body(req));
      const fields = ['slug','title','description','price_cents','published','kind'];
      const set = []; const vals = []; let i=1;
      for (const k of fields){ if (k in b){ set.push(`${k}=$${i++}`); vals.push(b[k]); } }
      if (!set.length) return send(res, 400, { ok:false, error:'No fields' });
      vals.push(id);
      const upd = await query(`UPDATE products SET ${set.join(',')} WHERE id=$${i} RETURNING *`, vals);
      return send(res, 200, { ok:true, data: upd.rows[0] });
    }

    // ---------- SERVICES ----------
    if (p === '/services' && method==='GET'){
      const params = q(req);
      const showAll = params.all === '1' && me && ['admin','editor'].includes(me.role);
      const sql = showAll ? `SELECT * FROM products WHERE kind='service' ORDER BY created_at DESC NULLS LAST` :
                            `SELECT * FROM products WHERE kind='service' AND published=true ORDER BY created_at DESC NULLS LAST`;
      const { rows } = await query(sql);
      return send(res, 200, { ok:true, data: rows });
    }
    if (p === '/services' && method==='POST'){
      if (!me || !['admin','editor'].includes(me.role)) return send(res, 403, { ok:false, error:'Forbidden' });
      const b = json(await body(req));
      const { slug, title, description='', price_cents=0, published=false } = b;
      if (!slug || !title) return send(res, 400, { ok:false, error:'Missing slug/title' });
      const ins = await query(`INSERT INTO products (slug, title, description, price_cents, published, kind) VALUES ($1,$2,$3,$4,$5,'service') RETURNING *`,
        [slug, title, description, price_cents, published]);
      return send(res, 200, { ok:true, data: ins.rows[0] });
    }
    if (p.startsWith('/services/') && method==='GET'){
      const id = p.split('/')[2];
      const { rows } = await query(`SELECT * FROM products WHERE id=$1 AND kind='service'`, [id]);
      const product = rows[0]; if (!product) return send(res, 404, { ok:false, error:'Not found' });
      const owned = me ? await isOwned(me.id, id) : false;
      return send(res, 200, { ok:true, data: { ...product, owned } });
    }
    if (p.startsWith('/services/') && method==='PATCH'){
      if (!me || !['admin','editor'].includes(me.role)) return send(res, 403, { ok:false, error:'Forbidden' });
      const id = p.split('/')[2];
      const b = json(await body(req));
      const fields = ['slug','title','description','price_cents','published'];
      const set = []; const vals = []; let i=1;
      for (const k of fields){ if (k in b){ set.push(`${k}=$${i++}`); vals.push(b[k]); } }
      if (!set.length) return send(res, 400, { ok:false, error:'No fields' });
      vals.push(id);
      const upd = await query(`UPDATE products SET ${set.join(',')} WHERE id=$${i} AND kind='service' RETURNING *`, vals);
      return send(res, 200, { ok:true, data: upd.rows[0] });
    }

    // ---------- ORDERS (mock) ----------
    if (p === '/orders' && method==='POST'){
      const u = requireUser(req, res); if (!u) return;
      const b = json(await body(req));
      const product_id = b.product_id;
      if (!product_id) return send(res, 400, { ok:false, error:'Missing product_id' });
      const pr = await query(`SELECT id FROM products WHERE id=$1`, [product_id]);
      if (!pr.rowCount) return send(res, 404, { ok:false, error:'Product not found' });
      try{ await query(`INSERT INTO entitlements (user_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [u.id, product_id]); }catch{}
      try{ await query(`INSERT INTO orders (user_id, product_id, status) VALUES ($1,$2,'paid') ON CONFLICT DO NOTHING`, [u.id, product_id]); }catch{}
      return send(res, 200, { ok:true, data: { product_id, granted: true } });
    }

    // ---------- ADMIN STATS ----------
    if (p === '/admin/stats' && method==='GET'){
      if (!me || !['admin','editor'].includes(me.role)) return send(res, 403, { ok:false, error:'Forbidden' });
      const users = await query(`SELECT COUNT(*) FROM users`).catch(()=>({ rows:[{ count:0 }] }));
      const published = await query(`SELECT COUNT(*) FROM products WHERE published=true`).catch(()=>({ rows:[{ count:0 }] }));
      const revenue = await query(`SELECT COALESCE(SUM(total_cents),0) AS cents FROM orders WHERE status='paid'`).catch(()=>({ rows:[{ cents:0 }] }));
      return send(res, 200, { ok:true, data: { users: String(users.rows[0].count||0), published: String(published.rows[0].count||0), revenue_cents: String(revenue.rows[0].cents||0) } });
    }

    // ---------- ME / ENTITLEMENTS ----------
    if (p === '/me/entitlements' && method==='GET'){
      const u = requireUser(req, res); if (!u) return;
      let rows = [];
      try{
        const r = await query(`
          SELECT p.* FROM entitlements e
          JOIN products p ON p.id = e.product_id
          WHERE e.user_id=$1
          ORDER BY p.created_at DESC NULLS LAST
        `, [u.id]);
        rows = r.rows;
      }catch{
        try{
          const r = await query(`
            SELECT p.* FROM orders o
            JOIN products p ON p.id = o.product_id
            WHERE o.user_id=$1 AND (o.status='paid' OR o.status IS NULL)
            ORDER BY p.created_at DESC NULLS LAST
          `, [u.id]);
          rows = r.rows;
        }catch{ rows = []; }
      }
      return send(res, 200, { ok:true, data: rows });
    }

    // ---------- ASSETS DOWNLOAD ----------
    if (p.startsWith('/assets/') && p.endsWith('/download') && method==='GET'){
      const u = requireUser(req, res); if (!u) return;
      const id = p.split('/')[2];
      try{
        const { rows } = await query(`
          SELECT a.file_key, p.id as product_id
          FROM product_assets a JOIN products p ON p.id=a.product_id WHERE a.id=$1
        `, [id]);
        const a = rows[0]; if (!a) return send(res, 404, { ok:false, error:'Asset not found' });
        const owned = await isOwned(u.id, a.product_id);
        if (!owned) return send(res, 403, { ok:false, error:'Not entitled' });
        res.statusCode = 302; res.setHeader('Location', a.file_key); res.end(); return;
      }catch{
        return send(res, 404, { ok:false, error:'Asset not found' });
      }
    }

    // ---------- COURSES ----------
    if (p.startsWith('/courses/') && method==='GET'){
      const productId = p.split('/')[2];
      const c = await query(`SELECT c.product_id, c.intro, p.title FROM courses c JOIN products p ON p.id=c.product_id WHERE c.product_id=$1`, [productId]).catch(()=>({ rows: [] }));
      const course = c.rows[0];
      if (!course) return send(res, 404, { ok:false, error:'Course not found' });
      const owned = me ? await isOwned(me.id, productId) : false;
      const vids = await query(`
        SELECT id, title, video_url, duration_seconds, sort_index, free_preview
        FROM course_videos WHERE course_id=$1 ORDER BY sort_index, created_at
      `, [productId]).catch(()=>({ rows: [] }));
      const videos = vids.rows.map(v => ({ ...v, video_url: (owned || v.free_preview) ? v.video_url : null }));
      return send(res, 200, { ok:true, data: { ...course, owned, videos } });
    }

    return send(res, 404, { ok:false, error:'Not Found' });
  }catch(err){
    console.error('API error', err);
    return send(res, 500, { ok:false, error: 'Server error', detail: String(err && err.message || err) });
  }
}
