import { query } from '../../utils/db.js';
import { readAuth } from '../../utils/jwt.js';

export default async function handler(req, res){
  const user = readAuth(req);
  if (!user || user.role!=='admin') return res.status(403).json({ ok:false, error:'Forbidden' });
  const totals = await query(`
    select
      count(*)::int as users,
      (select count(*)::int from orders) as orders,
      (select count(*)::int from products where published=true) as published,
      (select coalesce(sum(total_cents),0)::int from orders) as revenue_cents
    from users
  `);
  return res.status(200).json({ ok:true, data:totals.rows[0] });
}

