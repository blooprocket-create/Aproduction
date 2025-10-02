export async function ensureBody(req) {
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

export function createRouter(routes) {
  return async function handler(req, res) {
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
      console.error('API router error', error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'Server error' }));
      }
    }
  };
}
