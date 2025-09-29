export function $(q, root=document){ return root.querySelector(q); }
export function $all(q, root=document){ return [...root.querySelectorAll(q)]; }
export function money(cents){ return new Intl.NumberFormat('en-US',{ style:'currency', currency:'USD' }).format((cents||0)/100); }
export function card(el, { title, subtitle, price_cents, badge, href }){
  el.innerHTML = `
    <div class="card product">
      ${badge?`<span class="badge">${badge}</span>`:''}
      <h3>${title}</h3>
      ${subtitle?`<p class="muted">${subtitle}</p>`:''}
      <div class="row" style="justify-content:space-between;align-items:end">
        <div class="price">${money(price_cents)}</div>
        <a class="button" href="${href}">View</a>
      </div>
    </div>`;
}
