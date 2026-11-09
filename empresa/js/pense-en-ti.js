(()=>{'use strict';let current='',loading=false;
async function mount(){if(loading)return;loading=true;try{
 if(typeof authHeaders!=='function')return;const headers=authHeaders(),scope=JSON.stringify(headers);
 if(!headers.Authorization){current='';document.getElementById('penseEnTiWelcome')?.remove();return;}if(current===scope)return;
 const response=await fetch('/api/pense-en-ti/balances',{headers});if(!response.ok)return;const {balances:b}=await response.json();if(scope!==JSON.stringify(authHeaders()))return;
 if(b?.plan_code!=='PENSE_EN_TI'){current=scope;document.getElementById('penseEnTiWelcome')?.remove();return;}
 const packs=await fetch('/api/pense-en-ti/giftcards/packages',{headers});if(!packs.ok)return;const {packages}=await packs.json();if(scope!==JSON.stringify(authHeaders()))return;
 current=scope;document.getElementById('penseEnTiWelcome')?.remove();const box=document.createElement('section');box.id='penseEnTiWelcome';box.className='qco';
 const money=v=>Number(v).toLocaleString('es-CO');
 box.innerHTML='<article><h2>Pensé en ti · Tu negocio empieza gratis</h2><p><strong>'+Number(b.tickets)+' tickets</strong> · <strong>'+Number(b.giftcards)+' giftcards por emitir</strong> · '+Number(b.products)+' de 5 productos.</p><p>Incluye un programa de sellos, Cortesías y la entrega inicial única de 20 tickets y 20 giftcards. Sin recarga automática.</p><nav><button data-step="inventory">Mis productos</button><button data-step="courtesies">Cortesías</button><button data-step="stamp-cards">Mi programa de sellos</button><button data-step="reward-passes">Mis giftcards</button><button data-step="validator">Validar entrega</button><button data-step="account">Comprar tickets</button></nav><form data-giftcards><h3>Recargar giftcards</h3><p>Cada emisión cuesta $2.500 COP. Este precio habilita una giftcard; su valor para el beneficiario lo defines y respaldas tú.</p><label>Paquete<select name="package_code">'+packages.map(p=>'<option value="'+p.code+'">'+p.package_size+' giftcards · $'+money(p.price_cop)+' COP</option>').join('')+'</select></label><button type="submit">Ir al pago del paquete elegido</button></form><p role="status" data-status></p></article>';
 (document.querySelector('main')||document.body).prepend(box);
 box.querySelectorAll('[data-step]').forEach(btn=>btn.onclick=()=>document.querySelector('button[data-view="'+btn.dataset.step+'"]')?.click());
 const keys=new Map(),form=box.querySelector('form');let busy=false;
 form.onsubmit=async e=>{e.preventDefault();e.stopPropagation();if(busy||scope!==JSON.stringify(authHeaders()))return;busy=true;const btn=form.querySelector('button');btn.disabled=true;
 try{const code=form.elements.package_code.value;if(!keys.has(code))keys.set(code,crypto.randomUUID());const r=await fetch('/api/pense-en-ti/giftcards/checkout',{method:'POST',headers:{...authHeaders(),'Content-Type':'application/json'},body:JSON.stringify({package_code:code,idempotency_key:keys.get(code)})}),d=await r.json();if(scope!==JSON.stringify(authHeaders()))return;if(!r.ok)throw Error(d.error?.message||'No se pudo crear el pago.');const url=new URL(d.checkout_url);if(url.protocol!=='https:'||!['www.mercadopago.com.co','www.mercadopago.com','sandbox.mercadopago.com.co'].includes(url.hostname))throw Error('El enlace de pago no está disponible.');location.href=url.href;
 }catch(e){box.querySelector('[data-status]').textContent=e.message;}finally{busy=false;btn.disabled=false;}};
}catch{}finally{loading=false;}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)current='';});setInterval(()=>{if(!document.querySelector('#penseEnTiWelcome form')?.contains(document.activeElement)){current='';mount();}},30000);mount();
})();
