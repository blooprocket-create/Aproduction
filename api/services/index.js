import { query } from '../_utils/db.js';
import { readAuth } from '../_utils/jwt.js';

export default async function handler(req, res) {
  try {
    const u = new URL(req.url, `http://${req.headers.host||'localhost'}`);
    const user = readAuth(req);

    if (req.method === 'GET') {
      if (u.searchParams.get('admin') === '1') {
        if (!user || !['admin','editor'].includes(user.role)) return res.status(403).json({ ok:false, error:'Forbidden' });
        const r = await query(`
          select sr.*, p.title as service_title, u.email as customer_email
          from service_requests sr
          join products p on p.id = sr.service_id
          join users u on u.id = sr.customer_id
          order by sr.created_at desc
        `, []);
        return res.status(200).json({ ok:true, data:r.rows });
      }

      if (u.searchParams.get('mine') === '1') {
        if (!user) return res.status(401).json({ ok:false, error:'Unauthorized' });
        const r = await query(`
          select sr.*, p.title as service_title
          from service_requests sr
          join products p on p.id = sr.service_id
          where sr.customer_id=$1
          order by sr.created_at desc
        `, [user.sub]);
        return res.status(200).json({ ok:true, data:r.rows });
      }

      const showAll = (u.searchParams.get('all')==='1') && user && ['admin','editor'].includes(user.role);
      const sql = showAll
        ? `select * from products where kind='service' order by created_at desc nulls last`
        : `select * from products where kind='service' and published=true order by created_at desc nulls last`;
      const { rows } = await query(sql);
      return res.status(200).json({ ok:true, data: rows });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (body && body.op === 'request') {
        if (!user) return res.status(401).json({ ok:false, error:'Unauthorized' });
        const { service_id, title, details } = body;
        if (!service_id || !title) return res.status(400).json({ ok:false, error:'service_id and title required' });
        const chk = await query(`select id from products where id=$1 and kind='service'`, [service_id]);
        if (!chk.rowCount) return res.status(404).json({ ok:false, error:'Service not found' });
        const ins = await query(`
          insert into service_requests (service_id, customer_id, title, details)
          values ($1,$2,$3,$4) returning *
        `, [service_id, user.sub, title, details||null]);
        return res.status(200).json({ ok:true, data: ins.rows[0] });
      }

      if (!user || !['admin','editor'].includes(user.role)) return res.status(403).json({ ok:false, error:'Forbidden' });
      const { slug, title, description='', price_cents=0, published=false } = body;
      if (!slug || !title) return res.status(400).json({ ok:false, error:'Missing slug/title' });
      const ins = await query(`
        insert into products (slug, title, description, price_cents, published, kind)
        values ($1,$2,$3,$4,$5,'service') returning *
      `, [slug, title, description, price_cents, published]);
      return res.status(200).json({ ok:true, data: ins.rows[0] });
    }

    return res.status(405).json({ ok:false, error:'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, error:'Server error' });
  }
}
