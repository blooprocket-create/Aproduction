const API = '/api';

async function parseMaybeJSON(res){
  const text = await res.text();
  try { return { json: JSON.parse(text), raw: text }; }
  catch { return { json: null, raw: text }; }
}

export async function api(path, opts={}){
  const init = {
    method: 'GET',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    ...opts
  };
  const res = await fetch(`${API}${path}`, init);
  const { json, raw } = await parseMaybeJSON(res);

  if (!res.ok) {
    const msg = json?.error || json?.message || raw?.slice(0, 200) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (!json) {
    console.error('Non-JSON response from', path, 'raw:', raw);
    throw new Error(`Server returned non-JSON for ${path}. See console.`);
  }
  if (json && json.ok === false) {
    throw new Error(json.error || 'Request failed');
  }
  return json.data ?? json;
}

export function money(cents){ return new Intl.NumberFormat('en-US',{ style:'currency', currency:'USD' }).format((cents||0)/100); }
export async function currentUser(){ try { return await api('/auth/me'); } catch { return null; } }

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
