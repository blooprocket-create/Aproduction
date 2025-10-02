import { createRouter } from '../../lib/api/router.js';
import entitlements from '../../lib/api/me/entitlements.js';

const routes = [
  { pattern: /^\/api\/me\/entitlements$/, methods: { GET: entitlements } },
];

export default createRouter(routes);
