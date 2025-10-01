const API = '/api';
export async function api(path, opts={}){
  const init = { credentials:'include', headers:{ 'content-type':'application/json' }, ...opts };
  const r = await fetch(`${API}${path}`, init);
  let j = null;
  try { j = await r.json(); } catch { throw new Error(`Bad JSON from ${path}`); }
  if (!r.ok || !j?.ok) throw new Error(j?.error || `Request failed (${r.status})`);
  return j.data;
}
export const Auth = {
  me: () => api('/auth/me'),
  login: (email, password) => api('/auth/login', { method:'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password) => api('/auth/register', { method:'POST', body: JSON.stringify({ email, password }) }),
  logout: () => api('/auth/logout', { method:'POST' })
};
export function money(cents){ return new Intl.NumberFormat('en-US',{ style:'currency', currency:'USD' }).format((cents||0)/100); }
export async function currentUser(){
  try { return await Auth.me(); } catch { return null; }
}
// Vercel Web Analytics (window.va) convenience wrapper (no-op if not present)
export function track(name, data={}){
  try { if (typeof window !== 'undefined' && window.va && typeof window.va.track==='function') window.va.track(name, data); } catch {}
}

// --- Service helpers (appended by patch 19) ---
export const Service = {
  list: (params='') => api('/services' + params),
  request: ({ service_id, title, details }) =>
    api('/services', { method:'POST', body: JSON.stringify({ op:'request', service_id, title, details }) }),
  myRequests: () => api('/services?mine=1'),
  adminRequests: () => api('/services?admin=1'),
  quote: (request_id, price_cents) =>
    api(`/services/${request_id}`, { method:'PATCH', body: JSON.stringify({ op:'quote', request_id, price_cents }) }),
  accept: (request_id) =>
    api(`/services/${request_id}`, { method:'PATCH', body: JSON.stringify({ op:'accept', request_id }) }),
  markPaid: (request_id) =>
    api(`/services/${request_id}`, { method:'PATCH', body: JSON.stringify({ op:'paid', request_id }) }),
  deliver: (request_id, { label, file_key, mime_type, bytes }) =>
    api(`/services/${request_id}`, { method:'PATCH', body: JSON.stringify({ op:'deliver', request_id, label, file_key, mime_type, bytes }) }),
  message: (request_id, bodyText) =>
    api(`/services/${request_id}`, { method:'POST', body: JSON.stringify({ op:'message', request_id, body: bodyText }) }),
};
