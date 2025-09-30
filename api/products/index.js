import { query } from '../_utils/db.js';
import { readAuth } from '../_utils/jwt.js';

export default async function handler(req, res){
  if (req.method === 'GET'){
    const r = await query("select id, kind, slug, title, subtitle, description, price_cents, badge, media, published from products where kind in ('product','course') and published=true order by created_at desc");
    return res.status(200).json({ ok:true, data:r.rows });
  }
  if (req.method === 'POST'){
    const user = readAuth(req);
    if (!user || !['admin','editor'].includes(user.role)) return res.status(403).json({ ok:false, error:'Forbidden' });
    const body = req.body || {};
    const { kind, slug, title, description, price_cents, published=false } = body;
    if (!kind || !slug || !title || price_cents==null) return res.status(400).json({ ok:false, error:'Missing fields' });
    const r = await query('insert into products (kind, slug, title, description, price_cents, published, created_by) values ($1,$2,$3,$4,$5,$6,$7) returning *', [kind, slug, title, description||'', Number(price_cents), !!published, user.sub]);
    return res.status(200).json({ ok:true, data:r.rows[0] });
  }
  return res.status(405).json({ ok:false, error:'Method not allowed' });
}
