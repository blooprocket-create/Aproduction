// --- hotfix: currentUser helper ---
export async function currentUser(){
  try { return await api('/auth/me'); } catch { return null; }
}
