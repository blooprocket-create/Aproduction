import { createRouter } from '../../lib/api/router.js';
import authLogin from '../../lib/api/auth/login.js';
import authRegister from '../../lib/api/auth/register.js';
import authLogout from '../../lib/api/auth/logout.js';
import authMe from '../../lib/api/auth/me.js';

const routes = [
  { pattern: /^\/api\/auth\/login$/, methods: { POST: authLogin } },
  { pattern: /^\/api\/auth\/register$/, methods: { POST: authRegister } },
  { pattern: /^\/api\/auth\/logout$/, methods: { POST: authLogout } },
  { pattern: /^\/api\/auth\/me$/, methods: { GET: authMe } },
];

export default createRouter(routes);
