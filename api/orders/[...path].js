import { createRouter } from '../../lib/api/router.js';
import ordersIndex from '../../lib/api/orders/index.js';

const routes = [
  { pattern: /^\/api\/orders$/, methods: { GET: ordersIndex, POST: ordersIndex } },
];

export default createRouter(routes);
