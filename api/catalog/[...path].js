import { createRouter } from '../../lib/api/router.js';
import productsIndex from '../../lib/api/products/index.js';
import productDetail from '../../lib/api/products/[id].js';
import servicesIndex from '../../lib/api/services/index.js';
import serviceDetail from '../../lib/api/services/[id].js';
import ordersIndex from '../../lib/api/orders/index.js';
import entitlements from '../../lib/api/me/entitlements.js';

const routes = [
  { pattern: /^\/api\/products$/, methods: { GET: productsIndex, POST: productsIndex } },
  { pattern: /^\/api\/products\/([^\/]+)$/, methods: { GET: productDetail, PATCH: productDetail, DELETE: productDetail }, params: ['id'] },
  { pattern: /^\/api\/services$/, methods: { GET: servicesIndex, POST: servicesIndex } },
  { pattern: /^\/api\/services\/([^\/]+)$/, methods: { GET: serviceDetail, PATCH: serviceDetail, DELETE: serviceDetail, POST: serviceDetail }, params: ['id'] },
  { pattern: /^\/api\/orders$/, methods: { GET: ordersIndex, POST: ordersIndex } },
  { pattern: /^\/api\/me\/entitlements$/, methods: { GET: entitlements } },
];

export default createRouter(routes);
