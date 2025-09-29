import { query } from '../_utils/db.js';
import { ok } from '../_utils/responses.js';
import { requireRole } from '../_utils/roleGuard.js';

export default async function handler(req){
  const [_, err] = requireRole(req, ['admin']); if (err) return err;
  const totals = await query("select count(*) users, (select count(*) from products where published=true) published, (select coalesce(sum(total_cents),0) from orders) revenue_cents from users");
  return ok(totals.rows[0]);
}
