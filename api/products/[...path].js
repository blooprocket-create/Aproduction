import { createRouter } from '../../lib/api/router.js';
import productsIndex from '../../lib/api/products/index.js';
import productDetail from '../../lib/api/products/[id].js';

const routes = [
  { pattern: /^\/api\/products$/, methods: { GET: productsIndex, POST: productsIndex } },
  { pattern: /^\/api\/products\/([^\/]+)$/, methods: { GET: productDetail, PATCH: productDetail, DELETE: productDetail }, params: ['id'] },
];

export default createRouter(routes);
