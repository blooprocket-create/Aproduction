import { query } from '../_utils/db.js';
import { readAuth } from '../_utils/jwt.js';

const MAX_QTY = 10;

function normalizeQty(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.min(parsed, MAX_QTY);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const user = readAuth(req);
    if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const r = await query(
      "select o.*, json_agg(json_build_object('product_id', oi.product_id, 'qty', oi.qty, 'unit_price_cents', oi.unit_price_cents)) items from orders o join order_items oi on oi.order_id=o.id where o.user_id=$1 group by o.id order by o.created_at desc",
      [user.sub]
    );
    return res.status(200).json({ ok: true, data: r.rows });
  }

  if (req.method === 'POST') {
    const user = readAuth(req);
    if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const { product_id, qty = 1 } = req.body || {};
    if (!product_id) {
      return res.status(400).json({ ok: false, error: 'Missing product_id' });
    }

    const quantity = normalizeQty(qty);
    const productResult = await query('select id, price_cents, kind, published from products where id=$1', [product_id]);
    if (!productResult.rowCount) {
      return res.status(400).json({ ok: false, error: 'Invalid product' });
    }

    const product = productResult.rows[0];
    if (!product.published) {
      return res.status(400).json({ ok: false, error: 'Product is not available' });
    }
    if (product.kind === 'service') {
      return res.status(400).json({ ok: false, error: 'Use the service request flow instead of direct checkout' });
    }

    const total = product.price_cents * quantity;
    const order = await query(
      'insert into orders (user_id, total_cents, status) values ($1,$2,$3) returning id',
      [user.sub, total, 'paid']
    );

    await query(
      'insert into order_items (order_id, product_id, unit_price_cents, qty) values ($1,$2,$3,$4)',
      [order.rows[0].id, product_id, product.price_cents, quantity]
    );
    await query('insert into entitlements (user_id, product_id) values ($1,$2) on conflict do nothing', [user.sub, product_id]);
    return res.status(200).json({ ok: true, data: { order_id: order.rows[0].id } });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
