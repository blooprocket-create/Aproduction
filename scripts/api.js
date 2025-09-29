const API = '/api';
export async function api(path, opts={}){
  const r = await fetch(`${API}${path}`, { credentials:'include', headers:{ 'content-type':'application/json' }, ...opts });
  const j = await r.json().catch(()=>({ ok:false, error:'bad json' }));
  if (!r.ok) throw new Error(j.error||'Request failed');
  return j.data;
}
export const Auth = {
  me: () => api('/auth/me'),
  login: (email, password) => api('/auth/login', { method:'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password) => api('/auth/register', { method:'POST', body: JSON.stringify({ email, password }) }),
  logout: () => api('/auth/logout')
};
