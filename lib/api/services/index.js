import { query } from '../../utils/db.js';
import { readAuth } from '../../utils/jwt.js';
function isAdminOrEditor(user){ return !!user && ['admin','editor'].includes(user.role); }

export default async function handler(req, res){
  try{
    const url = new URL(req.url, `http://${req.headers.host||'localhost'}`);
    const all = url.searchParams.get('all') === '1';
    const user = readAuth(req);

    if (req.method === 'GET'){
      // Admin inbox of service requests
      if (url.searchParams.get('admin') === '1'){
        if (!isAdminOrEditor(user)) return res.status(403).json({ ok:false, error:'Forbidden' });
        const r = await query(`
          select sr.*, p.title as service_title, u.email as customer_email
          from service_requests sr
          join products p on p.id = sr.service_id
          join users u on u.id = sr.customer_id
          order by sr.created_at desc
        `, []);
        res.setHeader('content-type','application/json');
        return res.status(200).json({ ok:true, data:r.rows });
      }
      // Customer's own requests
      if (url.searchParams.get('mine') === '1'){
        if (!user) return res.status(401).json({ ok:false, error:'Unauthorized' });
        const r = await query(`
          select sr.*, p.title as service_title
          from service_requests sr
          join products p on p.id = sr.service_id
          where sr.customer_id=$1
          order by sr.created_at desc
        `, [user.sub]);
        res.setHeader('content-type','application/json');
        return res.status(200).json({ ok:true, data:r.rows });
      }

      // Existing behavior: list services
      let sql = "select id, kind, slug, title, subtitle, description, price_cents, badge, media, published from products where kind='service'";
      if (!(all && isAdminOrEditor(user))) { sql += " and published=true"; }
      sql += " order by created_at desc nulls last";
      const r = await query(sql);
      res.setHeader('content-type','application/json');
      return res.status(200).json({ ok:true, data:r.rows });
    }

    if (req.method === 'POST'){
      const b = req.body || {};

      // New: customer creates service request
      if (b && b.op === 'request'){
        if (!user) return res.status(401).json({ ok:false, error:'Unauthorized' });
        const { service_id, title, details } = b;
        if (!service_id || !title) return res.status(400).json({ ok:false, error:'service_id and title required' });
        const chk = await query("select id from products where id=$1 and kind='service'", [service_id]);
        if (!chk.rowCount) return res.status(404).json({ ok:false, error:'Service not found' });
        const ins = await query(`
          insert into service_requests (service_id, customer_id, title, details)
          values ($1,$2,$3,$4) returning *
        `, [service_id, user.sub, title, details || null]);
        res.setHeader('content-type','application/json');
        return res.status(200).json({ ok:true, data: ins.rows[0] });
      }

      // Existing admin create service
      if (!isAdminOrEditor(user)) return res.status(403).json({ ok:false, error:'Forbidden' });
      const r = await query(
        "insert into products (kind, slug, title, subtitle, description, price_cents, badge, media, published, created_by) values ('service',$1,$2,$3,$4,$5,$6,$7,$8,$9) returning *",
        [b.slug, b.title, b.subtitle||null, b.description||'', Number(b.price_cents||0), b.badge||null, b.media||null, !!b.published, user.sub]
      );
      res.setHeader('content-type','application/json');
      return res.status(200).json({ ok:true, data:r.rows[0] });
    }

    return res.status(405).json({ ok:false, error:'Method not allowed' });
  }catch(e){
    return res.status(500).json({ ok:false, error:'Server error' });
  }
}

