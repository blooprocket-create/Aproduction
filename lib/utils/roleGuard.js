import { readAuth } from './jwt.js';
import { bad } from './responses.js';

export function requireAuth(req) {
  const user = readAuth(req);
  if (!user) return [null, bad('Unauthorized', 401)];
  return [user, null];
}

export function requireRole(req, roles) {
  const [user, err] = requireAuth(req);
  if (err) return [null, err];
  if (!roles.includes(user.role)) return [null, bad('Forbidden', 403)];
  return [user, null];
}
