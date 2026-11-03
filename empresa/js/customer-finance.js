/* Sends existing canonical sales to an explicitly selected Customer account. */
(() => {
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const call=(path,method='GET',body)=>api('/api/business/customer'+path,{method,headers:authHeaders(),noClientCache:true,...(body?{body:JSON.stringify(body)}:{})});
 const money=(v,c)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:c||'COP',maximumFractionDigits:0}).format(Number(v));
 function open(saleId=''){
  if(document.getElementById('customerFinanceDialog'))return;
  const d=document.createElement('dialog');d.id='customerFinanceDialog';d.className='customer-network-dialog';
  d.innerHTML='<header><div><span class="kicker">Empresa + Customer</span><h2>Enviar una compra a Customer</h2></div><button data-close aria-label="Cerrar">×</button></header><div class="customer-network-body"><p>Selecciona una venta ya registrada y verifica la cuenta del comprador. Su historial conservará el importe, el estado y las devoluciones de la venta original.</p><p id="deliveryMessage" role="status"></p><form id="deliverySearch"><label>Buscar venta por cliente, documento, producto o referencia<input name="search" value="'+esc(saleId)+'" maxlength="160"></label><button>Buscar ventas</button></form><div id="deliverySales"></div><button id="deliveryMore" hidden>Cargar más ventas</button><div id="deliveryRecipient"></div><details><summary>Compras reportadas por compradores</summary><button id="loadFinanceReports">Consultar reportes</button><div id="financeReports"></div></details></div>';
  document.body.append(d);d.showModal();d.querySelector('[data-close]').onclick=()=>d.close();d.onclose=()=>d.remove();
  const message=text=>{d.querySelector('#deliveryMessage').textContent=text;};
  let offset=0,sales=[],selectionVersion=0;
  async function load(append=false){
   const term=d.querySelector('#deliverySearch input').value,r=await call('/sale-deliveries?'+new URLSearchParams({search:term,offset:append?offset:0}));
   if(!d.isConnected)return;sales=append?sales.concat(r.sales):r.sales;offset=r.next_offset;d.querySelector('#deliveryMore').hidden=offset==null;
   d.querySelector('#deliverySales').innerHTML=sales.map(s=>'<article class="customer-network-row"><div><strong>'+esc(s.customer_name||'Cliente sin nombre')+' · '+money(s.sale_amount,s.currency)+'</strong><p>'+esc(s.product_name||'Compra registrada')+' · '+esc(s.created_at.slice(0,10))+' · '+esc({PAID:'Pagada',PENDING:'Pendiente de pago',VOIDED:'Anulada'}[s.sale_status]||s.sale_status)+'</p><small style="overflow-wrap:anywhere">Referencia: '+esc(s.id)+'</small>'+(s.delivery_state?'<p>Enviada a '+esc(s.recipient_name)+' · '+esc({PENDING:'Por aceptar',ACCEPTED:'En su historial',REJECTED:'Rechazada',CANCELLED:'Cancelada'}[s.delivery_state])+'</p>':s.sale_status!=='VOIDED'?'<button data-select-sale="'+s.id+'">Elegir esta venta</button>':'')+'</div></article>').join('')||'<p>No encontramos ventas. Registra primero la venta en Empresa.</p>';
   d.querySelectorAll('[data-select-sale]').forEach(b=>b.onclick=()=>choose(sales.find(s=>s.id===b.dataset.selectSale)));
  }
  function choose(s){
   const version=++selectionVersion,host=d.querySelector('#deliveryRecipient');
   host.innerHTML='<h3>Comprador que recibirá esta venta</h3><p>'+esc(s.product_name)+' · '+money(s.sale_amount,s.currency)+'</p><form id="findFinanceBuyer"><label>Correo completo o identificación Qori<input name="query" minlength="3" maxlength="180" required placeholder="cliente@correo.com"></label><button>Buscar cuenta Customer</button></form><div id="financeBuyer"></div>';host.scrollIntoView({block:'nearest',behavior:'smooth'});
   host.querySelector('form').onsubmit=async e=>{
    e.preventDefault();e.stopPropagation();e.submitter.disabled=true;
    try{
     const {buyer}=await call('/lookup','POST',Object.fromEntries(new FormData(e.target))),requestId=crypto.randomUUID();
     if(version!==selectionVersion||!host.isConnected)return;
     host.querySelector('#financeBuyer').innerHTML='<form id="sendFinanceSale"><h3>'+esc(buyer.full_name||'Cuenta Customer')+'</h3><p style="overflow-wrap:anywhere">'+esc(buyer.public_id)+'</p><label class="cb-check"><input name="identity" type="checkbox" required> Verifiqué que esta cuenta Qori corresponde al comprador de esta venta.</label><p>Si aún no autorizó la recepción automática, recibirá una invitación para confirmar que la compra es suya.</p><button>Enviar compra a su Customer</button></form>';
     host.querySelector('#sendFinanceSale').onsubmit=async ev=>{
      ev.preventDefault();ev.stopPropagation();ev.submitter.disabled=true;
      try{const result=await call('/sale-deliveries','POST',{sale_id:s.id,public_id:buyer.public_id,request_id:requestId,identity_checked:ev.target.elements.identity.checked});host.innerHTML='';await load();message(result.invitation.state==='ACCEPTED'?'Compra incorporada al historial de Customer. Se conserva una sola venta.':'Compra enviada. El comprador podrá revisarla en sus invitaciones.');}
      catch(error){message(error.message);ev.submitter.disabled=false;}
     };
    }catch(error){message(error.message);}finally{e.submitter.disabled=false;}
   };
  }
  d.querySelector('#deliverySearch').onsubmit=e=>{e.preventDefault();e.stopPropagation();load().catch(e=>message(e.message));};
  d.querySelector('#deliveryMore').onclick=()=>load(true).catch(e=>message(e.message));
  d.querySelector('#loadFinanceReports').onclick=async()=>{try{const r=await call('/reports');d.querySelector('#financeReports').innerHTML=r.reports.map(x=>'<article><strong>Venta '+esc(x.sale_id)+'</strong><p>'+esc(x.report_reason)+'</p></article>').join('')||'<p>Sin reportes.</p>';}catch(e){message(e.message);}};
  load().catch(e=>message(e.message));
 }
 window.QoriCustomerFinance={open};
 const timer=setInterval(()=>{if(typeof session==='undefined'||!session)return;for(const host of document.querySelectorAll('.view-head'))if(!host.querySelector('[data-customer-finance]')){const b=document.createElement('button');b.className='ghost-button';b.type='button';b.dataset.customerFinance='true';b.textContent='Enviar compra a Customer';b.onclick=()=>open();host.append(b);}},1500);
 window.addEventListener('pagehide',()=>clearInterval(timer));
})();
