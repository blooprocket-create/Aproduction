import { createRouter } from '../../lib/api/router.js';
import adminStats from '../../lib/api/admin/stats.js';
import adminUsers from '../../lib/api/admin/users/index.js';
import adminUserDetail from '../../lib/api/admin/users/[id].js';

const routes = [
  { pattern: /^\/api\/admin\/stats$/, methods: { GET: adminStats } },
  { pattern: /^\/api\/admin\/users$/, methods: { GET: adminUsers, POST: adminUsers } },
  { pattern: /^\/api\/admin\/users\/([^\/]+)$/, methods: { PATCH: adminUserDetail, DELETE: adminUserDetail }, params: ['id'] },
];

export default createRouter(routes);
