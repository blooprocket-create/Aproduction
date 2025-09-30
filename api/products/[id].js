import { query } from '../_utils/db.js';
import { readAuth } from '../_utils/jwt.js';

export default async function handler(req, res){
  try{
    const url = new URL(req.url, `http://${req.headers.host||'localhost'}`);
    const id = url.pathname.split('/').pop();

    if (req.method === 'GET'){
      const r = await query('select * from products where id=$1', [id]);
      if (!r.rowCount) return res.status(404).json({ ok:false, error:'Not found' });
      res.setHeader('content-type','application/json');
      return res.status(200).json({ ok:true, data:r.rows[0] });
    }

    if (req.method === 'PATCH'){
      const user = readAuth(req);
      if (!user || !['admin','editor'].includes(user.role)) return res.status(403).json({ ok:false, error:'Forbidden' });
      const body = req.body || {};
      const fields = ['slug','title','subtitle','description','price_cents','badge','media','published'];
      const set = [];
      const vals = [];
      let i=1;
      for (const f of fields){ if (f in body){ set.push(`${f}=$${i++}`); vals.push(body[f]); } }
      if (!set.length) return res.status(400).json({ ok:false, error:'No changes' });
      vals.push(id);
      const r = await query(`update products set ${set.join(', ')}, updated_at=now() where id=$${i} returning *`, vals);
      res.setHeader('content-type','application/json');
      return res.status(200).json({ ok:true, data:r.rows[0] });
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
