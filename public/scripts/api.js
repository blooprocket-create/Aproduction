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

export const Auth = {
  me: () => api('/auth/me'),
  login: (email, password) => api('/auth/login', { method:'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password) => api('/auth/register', { method:'POST', body: JSON.stringify({ email, password }) }),
  logout: () => api('/auth/logout', { method:'POST' })
};

export function money(cents){ return new Intl.NumberFormat('en-US',{ style:'currency', currency:'USD' }).format((cents||0)/100); }
export async function currentUser(){ try { return await Auth.me(); } catch { return null; } }
export function track(name, data={}){ try { window.va && window.va.track && window.va.track(name, data); } catch {} }
