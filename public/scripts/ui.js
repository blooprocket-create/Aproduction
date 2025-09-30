export function card(el, { title, subtitle, price_cents, badge, href }){
  el.innerHTML = `
    <div class="card product">
      ${badge?`<span class="badge">${badge}</span>`:''}
      <h3>${title}</h3>
      ${subtitle?`<p class="muted">${subtitle}</p>`:''}
      <div class="row" style="justify-content:space-between;align-items:end">
        <div class="price">${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format((price_cents||0)/100)}</div>
        <a class="button" href="${href}">View</a>
      </div>
    </div>`;
}
