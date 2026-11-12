(() => {
  'use strict';
  const token=new URLSearchParams(location.hash.slice(1)).get('activar');
  window.QoriSellerActivation={active:Boolean(token)};
  if(!token)return;
  history.replaceState(null,'',location.pathname+location.search);
  sessionStorage.removeItem('qori-seller-token');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const panel=document.createElement('section');panel.id='sellerActivation';panel.className='section';panel.setAttribute('aria-label','Activa tu cuenta de embajador');
  panel.innerHTML='<h1>Activa tu cuenta de embajador</h1><p role="status">Comprobando tu enlace…</p>';
  document.querySelector('#main').prepend(panel);document.querySelector('#landing').hidden=true;document.querySelector('#loginOpen').hidden=true;
  async function request(path,body){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error?.details?.formErrors?.[0]||d.error?.message||'No se pudo activar la cuenta.');return d;}
  request('/api/seller/activation/preview',{token}).then(({seller,terms})=>{
    panel.innerHTML=`<span class="eyebrow">BIENVENIDO A QORI SELLER</span><h1>Crea tu contraseña</h1><p>Hola, ${esc(seller.full_name)}. Qori creó tu cuenta con el correo <strong>${esc(seller.email)}</strong>. Define una contraseña que solo tú conozcas. Aquí encontrarás tu enlace personal, las herramientas para presentar Qori y el seguimiento de tus comisiones y pagos.</p><form class="card form-grid" id="sellerActivationForm"><label>Contraseña<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="72" required></label><label>Confirma la contraseña<input name="password_confirm" type="password" autocomplete="new-password" minlength="12" maxlength="72" required></label><p class="full">Usa al menos 12 caracteres. Esta contraseña también servirá para Demo Qori cuando tengas el acceso aprobado.</p><div class="full" id="activationTerms">${terms.clauses.map(c=>`<details><summary>${esc(c.title)}</summary><p>${esc(c.text)}</p></details>`).join('')}</div><label class="check full"><input type="checkbox" name="terms_accepted" required>Leí y acepto las condiciones del programa y el requisito CIIU ${esc(terms.ciiu_requirement.code)}.</label><label class="check full"><input type="checkbox" name="privacy_accepted" required>Autorizo el tratamiento de mis datos para gestionar mi participación según las condiciones anteriores.</label><label class="check full"><input type="checkbox" name="adult_confirmed" required>Confirmo que soy mayor de edad.</label><button type="submit" class="primary full">Crear contraseña y activar cuenta</button><p class="status full" role="status"></p></form>`;
    const form=panel.querySelector('form');
    form.onsubmit=async e=>{e.preventDefault();const b=form.querySelector('button'),status=form.querySelector('[role=status]');if(b.disabled)return;status.textContent='';if(form.elements.password.value!==form.elements.password_confirm.value){status.textContent='Las contraseñas no coinciden.';return;}
      b.disabled=true;
      try{const r=await request('/api/seller/activation/complete',{token,password:form.elements.password.value,password_confirm:form.elements.password_confirm.value,terms_version:terms.version,...Object.fromEntries(['terms_accepted','privacy_accepted','adult_confirmed'].map(k=>[k,form.elements[k].checked]))});form.reset();window.QoriSellerActivation.active=false;panel.innerHTML='<h2>Tu cuenta está activada</h2><p>Ya puedes entrar con tu correo y la contraseña que acabas de crear. El acceso comercial depende de la aprobación de Qori.</p><button type="button" class="primary" id="activatedSellerLogin">Iniciar sesión</button>';document.querySelector('#loginOpen').hidden=false;panel.querySelector('button').onclick=()=>window.dispatchEvent(new CustomEvent('qori-seller-activated',{detail:{email:r.email}}));}
      catch(error){status.textContent=error.message;}finally{b.disabled=false;}
    };
  }).catch(error=>{panel.innerHTML=`<h1>No pudimos abrir tu activación</h1><p role="alert">${esc(error.message)}</p><p>Pide a tu administrador que genere un nuevo enlace desde tu expediente.</p><a href="/seller/">Volver a Seller</a>`;});
})();
