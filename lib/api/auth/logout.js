import { clearCookieHeader } from '../../utils/jwt.js';
export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Use POST' });
  res.setHeader('Set-Cookie', clearCookieHeader());
  return res.status(200).json({ ok:true, data:true });
}

