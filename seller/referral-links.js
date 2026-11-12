(()=>{
 'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=value=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(value);
 function render(host,links,{isCurrent=()=>true}={}){
  host.className='seller-plan-links';
  host.innerHTML='<h2>Mis enlaces de embajador</h2><p>Elige el plan que quieres presentar. Cada enlace conserva tu atribución y abre la opción seleccionada.</p><div class="seller-plan-links-grid">'+links.map((plan,index)=>
   '<article class="card" data-plan-code="'+esc(plan.code)+'"><h3>'+esc(plan.name)+'</h3><p class="seller-plan-price">'+(plan.monthly_price_cop?money(plan.monthly_price_cop)+' COP / mes':'Gratis · sin mensualidad')+'</p><p>'+esc(plan.summary)+'</p><label>Tu enlace de '+esc(plan.name)+'<input type="url" readonly data-link value="'+esc(plan.url)+'" aria-label="Enlace personal de '+esc(plan.name)+'"></label><div class="actions"><button type="button" class="primary" data-copy>Copiar enlace</button><a data-whatsapp class="outline" href="https://wa.me/?text='+encodeURIComponent('Te comparto '+plan.name+' de Qori. Conoce el plan y crea tu cuenta aquí: '+plan.url)+'" target="_blank" rel="noopener noreferrer">WhatsApp</a><a '+(index===0?'id="referralLink" ':'')+'href="'+esc(plan.url)+'" target="_blank" rel="noopener noreferrer">Ver '+esc(plan.name)+' ↗</a></div><p role="status" data-status></p></article>').join('')+'</div><p class="small">Si ya registraste al cliente en Mi CRM, abre ese contacto y usa «Compartir suscripción» para conservar también su seguimiento.</p>';
  host.querySelectorAll('[data-copy]').forEach(button=>button.onclick=async()=>{
   if(button.disabled)return;const card=button.closest('article'),input=card.querySelector('[data-link]'),status=card.querySelector('[data-status]');button.disabled=true;
   try{await navigator.clipboard.writeText(input.value);if(host.isConnected&&isCurrent())status.textContent='Enlace copiado. Ya puedes compartirlo.';}
   catch{if(host.isConnected&&isCurrent()){input.focus();input.select();status.textContent='Selecciona y copia el enlace mostrado.';}}
   finally{button.disabled=false;}
  });
 }
 function bindProspectPlan(dialog,referral){
  const plans=(referral.plan_referral_links||[]).filter(p=>p.code!=='PENSE_EN_TI');if(!plans.length)return;
  const label=document.createElement('label');label.textContent='Elige el plan para este cliente';
  const select=document.createElement('select');select.dataset.referralPlan='';
  for(const p of [{code:'',name:'Ver todos los planes'},...plans]){const option=document.createElement('option');option.value=p.code;option.textContent=p.name;select.append(option);}
  label.append(select);dialog.querySelector('[data-link]').closest('label').before(label);
  select.onchange=()=>{
   const plan=plans.find(p=>p.code===select.value),url=plan?.url||referral.plan_referral_url;
   dialog.querySelector('[data-link]').value=url;
   dialog.querySelector('[data-whatsapp]').href='https://wa.me/?text='+encodeURIComponent('Te comparto '+(plan?.name||'los planes')+' de Qori. Usa el correo '+referral.email+': '+url);
   dialog.querySelector('[data-status]').textContent='';
  };
 }
 window.QoriSellerReferralLinks={render,bindProspectPlan};
})();
