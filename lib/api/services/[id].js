import { query } from '../../utils/db.js';
import { readAuth } from '../../utils/jwt.js';

export default async function handler(req, res){
  try{
    const url = new URL(req.url, `http://${req.headers.host||'localhost'}`);
    const id = url.pathname.split('/').pop();
    const user = readAuth(req);

    if (req.method === 'GET'){
      const service = await query('select * from products where id=$1 and kind=$2', [id, 'service']);
      if (service.rowCount){
        res.setHeader('content-type','application/json');
        return res.status(200).json({ ok:true, data: service.rows[0] });
      }
      const request = await query('select * from service_requests where id=$1', [id]);
      if (!request.rowCount) return res.status(404).json({ ok:false, error:'Not found' });
      const row = request.rows[0];
      if (!user || (user.role!=='admin' && user.role!=='editor' && row.customer_id !== user.sub))
        return res.status(403).json({ ok:false, error:'Forbidden' });
      const msgs = await query('select * from service_messages where request_id=$1 order by created_at', [id]).catch(()=>({ rows: [] }));
      const files = await query('select * from service_deliverables where request_id=$1 order by created_at', [id]).catch(()=>({ rows: [] }));
      res.setHeader('content-type','application/json');
      return res.status(200).json({ ok:true, data: { ...row, messages: msgs.rows, deliverables: files.rows } });
    }

    if (req.method === 'PATCH'){
      const body = req.body || {};
      const op = body.op;

      if (op === 'quote'){
        if (!user || !['admin','editor'].includes(user.role)) return res.status(403).json({ ok:false, error:'Forbidden' });
        const { request_id, price_cents } = body;
        if (!request_id || price_cents==null) return res.status(400).json({ ok:false, error:'request_id and price_cents required' });
        const updated = await query("update service_requests set status='quoted', price_cents=$1, updated_at=now() where id=$2 returning *", [price_cents, request_id]);
        res.setHeader('content-type','application/json');
        return res.status(200).json({ ok:true, data: updated.rows[0] });
      }

      if (op === 'accept'){
        if (!user) return res.status(401).json({ ok:false, error:'Unauthorized' });
        const { request_id } = body;
        const request = await query('select * from service_requests where id=$1', [request_id]);
        if (!request.rowCount) return res.status(404).json({ ok:false, error:'Not found' });
        const row = request.rows[0];
        if (row.customer_id !== user.sub) return res.status(403).json({ ok:false, error:'Forbidden' });
        if (row.status !== 'quoted') return res.status(400).json({ ok:false, error:'Request is not quoted' });
        const updated = await query("update service_requests set status='accepted', updated_at=now() where id=$1 returning *", [request_id]);
        res.setHeader('content-type','application/json');
        return res.status(200).json({ ok:true, data: updated.rows[0] });
      }

      if (op === 'decline'){
        if (!user) return res.status(401).json({ ok:false, error:'Unauthorized' });
        const { request_id } = body;
        const request = await query('select * from service_requests where id=$1', [request_id]);
        if (!request.rowCount) return res.status(404).json({ ok:false, error:'Not found' });
        const row = request.rows[0];
        if (row.customer_id !== user.sub) return res.status(403).json({ ok:false, error:'Forbidden' });
        if (row.status !== 'quoted') return res.status(400).json({ ok:false, error:'Request is not quoted' });
        const updated = await query("update service_requests set status='declined', updated_at=now() where id=$1 returning *", [request_id]);
        res.setHeader('content-type','application/json');
        return res.status(200).json({ ok:true, data: updated.rows[0] });
      }

      if (op === 'pay'){
        if (!user) return res.status(401).json({ ok:false, error:'Unauthorized' });
        const { request_id } = body;
        const request = await query('select * from service_requests where id=$1', [request_id]);
        if (!request.rowCount) return res.status(404).json({ ok:false, error:'Not found' });
        const row = request.rows[0];
        if (row.customer_id !== user.sub) return res.status(403).json({ ok:false, error:'Forbidden' });
        if (row.status !== 'accepted') return res.status(400).json({ ok:false, error:'Request must be accepted before payment' });
        const updated = await query("update service_requests set status='paid', updated_at=now() where id=$1 returning *", [request_id]);
        res.setHeader('content-type','application/json');
        return res.status(200).json({ ok:true, data: updated.rows[0] });
      }

      if (op === 'paid'){
        if (!user || !['admin','editor'].includes(user.role)) return res.status(403).json({ ok:false, error:'Forbidden' });
        const { request_id } = body;
        const updated = await query("update service_requests set status='paid', updated_at=now() where id=$1 returning *", [request_id]);
        res.setHeader('content-type','application/json');
        return res.status(200).json({ ok:true, data: updated.rows[0] });
      }

      if (op === 'deliver'){
        if (!user || !['admin','editor'].includes(user.role)) return res.status(403).json({ ok:false, error:'Forbidden' });
        const { request_id, label, file_key, mime_type, bytes } = body;
        if (!request_id || !label || !file_key) return res.status(400).json({ ok:false, error:'request_id, label, file_key required' });
        const deliverable = await query("insert into service_deliverables (request_id, label, file_key, mime_type, bytes) values ($1,$2,$3,$4,$5) returning *", [request_id, label, file_key, mime_type||null, bytes||null]);
        await query("update service_requests set status='delivered', updated_at=now() where id=$1", [request_id]);
        res.setHeader('content-type','application/json');
        return res.status(200).json({ ok:true, data: deliverable.rows[0] });
      }

      return res.status(400).json({ ok:false, error:'Unknown op' });
    }

    if (req.method === 'DELETE'){
      if (!user || user.role !== 'admin') return res.status(403).json({ ok:false, error:'Forbidden' });
      const svc = await query("select id from products where id=$1 and kind='service'", [id]);
      if (!svc.rowCount) return res.status(404).json({ ok:false, error:'Not found' });
      await query('delete from products where id=$1', [id]);
      res.setHeader('content-type','application/json');
      return res.status(200).json({ ok:true, data:{ deleted:true } });
    }

    if (req.method === 'POST'){
      const body = req.body || {};
      if (body && body.op === 'message'){
        if (!user) return res.status(401).json({ ok:false, error:'Unauthorized' });
        const { request_id, message: msgBody, body: bodyFallback } = body;
        const messageText = msgBody ?? bodyFallback;
        if (!request_id || !messageText) return res.status(400).json({ ok:false, error:'request_id and body required' });
        const request = await query('select * from service_requests where id=$1', [request_id]);
        if (!request.rowCount) return res.status(404).json({ ok:false, error:'Not found' });
        const row = request.rows[0];
        if (user.role!=='admin' && user.role!=='editor' && row.customer_id !== user.sub) return res.status(403).json({ ok:false, error:'Forbidden' });
        const message = await query("insert into service_messages (request_id, author_id, body) values ($1,$2,$3) returning *", [request_id, user.sub, messageText]);
        res.setHeader('content-type','application/json');
        return res.status(200).json({ ok:true, data: message.rows[0] });
      }
      return res.status(400).json({ ok:false, error:'Unknown op' });
    }

    return res.status(405).json({ ok:false, error:'Method not allowed' });
  }catch(e){
    return res.status(500).json({ ok:false, error:'Server error' });
  }
}

