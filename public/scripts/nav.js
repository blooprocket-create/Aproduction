import { currentUser, Auth } from '/scripts/api.js';

let wired = false;

function show(el){ el && (el.style.display=''); }
function hide(el){ el && (el.style.display='none'); }

export async function wireNav(active=''){
  if (wired) return;
  wired = true;

  const me = await currentUser();
  const linkLogin = document.getElementById('nav-login');
  const linkLogout = document.getElementById('nav-logout');
  const linkControl = document.getElementById('nav-control');
  const linkAccount = document.getElementById('nav-account');

  if (me){
    hide(linkLogin);
    show(linkAccount);
    linkAccount.textContent = 'Account';
    show(linkLogout);
    linkLogout.textContent = `Logout (${me.email.split('@')[0]})`;
    linkLogout.addEventListener('click', async (e)=>{
      e.preventDefault();
      try { await Auth.logout(); } catch {}
      location.href = '/';
    }, { once:true });
    if (['admin','editor'].includes(me.role)){ show(linkControl); } else { hide(linkControl); }
  } else {
    show(linkLogin);
    hide(linkLogout);
    hide(linkControl);
    hide(linkAccount);
  }

  if (active){
    const act = document.getElementById(active);
    if (act){ act.classList.add('active'); }
  }
}
