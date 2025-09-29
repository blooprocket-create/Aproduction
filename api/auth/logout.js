import { clearAuthCookie } from '../_utils/jwt.js';
export default async function handler(){
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json', ...clearAuthCookie() } });
}
