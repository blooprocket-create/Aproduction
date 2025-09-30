import { readAuth } from '../_utils/jwt.js';
export default async function handler(req, res){
  const user = readAuth(req);
  if (!user) return res.status(401).json({ ok:false, error:'Not authenticated' });
  return res.status(200).json({ ok:true, data:user });
}
