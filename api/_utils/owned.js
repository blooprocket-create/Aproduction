import { query } from './db.js';

/**
 * Returns true if user owns product, compatible with both schemas:
 *  - entitlements(user_id, product_id)
 *  - orders(user_id, product_id, status='paid')
 */
export async function isOwned(userId, productId){
  if (!userId) return false;
  // Try entitlements first (older schema)
  try{
    const e = await query(`SELECT 1 FROM entitlements WHERE user_id=$1 AND product_id=$2 LIMIT 1`, [userId, productId]);
    if (e.rowCount) return true;
  }catch{ /* table may not exist yet */ }

  // Fallback to orders with status
  try{
    const o = await query(`SELECT 1 FROM orders WHERE user_id=$1 AND product_id=$2 AND (status='paid' OR status IS NULL) LIMIT 1`, [userId, productId]);
    if (o.rowCount) return true;
  }catch{}

  return false;
}
