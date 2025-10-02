import { query } from '../../utils/db.js';
import { readAuth } from '../../utils/jwt.js';

function isAdminOrEditor(user){ return !!user && ['admin','editor'].includes(user.role); }

export default async function handler(req, res){
  try{
    const url = new URL(req.url, `http://${req.headers.host||'localhost'}`);
    const all = url.searchParams.get('all') === '1';
    const user = readAuth(req);

    if (req.method === 'GET'){
      let sql = "select id, kind, slug, title, subtitle, description, price_cents, badge, media, published from products where kind in ('product','course')";
      const params = [];
      if (!(all && isAdminOrEditor(user))) {
        sql += " and published=true";
      }
      sql += " order by created_at desc";
      const r = await query(sql, params);
      res.setHeader('content-type','application/json');
      return res.status(200).json({ ok:true, data:r.rows });
    }

    if (req.method === 'POST'){
      if (!isAdminOrEditor(user)) return res.status(403).json({ ok:false, error:'Forbidden' });
      const body = req.body || {};
      const { kind, slug, title, description, price_cents, published=false } = body;
      if (!kind || !slug || !title || price_cents==null) return res.status(400).json({ ok:false, error:'Missing fields' });
      const r = await query('insert into products (kind, slug, title, description, price_cents, published, created_by) values ($1,$2,$3,$4,$5,$6,$7) returning *', [kind, slug, title, description||'', Number(price_cents), !!published, user.sub]);
      res.setHeader('content-type','application/json');
      return res.status(200).json({ ok:true, data:r.rows[0] });
    }

    return res.status(405).json({ ok:false, error:'Method not allowed' });
  }catch(e){
    return res.status(500).json({ ok:false, error:'Server error' });
  }
}

