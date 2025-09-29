import { query } from '../_utils/db.js';
import { ok, bad } from '../_utils/responses.js';
import { requireRole } from '../_utils/roleGuard.js';

export default async function handler(req){
  if (req.method === 'GET'){
    const r = await query("select id, kind, slug, title, subtitle, description, price_cents, badge, media, published from products where kind='service' and published=true order by created_at desc");
    return ok(r.rows);
  }
  if (req.method === 'POST'){
    const [user, err] = requireRole(req, ['admin','editor']);
    if (err) return err;
    const b = await req.json();
    const r = await query("insert into products (kind, slug, title, description, price_cents, published, created_by) values ('service',$1,$2,$3,$4,$5,$6) returning *", [b.slug, b.title, b.description||'', b.price_cents||0, !!b.published, user.sub]);
    return ok(r.rows[0]);
  }
  return bad('Method not allowed', 405);
}
