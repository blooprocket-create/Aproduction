import { query } from '../_utils/db.js';
import { readAuth } from '../_utils/jwt.js';

export default async function handler(req, res){
  const user = readAuth(req);
  if (!user) return res.status(401).json({ ok:false, error:'Unauthorized' });
  const r = await query(`
    select p.*
    from entitlements e
    join products p on p.id = e.product_id
    where e.user_id = $1
    order by p.created_at desc
  `, [user.sub]);
  return res.status(200).json({ ok:true, data:r.rows });
}
