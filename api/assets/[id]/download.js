import { query } from '../../_utils/db.js';
import { requireUser } from '../../_utils/auth.js';
import { isOwned } from '../../_utils/owned.js';

export default async function handler(req, res){
  const me = requireUser(req, res); if (!me) return;
  const id = (req.query && req.query.id) || req.url.split('/').slice(-2,-1)[0];

  let asset;
  try{
    const { rows } = await query(`
      SELECT a.id, a.file_key, a.label, p.id as product_id
      FROM product_assets a
      JOIN products p ON p.id = a.product_id
      WHERE a.id = $1
    `, [id]);
    asset = rows[0];
  }catch{
    res.statusCode=404; res.setHeader('content-type','application/json');
    res.end(JSON.stringify({ ok:false, error:'Asset not found' })); return;
  }
  if (!asset){ res.statusCode=404; res.setHeader('content-type','application/json'); res.end(JSON.stringify({ ok:false, error:'Asset not found' })); return; }

  const owned = await isOwned(me.id, asset.product_id);
  if (!owned){ res.statusCode=403; res.setHeader('content-type','application/json'); res.end(JSON.stringify({ ok:false, error:'Not entitled' })); return; }

  res.statusCode = 302;
  res.setHeader('Location', asset.file_key);
  res.end();
}
