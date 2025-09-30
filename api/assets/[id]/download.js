import { query } from '../../_utils/db.js';
import { requireUser } from '../../_utils/auth.js';

export default async function handler(req, res){
  const me = requireUser(req, res); if (!me) return;
  const id = (req.query && req.query.id) || req.url.split('/').slice(-2,-1)[0];

  const { rows } = await query(`
    SELECT a.file_key, a.label, p.id as product_id
    FROM product_assets a
    JOIN products p ON p.id = a.product_id
    WHERE a.id = $1
  `, [id]);
  const asset = rows[0];
  if (!asset){ res.statusCode=404; res.setHeader('content-type','application/json'); res.end(JSON.stringify({ ok:false, error:'Asset not found' })); return; }

  const ent = await query(`SELECT 1 FROM orders WHERE user_id=$1 AND product_id=$2 AND status='paid' LIMIT 1`, [me.id, asset.product_id]);
  if (!ent.rowCount){ res.statusCode=403; res.setHeader('content-type','application/json'); res.end(JSON.stringify({ ok:false, error:'Not entitled' })); return; }

  res.statusCode = 302;
  res.setHeader('Location', asset.file_key);
  res.end();
}
