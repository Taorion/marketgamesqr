(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function render(host,ctx){
  host.innerHTML='<main id="main" class="finance-setup"><p role="status">Preparando tus finanzas…</p></main>';
  const loading=host.firstElementChild;
  let info;
  try{info=await ctx.request('/finance-setup');}
  catch(e){if(host.firstElementChild!==loading)return;host.innerHTML='<main id="main" class="finance-setup"><h1>Prepara tus finanzas</h1><p id="pageError" role="alert">'+esc(e.message)+'</p><button class="primary" id="retryFinanceSetup">Reintentar</button><button class="quiet" data-action="logout">Cerrar sesión</button></main>';host.querySelector('#retryFinanceSetup').onclick=()=>render(host,ctx);return;}
  if(host.firstElementChild!==loading)return;
  if(info.state!=='PENDING'){
   try{await ctx.refresh();}
   catch(e){if(host.firstElementChild!==loading)return;host.innerHTML='<main id="main" class="finance-setup"><h1>Tu saldo ya está guardado</h1><p id="pageError" role="alert">'+esc(e.message)+'</p><button id="retryFinanceSetup" class="primary">Continuar a mi portal</button></main>';host.querySelector('#retryFinanceSetup').onclick=()=>render(host,ctx);}
   return;
  }
  const requestId=crypto.randomUUID();
  let balance='',busy=false;
  const money=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:info.currency,maximumFractionDigits:2}).format(Number(v));
  host.innerHTML='<main id="main" class="finance-setup"><div class="finance-setup-card">'+ctx.brand()+
   '<p class="eyebrow">Tu punto de partida</p><h1>Prepara mis finanzas</h1><p>Antes de entrar, cuéntale a Qori cuánto dinero tienes hoy. Solo necesitas hacer esta preparación una vez.</p>'+
   '<ol class="finance-setup-steps" aria-label="Pasos de preparación"><li id="setupStep1" aria-current="step">1. Mi saldo actual</li><li id="setupStep2">2. Confirmar</li></ol>'+
   '<form id="financeSetupAmount"><h2>¿Con cuánto empiezas?</h2><p>Suma el dinero que tienes en efectivo, bancos y billeteras digitales para tu bolsillo <strong>'+esc(info.pocket_name)+'</strong>. No incluyas ingresos que todavía no has recibido.</p>'+
   '<label class="field" for="initialRealBalance">Saldo real actual ('+esc(info.currency)+')</label><input id="initialRealBalance" name="balance" type="number" step="0.01" required aria-describedby="initialBalanceHelp" placeholder="Escribe tu saldo" autocomplete="off">'+
   '<p id="initialBalanceHelp" class="small muted">Puedes escribir 0 si empiezas sin dinero, o un valor negativo si tu saldo está por debajo de cero. Por ejemplo: -50000. Usa el punto para decimales y no uses separadores de miles.</p>'+
   '<p class="small">Después podrás repartir este saldo entre tus cajas: efectivo, banco, Nequi y otras.</p><button type="submit" class="primary wide">Revisar mi saldo →</button></form>'+
   '<form id="financeSetupConfirm" hidden><h2>Este será tu punto de partida</h2><p>Saldo actual en '+esc(info.pocket_name)+'</p><strong id="setupAmount" class="finance-setup-amount"></strong><p>'+esc(info.currency)+' · '+esc(info.today)+'</p>'+
   '<p>Qori usará este saldo para calcular cuánto te queda después de tus próximos ingresos y gastos. Es tu saldo inicial, no un ingreso nuevo.</p>'+
   '<p class="small muted">Si ya tienes movimientos registrados hoy, Qori los tendrá en cuenta para que tu saldo actual coincida con el que confirmas.</p>'+
   '<label class="check"><input name="confirmed" type="checkbox" required><span>Confirmo que este es mi saldo real actual.</span></label>'+
   '<button type="submit" class="primary wide">Guardar saldo y entrar a Qori →</button><button type="button" class="quiet" id="editInitialBalance">Corregir saldo</button></form>'+
   '<p id="pageError" class="error" role="alert" tabindex="-1"></p><button type="button" class="quiet" data-action="logout">Cerrar sesión y continuar después</button></div></main>';
  const amount=host.querySelector('#financeSetupAmount'),confirm=host.querySelector('#financeSetupConfirm'),input=amount.elements.balance,error=host.querySelector('#pageError');
  const show=step=>{amount.hidden=step!==1;confirm.hidden=step!==2;for(const n of [1,2]){const el=host.querySelector('#setupStep'+n);if(n===step)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');}error.textContent='';};
  amount.onsubmit=e=>{e.preventDefault();e.stopPropagation();if(!amount.reportValidity())return;balance=input.value.trim();if(!/^-?\d{1,10}(\.\d{1,2})?$/.test(balance)){error.textContent='Escribe un saldo válido, con máximo dos decimales.';return;}host.querySelector('#setupAmount').textContent=money(balance);confirm.elements.confirmed.checked=false;show(2);confirm.elements.confirmed.focus();};
  host.querySelector('#editInitialBalance').onclick=()=>{if(busy)return;show(1);input.focus();};
  confirm.onsubmit=async e=>{
   e.preventDefault();e.stopPropagation();if(busy||!confirm.reportValidity())return;
   busy=true;error.textContent='';for(const b of confirm.querySelectorAll('button'))b.disabled=true;
   try{await ctx.request('/finance-setup',{request_id:requestId,balance,currency:info.currency,expected_date:info.today,confirmed:true});await ctx.refresh();}
   catch(e){error.textContent=e.message;error.focus();if(/Cambió el día|moneda cambió/.test(e.message)){const retry=document.createElement('button');retry.className='secondary';retry.textContent='Actualizar preparación';retry.onclick=()=>render(host,ctx);error.after(retry);}}
   finally{busy=false;for(const b of confirm.querySelectorAll('button'))b.disabled=false;}
  };
 }
 window.QoriFinanceSetup={render};
})();
