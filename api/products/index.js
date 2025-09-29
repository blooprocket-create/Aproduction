import { query } from '../_utils/db.js';
import { ok, bad } from '../_utils/responses.js';
import { requireRole } from '../_utils/roleGuard.js';

export default async function handler(req){
  if (req.method === 'GET'){
    const r = await query("select id, kind, slug, title, subtitle, description, price_cents, badge, media, published from products where kind in ('product','course') and published=true order by created_at desc");
    return ok(r.rows);
  }
  if (req.method === 'POST'){
    const [user, err] = requireRole(req, ['admin','editor']);
    if (err) return err;
    const body = await req.json();
    const { kind, slug, title, description, price_cents, published=false } = body;
    if (!kind || !slug || !title || price_cents==null) return bad('Missing fields');
    const r = await query('insert into products (kind, slug, title, description, price_cents, published, created_by) values ($1,$2,$3,$4,$5,$6,$7) returning *', [kind, slug, title, body.description||'', price_cents, !!published, user.sub]);
    return ok(r.rows[0]);
  }
  return bad('Method not allowed', 405);
}
