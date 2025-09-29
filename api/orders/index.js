import { query } from '../_utils/db.js';
import { ok, bad } from '../_utils/responses.js';
import { requireAuth } from '../_utils/roleGuard.js';

export default async function handler(req){
  if (req.method !== 'POST' && req.method !== 'GET') return bad('Method not allowed', 405);
  if (req.method === 'GET'){
    const [user, err] = requireAuth(req); if (err) return err;
    const r = await query("select o.*, json_agg(json_build_object('product_id', oi.product_id, 'qty', oi.qty, 'unit_price_cents', oi.unit_price_cents)) items from orders o join order_items oi on oi.order_id=o.id where o.user_id=$1 group by o.id order by o.created_at desc", [user.sub]);
    return ok(r.rows);
  }
  const [user, err] = requireAuth(req); if (err) return err;
  const { product_id, qty=1 } = await req.json();
  const p = await query('select id, price_cents from products where id=$1 and published=true', [product_id]);
  if (!p.rowCount) return bad('Invalid product');
  const total = p.rows[0].price_cents * qty;
  const o = await query('insert into orders (user_id, total_cents, status) values ($1,$2,$3) returning id', [user.sub, total, 'paid']);
  await query('insert into order_items (order_id, product_id, unit_price_cents, qty) values ($1,$2,$3,$4)', [o.rows[0].id, product_id, p.rows[0].price_cents, qty]);
  await query('insert into entitlements (user_id, product_id) values ($1,$2) on conflict do nothing', [user.sub, product_id]);
  return ok({ order_id: o.rows[0].id });
}
