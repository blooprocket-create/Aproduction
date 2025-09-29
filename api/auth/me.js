import { ok, bad } from '../_utils/responses.js';
import { readAuth } from '../_utils/jwt.js';
export default async function handler(req){
  const user = readAuth(req);
  if (!user) return bad('Not authenticated', 401);
  return ok(user);
}
