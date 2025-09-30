import { query } from '../_utils/db.js';
import { getUser } from '../_utils/auth.js';
import { isOwned } from '../_utils/owned.js';

export default async function handler(req, res){
  res.setHeader('content-type','application/json');
  const id = (req.query && (req.query.id || req.query.productId)) || (req.url.split('/').slice(-1)[0]);
  if (!id){ res.status(400).json({ ok:false, error:'Missing id' }); return; }

  const { rows } = await query(`SELECT p.* FROM products p WHERE p.id = $1`, [id]);
  const product = rows[0];
  if (!product){ res.status(404).json({ ok:false, error:'Not found' }); return; }

  const me = getUser(req);
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
  }catch{
    // product_assets may not exist yet; ignore
  }

  res.json({ ok:true, data: { ...product, owned, assets } });
}
