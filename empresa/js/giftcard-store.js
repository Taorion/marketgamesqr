/* Gift Card issuing capacity is independent of ticket balance and gift face value. */
(()=>{'use strict';
 let activeOwnerScope='';
 const canBuy=()=>typeof canManageBusinessBilling!=='function'||canManageBusinessBilling();
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v);
 const safeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}};
 function scope(){return typeof authHeaders==='function'?JSON.stringify(authHeaders()):'';}
 async function request(path,body){const r=await fetch(path,{method:body?'POST':'GET',headers:{...authHeaders(),...(body?{'Content-Type':'application/json'}:{})},cache:'no-store',...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.error?.message||data.message||'No pudimos consultar tu cuenta. Intenta de nuevo.');return data;}
 async function open(){
  if(!canBuy()){if(typeof showFeedback==='function')showFeedback('El titular de la cuenta administra las compras de emisiones.','info');return;}
  if(document.getElementById('giftcardStore'))return;
  const ownerScope=scope(),d=document.createElement('dialog');d.id='giftcardStore';d.className='giftcard-store';d.setAttribute('aria-labelledby','giftcardStoreTitle');
  d.innerHTML='<header><h2 id="giftcardStoreTitle">Emisiones de Gift Cards</h2><button type="button" data-close aria-label="Cerrar tienda de Gift Cards">×</button></header><div class="giftcard-store-body"><p>Cada emisión permite crear una Gift Card digital. Tú defines el valor del regalo y lo respaldas en tu negocio.</p><p class="giftcard-store-balance" data-balance>Cargando tu saldo…</p><p>Una emisión cuesta <strong>$2.500 COP</strong>. Los paquetes comprados se suman a tu saldo. No recargan tickets ni el valor monetario de las tarjetas.</p><div class="giftcard-store-grid" data-packages></div><p role="status" class="giftcard-store-status" data-status></p><button type="button" class="giftcard-store-action" data-refresh>Actualizar saldo y pagos</button><h3 style="margin-top:24px">Tus compras de Gift Cards</h3><div data-orders></div></div>';
  const previous=document.activeElement;activeOwnerScope=ownerScope;
  document.body.append(d);d.showModal();d.querySelector('[data-close]').onclick=()=>d.close();d.onclose=()=>{d.remove();previous?.focus?.();};
  const current=()=>d.isConnected&&ownerScope===scope(),message=v=>{if(current())d.querySelector('[data-status]').textContent=v;};
  let loading=false,buying=false;
  async function refresh(){if(loading||buying||!current())return;loading=true;const refreshButton=d.querySelector('[data-refresh]');refreshButton.disabled=true;
   try{const [catalog,balances,orders]=await Promise.all([request('/api/pense-en-ti/giftcards/packages'),request('/api/pense-en-ti/balances'),request('/api/payments/qr-credits/orders?limit=40')]);if(!current())return;
    d.querySelector('[data-balance]').textContent=Number(balances.balances?.giftcards||0)+' emisiones disponibles · '+Number(balances.balances?.tickets||0)+' tickets (saldo separado)';
    d.querySelector('[data-packages]').innerHTML=catalog.packages.map(p=>'<article class="giftcard-store-pack"><strong>'+Number(p.package_size)+'</strong><span>Gift Cards digitales</span><b>'+money(p.price_cop)+'</b><small>'+money(p.unit_price_cop)+' por emisión</small><button type="button" data-buy="'+esc(p.code)+'">Comprar '+Number(p.package_size)+'</button></article>').join('');
    const gifts=orders.orders.filter(o=>/^GF\d+$/.test(o.package_code));
    d.querySelector('[data-orders]').innerHTML=gifts.length?gifts.map(o=>'<article class="giftcard-store-order"><div><strong>'+esc(o.package_title)+'</strong><p>'+money(o.price_cop)+' · '+esc(o.status==='APPROVED'&&o.credited_at?'Pago verificado · saldo acreditado':o.status==='REJECTED'?'Pago rechazado':o.status==='CANCELLED'?'Cancelado':'Pendiente de confirmación')+'</p></div>'+(o.status==='PENDING'&&safeUrl(o.checkout_url)?'<a href="'+esc(safeUrl(o.checkout_url))+'">Continuar pago</a>':'')+'</article>').join(''):'<p>Aún no tienes compras de emisiones.</p>';
    d.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>buy(b.dataset.buy));
    document.dispatchEvent(new Event('qori:giftcard-balance'));message('El saldo se acredita cuando Qori verifica el pago. Volver de Mercado Pago no confirma el cobro.');
   }catch(e){message(e.message);if(current())d.querySelector('[data-balance]').textContent='Saldo pendiente de consulta';}finally{loading=false;if(current())refreshButton.disabled=false;}
  }
  async function buy(code){if(buying||!current())return;buying=true;d.querySelectorAll('[data-buy]').forEach(b=>b.disabled=true);message('Preparando pago seguro…');
   try{const storageKey='qori-giftcard-checkout:'+code+':'+(typeof session!=='undefined'?session?.user?.business_id||'':'local');let key;try{key=sessionStorage.getItem(storageKey);}catch{}key||=crypto.randomUUID();try{sessionStorage.setItem(storageKey,key);}catch{}
    const result=await request('/api/pense-en-ti/giftcards/checkout',{package_code:code,idempotency_key:key});if(!current())return;const order=result.order||result;
    if(order.credited_at||['REJECTED','CANCELLED','EXPIRED'].includes(order.status)){try{sessionStorage.removeItem(storageKey);}catch{}message('Esta orden ya terminó. Actualiza el saldo; puedes iniciar una nueva compra.');return;}
    const url=safeUrl(order.checkout_url);if(!url)throw Error('El pago todavía se está preparando. Reintenta en unos instantes.');location.assign(url);
   }catch(e){message(e.message);}finally{buying=false;if(current())d.querySelectorAll('[data-buy]').forEach(b=>b.disabled=false);}
  }
  d.querySelector('[data-refresh]').onclick=refresh;await refresh();
 }
 document.addEventListener('click',e=>{if(e.target.closest('[data-giftcard-store]'))open();});
 function sync(){const plan=typeof currentPlan==='function'?currentPlan():null,enabled=canBuy()&&plan?.features?.gift_cards&&!Number.isFinite(plan?.limits?.gift_cards_total);const panel=document.getElementById('giftcardBillingPanel');if(panel)panel.hidden=!enabled;
  if(document.getElementById('giftcardStore')&&activeOwnerScope!==scope())document.getElementById('giftcardStore').close();
  const head=document.getElementById('rewardPassTicketContext');if(enabled&&head&&!document.getElementById('rewardPassBuyGiftcards')){const b=document.createElement('button');b.id='rewardPassBuyGiftcards';b.type='button';b.className='ghost-button';b.dataset.giftcardStore='';b.textContent='Comprar Gift Cards';head.after(b);}
  if(!enabled)document.getElementById('rewardPassBuyGiftcards')?.remove();
 }
 const timer=setInterval(sync,1500);window.addEventListener('pagehide',()=>clearInterval(timer));sync();window.QoriGiftcardStore={open};
})();
