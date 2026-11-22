'use strict';
window.QoriInvoiceEntry={attach(nav){
 fetch('/api/invoice-capabilities',{cache:'no-store'}).then(r=>r.ok?r.json():{}).then(data=>{
  if(!data.sandbox||!nav.isConnected||nav.querySelector('[data-invoices]'))return;
  const a=document.createElement('a');a.className='nav-link';a.href='/customer/invoices/';
  a.dataset.invoices='true';a.textContent='Mis facturas · Sandbox';nav.append(a);
  const developers=document.createElement('a');developers.className='nav-link';developers.href='/developers/';developers.textContent='Qori Developers';nav.append(developers);
 }).catch(()=>{});
}};
