import { query } from '../../utils/db.js';
import { readAuth } from '../../utils/jwt.js';

async function userOwns(userId, productId){
  if (!userId) return false;
  // entitlements
  try{
    const e = await query('select 1 from entitlements where user_id=$1 and product_id=$2 limit 1', [userId, productId]);
    if (e.rowCount) return true;
  }catch{}
  // orders + items
  try{
    const o = await query(`
      select 1 from orders o
      join order_items oi on oi.order_id = o.id
      where o.user_id=$1 and oi.product_id=$2 and coalesce(o.status,'paid')='paid'
      limit 1
    `,[userId, productId]);
    if (o.rowCount) return true;
  }catch{}
  return false;
}

export default async function handler(req, res){
  try{
    const url = new URL(req.url, `http://${req.headers.host||'localhost'}`);
    const id = url.pathname.split('/').pop();
    const user = readAuth(req);

    if (req.method === 'GET'){
      // asset download passthrough in same function to avoid new files
      const assetId = url.searchParams.get('asset');
      const dl = url.searchParams.get('download') === '1';
      if (assetId && dl){
        const a = await query(`
          select a.file_key, p.id as product_id
          from product_assets a join products p on p.id=a.product_id
          where a.id=$1
        `, [assetId]);
        if (!a.rowCount) return res.status(404).json({ ok:false, error:'Asset not found' });
        const owned = await userOwns(user?.sub, a.rows[0].product_id);
        if (!owned) return res.status(403).json({ ok:false, error:'Not entitled' });
        res.statusCode = 302;
        res.setHeader('Location', a.rows[0].file_key);
        return res.end();
      }

      // normal product payload
      const pr = await query('select * from products where id=$1', [id]);
      if (!pr.rowCount) return res.status(404).json({ ok:false, error:'Not found' });
      const product = pr.rows[0];

      // compute ownership
      const owned = await userOwns(user?.sub, id);

      // attach assets (hide file_key when not owned)
      let assets = [];
      try{
        const r = await query(`
          select id, label, ${owned? 'file_key' : 'null as file_key'}, mime_type, bytes, sort_index, created_at
          from product_assets where product_id=$1
          order by sort_index, created_at
        `, [id]);
        assets = r.rows;
      }catch{ assets = []; }

      // optional course data
      let course = null;
      let videos = [];
      try{
        const c = await query('select product_id, intro from courses where product_id=$1', [id]);
        if (c.rowCount){
          course = c.rows[0];
          const v = await query(`
            select id, title, ${owned? 'video_url' : "case when free_preview then video_url else null end as video_url"},
                   duration_seconds, sort_index, free_preview, created_at
            from course_videos where course_id=$1
            order by sort_index, created_at
          `, [id]);
          videos = v.rows;
        }
      }catch{}

      res.setHeader('content-type','application/json');
      return res.status(200).json({ ok:true, data:{ ...product, owned, assets, course, videos } });
    }

    if (req.method === 'PATCH'){
      const user = readAuth(req);
      if (!user || !['admin','editor'].includes(user.role)) return res.status(403).json({ ok:false, error:'Forbidden' });
      const body = req.body || {};
      const fields = ['slug','title','subtitle','description','price_cents','badge','media','published'];
      const set = []; const vals = [];
      let i = 1;
      for (const k of fields){
        if (Object.prototype.hasOwnProperty.call(body, k)){
          set.push(`${k}=$${i++}`);
          vals.push(body[k]);
        }
      }
      if (!set.length) return res.status(400).json({ ok:false, error:'No fields' });
      vals.push(id);
      const up = await query(`update products set ${set.join(', ')}, updated_at=now() where id=$${i} returning *`, vals);
      res.setHeader('content-type','application/json');
      return res.status(200).json({ ok:true, data: up.rows[0] });
    }

    if (req.method === 'DELETE'){
      const user = readAuth(req);
      if (!user || user.role!=='admin') return res.status(403).json({ ok:false, error:'Forbidden' });
      await query('delete from products where id=$1', [id]);
      res.setHeader('content-type','application/json');
      return res.status(200).json({ ok:true, data:{ deleted:true } });
    }

    return res.status(405).json({ ok:false, error:'Method not allowed' });
  }catch(e){
    return res.status(500).json({ ok:false, error:'Server error' });
  }
}

