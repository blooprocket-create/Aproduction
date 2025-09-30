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
