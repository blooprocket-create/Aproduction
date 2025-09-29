import { query } from '../_utils/db.js';
import { ok, bad } from '../_utils/responses.js';
import { requireRole } from '../_utils/roleGuard.js';

export default async function handler(req){
  const id = req.url.split('/').pop();
  if (req.method === 'GET'){
    const r = await query('select * from products where id=$1', [id]);
    if (!r.rowCount) return bad('Not found', 404);
    return ok(r.rows[0]);
  }
  if (req.method === 'PATCH'){
    const [user, err] = requireRole(req, ['admin','editor']);
    if (err) return err;
    const body = await req.json();
    const fields = ['slug','title','subtitle','description','price_cents','badge','media','published'];
    const set = [];
    const vals = [];
    let i=1;
    for (const f of fields){ if (f in body){ set.push(`${f}=$${i++}`); vals.push(body[f]); } }
    if (!set.length) return bad('No changes');
    vals.push(id);
    const r = await query(`update products set ${set.join(', ')}, updated_at=now() where id=$${i} returning *`, vals);
    return ok(r.rows[0]);
  }
  if (req.method === 'DELETE'){
    const [_, err] = requireRole(req, ['admin']);
    if (err) return err;
    await query('delete from products where id=$1', [id]);
    return ok({ deleted: true });
  }
  return bad('Method not allowed', 405);
}
