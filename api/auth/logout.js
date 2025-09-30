import { clearCookieHeader } from '../_utils/jwt.js';
export default async function handler(req, res){
  res.setHeader('Set-Cookie', clearCookieHeader());
  return res.status(200).json({ ok:true, data:true });
}
