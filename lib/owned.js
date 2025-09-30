import { query } from './db.js';

export async function isOwned(userId, productId){
  if (!userId) return false;
  // entitlements table (older schema)
  try{
    const e = await query(`SELECT 1 FROM entitlements WHERE user_id=$1 AND product_id=$2 LIMIT 1`, [userId, productId]);
    if (e.rowCount) return true;
  }catch{}
  // orders with status=paid (newer schema)
  try{
    const o = await query(`SELECT 1 FROM orders WHERE user_id=$1 AND product_id=$2 AND (status='paid' OR status IS NULL) LIMIT 1`, [userId, productId]);
    if (o.rowCount) return true;
  }catch{}
  return false;
}
