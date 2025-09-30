import { currentUser, Auth } from '/scripts/api.js';

function show(el){ el && (el.style.display=''); }
function hide(el){ el && (el.style.display='none'); }

const HAMBURGER_SVG = `
<svg class="hamburger-icon" width="24" height="24" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="mh1" x1="0" x2="1"><stop offset="0%" stop-color="#8a7cff"/><stop offset="100%" stop-color="#e45aff"/></linearGradient>
  </defs>
  <g fill="none" stroke="url(#mh1)" stroke-width="2.4" stroke-linecap="round">
    <path d="M8 12 H32">
      <animate attributeName="d" dur="2s" repeatCount="indefinite"
        values="M8 12 H32; M10 12 H30; M8 12 H32" />
    </path>
    <path d="M8 20 H32">
      <animate attributeName="d" dur="2.2s" repeatCount="indefinite"
        values="M8 20 H32; M12 20 H28; M8 20 H32" />
    </path>
    <path d="M8 28 H32">
      <animate attributeName="d" dur="2.4s" repeatCount="indefinite"
        values="M8 28 H32; M14 28 H26; M8 28 H32" />
    </path>
  </g>
</svg>`;

export async function wireNav(active=''){
  const me = await currentUser();

  const nav = document.querySelector('.nav');
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');

  if (toggle){
    // Inject the animated icon if empty (robust for merged HTML that has no text)
    if (!toggle.innerHTML.trim()) toggle.innerHTML = HAMBURGER_SVG;

    // Fallback if SVG somehow fails to attach
    queueMicrotask(()=>{
      if (!toggle.querySelector('svg')) toggle.textContent = '☰';
    });

    toggle.addEventListener('click', (e)=>{
      e.preventDefault();
      const opened = nav.classList.toggle('open');
      let overlay = document.querySelector('.nav-overlay');
      if (opened){
        if (!overlay){
          overlay = document.createElement('div');
          overlay.className = 'nav-overlay';
          nav.after(overlay);
        }
        overlay.onclick = () => { nav.classList.remove('open'); overlay.remove(); document.documentElement.style.overflow=''; };
        document.documentElement.style.overflow = 'hidden';
      } else {
        overlay && overlay.remove();
        document.documentElement.style.overflow = '';
      }
    });
  }

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
    linkLogout.onclick = async (e)=>{
      e.preventDefault();
      try { await Auth.logout(); } catch {}
      location.href = '/';
    };
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
