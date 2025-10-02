import { createRouter } from '../../lib/api/router.js';
import servicesIndex from '../../lib/api/services/index.js';
import serviceDetail from '../../lib/api/services/[id].js';

const routes = [
  { pattern: /^\/api\/services$/, methods: { GET: servicesIndex, POST: servicesIndex } },
  { pattern: /^\/api\/services\/([^\/]+)$/, methods: { GET: serviceDetail, PATCH: serviceDetail, DELETE: serviceDetail, POST: serviceDetail }, params: ['id'] },
];

export default createRouter(routes);
