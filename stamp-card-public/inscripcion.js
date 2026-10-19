(() => {
  const root=document.getElementById('registrationApp');
  const programId=(new URLSearchParams(location.search).get('programa')||'').trim().toLowerCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(v||0));
  const storageKey=`qori:stamp-registration:${programId}`;
  const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};
  const write=(key,value)=>{try{localStorage.setItem(key,value);}catch{/* Registration still works without storage. */}};
  let busy=false,loading=false,accessKey;
  function registrationKey(){
    if(accessKey)return accessKey;
    accessKey=read(`${storageKey}:key`);
    if(!/^[a-f0-9]{64}$/.test(accessKey||'')){
      accessKey=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
      write(`${storageKey}:key`,accessKey);
    }
    return accessKey;
  }
  async function request(path='',body){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      let response;
      try{response=await fetch(`/api/public/stamp-cards/programs/${encodeURIComponent(programId)}${path}`,{
        signal:controller.signal,method:body?'POST':'GET',cache:'no-store',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
      catch{throw new Error('No pudimos conectar con Qori. Revisa tu conexión y vuelve a intentarlo.');}
      let result;
      try{result=await response.json();}catch{throw new Error('Qori no pudo responder en este momento. Vuelve a intentarlo.');}
      if(!response.ok)throw new Error(result.error?.message||'No pudimos completar tu inscripción. Inténtalo de nuevo.');
      return result;
    }finally{clearTimeout(timer);}
  }
  function cardPath(url){
    const parsed=new URL(url,location.origin);
    if(parsed.pathname!=='/sellos/'||!/^#[a-f0-9]{64}$/.test(parsed.hash))throw new Error('El enlace de la tarjeta no es válido.');
    return `/sellos/${parsed.hash}`;
  }
  function savedCardLink(){
    const saved=read(`${storageKey}:card`);
    if(saved){try{return `<a class="saved-card" href="${esc(cardPath(saved))}">Abrir mi tarjeta guardada en este dispositivo</a>`;}catch{}}
    return '';
  }
  function render({business,program:p}){
    const logo=business.logo_data_url||business.logo_url||'';
    root.innerHTML=`<article class="loyalty-card"><div class="brand">${/^(data:image\/(png|jpeg|webp|gif);base64,|https?:\/\/|\/)/i.test(logo)?`<img src="${esc(logo)}" alt="Logo de ${esc(business.name)}">`:''}<span>${esc(business.name)}</span></div><p class="eyebrow">Tu próxima visita tiene recompensa</p><h1>${esc(p.name)}</h1><p class="reward">${esc(p.benefit_value.label)}</p><div class="dots" aria-label="Tu tarjeta comienza con cero de ${p.stamps_required} sellos">${Array.from({length:p.stamps_required},(_,i)=>`<span class="dot" aria-hidden="true">${i+1}</span>`).join('')}</div><p>${p.stamps_required} sellos para recibir tu beneficio</p></article>
      <section class="panel"><h2>Así funciona</h2><p>Cada compra ${p.purchase_product?`que incluya ${esc(p.purchase_product.product_name)} `:''}${Number(p.minimum_purchase)>0?`desde ${money(p.minimum_purchase)} `:''}suma un sello${p.one_per_day?', máximo uno al día':''}. Usa el mismo documento al comprar.</p><p>Tu tarjeta dura ${p.card_valid_days} días. Al completarla, puedes generar tu beneficio, válido por ${p.ticket_valid_days} días.</p>${p.terms?`<details><summary>Condiciones del programa</summary><p class="terms">${esc(p.terms)}</p></details>`:''}</section>
      <section class="panel"><h2>Crea tu tarjeta personal</h2><p>Regístrate una sola vez. Tu tarjeta comienza sin sellos y se actualiza con tus próximas compras o visitas válidas.</p><form id="registrationForm" class="registration-form">
      <label>Nombre completo<input name="name" autocomplete="name" minlength="2" maxlength="160" required></label>
      <label>Documento<input name="document_id" minlength="3" maxlength="80" required aria-describedby="documentHelp"></label><small id="documentHelp">Usa el mismo documento que presentarás en el negocio.</small>
      <label>Celular (opcional)<input name="phone" type="tel" autocomplete="tel" maxlength="40"></label>
      <label>Correo (opcional)<input name="email" type="email" autocomplete="email" maxlength="180"></label>
      <label class="consent"><input type="checkbox" name="consent" required><span>Autorizo a ${esc(business.name)} a usar mis datos para administrar mi tarjeta de fidelización y acepto las condiciones del programa. <a href="/privacidad/" target="_blank" rel="noopener noreferrer">Política de privacidad</a>.</span></label>
      <button type="submit">Crear mi tarjeta</button><p id="registrationMessage" role="status" aria-live="polite" class="message"></p></form><p>¿Ya tienes tarjeta? Abre tu enlace personal o pídele al negocio que te lo comparta.</p></section>`;
    root.querySelector('#registrationForm').insertAdjacentHTML('beforebegin',savedCardLink());
    root.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault();if(busy)return;busy=true;
      const button=e.target.querySelector('button'),message=root.querySelector('#registrationMessage');button.disabled=true;button.textContent='Creando tu tarjeta…';message.textContent='';
      try{
        const fields=new FormData(e.target),values=Object.fromEntries(fields);
        const result=await request('/enroll',{...values,email:values.email?.trim()||'',consent:fields.has('consent'),access_key:registrationKey()});
        const path=cardPath(result.url);write(`${storageKey}:card`,path);location.assign(path);
      }catch(error){message.textContent=error.message;button.disabled=false;button.textContent='Crear mi tarjeta';busy=false;}
    });
  }
  // Back navigation can restore the pre-redirect form with its submit button disabled.
  window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
  async function load(){
    if(loading)return;
    if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(programId)){
      root.innerHTML='<section class="panel"><h1>Enlace de inscripción incompleto</h1><p>Escanea nuevamente el QR del programa o pídele al negocio que te comparta su enlace de inscripción.</p></section>';return;
    }
    loading=true;root.innerHTML='<p class="loading" role="status">Cargando el programa…</p>';
    try{render(await request());}
    catch(error){
      root.innerHTML=`<section class="panel"><h1>No pudimos abrir la inscripción</h1><p role="alert">${esc(error.message)}</p>${savedCardLink()}<button id="retryRegistration" type="button">Volver a intentar</button><p>Si el problema continúa, consulta con el negocio.</p></section>`;
      root.querySelector('#retryRegistration').onclick=load;
    }finally{loading=false;}
  }
  load();
})();
