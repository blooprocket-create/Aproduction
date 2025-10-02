import authLogin from '../lib/api/auth/login.js';
import authRegister from '../lib/api/auth/register.js';
import authLogout from '../lib/api/auth/logout.js';
import authMe from '../lib/api/auth/me.js';

import productsIndex from '../lib/api/products/index.js';
import productDetail from '../lib/api/products/[id].js';

import servicesIndex from '../lib/api/services/index.js';
import serviceDetail from '../lib/api/services/[id].js';

import ordersIndex from '../lib/api/orders/index.js';
import entitlements from '../lib/api/me/entitlements.js';

import adminStats from '../lib/api/admin/stats.js';
import adminUsers from '../lib/api/admin/users/index.js';
import adminUserDetail from '../lib/api/admin/users/[id].js';

const routes = [
  { pattern: /^\/api\/auth\/login$/, methods: { POST: authLogin } },
  { pattern: /^\/api\/auth\/register$/, methods: { POST: authRegister } },
  { pattern: /^\/api\/auth\/logout$/, methods: { POST: authLogout } },
  { pattern: /^\/api\/auth\/me$/, methods: { GET: authMe } },

  { pattern: /^\/api\/products$/, methods: { GET: productsIndex, POST: productsIndex } },
  { pattern: /^\/api\/products\/([^\/]+)$/, methods: { GET: productDetail, PATCH: productDetail, DELETE: productDetail }, params: ['id'] },

  { pattern: /^\/api\/services$/, methods: { GET: servicesIndex, POST: servicesIndex } },
  { pattern: /^\/api\/services\/([^\/]+)$/, methods: { GET: serviceDetail, PATCH: serviceDetail, DELETE: serviceDetail, POST: serviceDetail }, params: ['id'] },

  { pattern: /^\/api\/orders$/, methods: { GET: ordersIndex, POST: ordersIndex } },
  { pattern: /^\/api\/me\/entitlements$/, methods: { GET: entitlements } },

  { pattern: /^\/api\/admin\/stats$/, methods: { GET: adminStats } },
  { pattern: /^\/api\/admin\/users$/, methods: { GET: adminUsers, POST: adminUsers } },
  { pattern: /^\/api\/admin\/users\/([^\/]+)$/, methods: { PATCH: adminUserDetail, DELETE: adminUserDetail }, params: ['id'] },
];

async function ensureBody(req) {
  if (req.body !== undefined) return;
  if (req.method === 'GET' || req.method === 'HEAD') {
    req.body = {};
    return;
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  if (!chunks.length) {
    req.body = {};
    return;
  }
  const raw = Buffer.concat(chunks).toString();
  if (!raw) {
    req.body = {};
    return;
  }
  if (req.headers['content-type']?.includes('application/json')) {
    try {
      req.body = JSON.parse(raw);
    } catch {
      req.body = {};
    }
  } else {
    req.body = raw;
  }
}

export default async function handler(req, res) {
  try {
    await ensureBody(req);

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    req.query = Object.fromEntries(url.searchParams.entries());

    for (const route of routes) {
      const match = pathname.match(route.pattern);
      if (!match) continue;
      const methodHandler = route.methods[req.method];
      if (!methodHandler) {
        res.statusCode = 405;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
        return;
      }
      if (route.params) {
        route.params.forEach((name, index) => {
          req.query[name] = match[index + 1];
        });
      }
      await methodHandler(req, res);
      return;
    }

    res.statusCode = 404;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Not found' }));
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: 'Server error' }));
    }
  }
}
