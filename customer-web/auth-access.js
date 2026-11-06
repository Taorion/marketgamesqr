/* Authentication UI only. No credentials or tokens are persisted in browser storage. */
(() => {
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let generation=0;
 function render(app,ctx,error=''){
  const version=++generation,s=ctx.state,connecting=location.hash==='#oauth-connect',mode=s.authMode||'login',verifying=!!s.challenge,setup=['signup','reset'].includes(mode);
  const title=verifying?'Revisa tu correo':connecting?'Conecta tu cuenta Qori':mode==='signup'?'Crea tu cuenta gratuita':mode==='reset'?'Crea una nueva contraseña':mode==='code'?'Entra con un código':'Bienvenido a Qori';
  app.innerHTML=`<div class="auth-layout"><section class="auth-story">${ctx.brand()}<div><div class="eyebrow">Qori cuida tu bolsillo</div><h1>Tu dinero.<br>Tus planes.<br><em>En orden.</em></h1><p>Finanzas, compras y beneficios en un solo lugar. Una cuenta gratuita para organizar cada parte de tu vida.</p><div class="auth-art" aria-hidden="true"><div class="sample-card"><div class="eyebrow">Cada peso cuenta</div><h3>Tu tranquilidad,<br>todos los días.</h3><p>Tus ingresos, tus gastos y tus metas, conectados.</p></div></div></div><div class="auth-foot">Qori Customer + Qori Empresa<br>En cada lugar Qori, tus compras sí cuentan.</div></section>
   <main id="main" class="auth-side"><div class="auth-form-wrap"><span class="pill">${verifying?'Verifica tu correo':'Tu espacio personal · Gratis'}</span><h2>${title}</h2>
   <p class="muted small" id="authDescription">${verifying?`Enviamos un código de 6 dígitos a <strong>${esc(s.email)}</strong>. Vence en 10 minutos. Aún no has iniciado sesión con este acceso.`:connecting?'Por seguridad, comprueba el correo de tu cuenta Qori para vincular este proveedor. Si ya tienes cuenta, usa su mismo correo.':mode==='signup'?'Verifica tu correo y completa tus datos. Tu nombre y tu cédula, escrita dos veces, son obligatorios para abrir la cuenta.':mode==='reset'?'El cambio de contraseña solo se completa cuando verificas el código que enviaremos a tu correo.':mode==='code'?'Usa el correo de tu cuenta. Te enviaremos un código de acceso.':'Entra con tu correo y contraseña, o elige un proveedor disponible.'}</p>
   <form id="${verifying?'verifyForm':mode==='login'&&!connecting?'passwordLoginForm':'emailForm'}" class="stack">
   ${verifying?'<label class="field">Código de verificación<input name="code" class="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" minlength="6" required></label>':`<label class="field">Tu correo electrónico<input name="email" value="${esc(s.email)}" type="email" autocomplete="email" placeholder="tu@correo.com" maxlength="180" required></label>
    ${!connecting&&(setup||mode==='login')?`<label class="field">${setup?'Nueva contraseña':'Contraseña'}<span class="auth-password"><input name="password" type="password" autocomplete="${setup?'new-password':'current-password'}" ${setup?'minlength="12"':''} maxlength="128" required><button type="button" class="quiet" data-show-password aria-label="Mostrar contraseña" aria-pressed="false">Ver</button></span></label>${setup?'<p class="muted small">Mínimo 12 caracteres. Puedes usar una frase fácil de recordar.</p><label class="field">Repite la contraseña<input name="confirmation" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>':''}`:''}
    ${mode!=='login'||connecting?`<label class="check"><input type="checkbox" name="consent" required ${s.consent?'checked':''}><span>${connecting?'Quiero conectar este proveedor a la cuenta cuyo correo verifico y he leído':'He leído'} <a href="privacidad.html" target="_blank" rel="noopener">cómo se usan mis datos</a>.</span></label>`:''}`}
   <p class="error" id="authError" role="alert">${esc(error)}</p><button class="primary wide" type="submit">${verifying?(connecting?'Validar y conectar mi cuenta':'Validar código e iniciar sesión'):connecting||setup||mode==='code'?'Enviar código de verificación':'Iniciar sesión'} <span aria-hidden="true">→</span></button></form>
   ${verifying?'<div class="row auth-actions"><button class="quiet" data-auth-mode="'+(connecting?'code':mode)+'">Cambiar correo o reenviar</button></div>':connecting?'<button class="quiet" data-cancel-oauth>Cancelar conexión</button>':`<div class="auth-actions">${mode==='login'?'<button class="quiet" data-auth-mode="reset">Olvidé mi contraseña / Crear contraseña</button><button class="quiet" data-auth-mode="code">Entrar con un código de correo</button>':'<button class="quiet" data-auth-mode="login">Ya tengo cuenta · Iniciar sesión</button>'}</div>${mode==='login'?'<div class="auth-divider"><span>O continúa con</span></div><p class="small muted">Al continuar, aceptas nuestra <a href="privacidad.html">política de privacidad</a>.</p><div class="auth-providers" id="oauthProviders"><p class="small muted">Consultando opciones de acceso…</p></div><p class="small muted" id="oauthAvailability"></p><div class="divider"></div><p>¿Primera vez en Qori? <button class="quiet auth-create" data-auth-mode="signup">Crear cuenta gratis</button></p>':''}`}
   <div class="auth-links"><a href="/empresa/">Soy un negocio</a><a href="privacidad.html">Privacidad</a><button type="button" class="qcp-settings-link" data-cookie-settings>Configurar cookies</button></div></div></main></div>`;
  const fail=e=>{if(version===generation){app.querySelector('#authError').textContent=e.message;app.querySelector('#authError').focus?.();}};
  app.querySelector('[data-show-password]')?.addEventListener('click',e=>{const input=app.querySelector('[name=password]'),visible=input.type==='password';input.type=visible?'text':'password';e.currentTarget.textContent=visible?'Ocultar':'Ver';e.currentTarget.setAttribute('aria-label',visible?'Ocultar contraseña':'Mostrar contraseña');e.currentTarget.setAttribute('aria-pressed',String(visible));});
  app.querySelectorAll('[data-auth-mode]').forEach(b=>b.onclick=()=>{s.email=app.querySelector('[name=email]')?.value||s.email;s.authMode=b.dataset.authMode;s.challenge=null;render(app,ctx);});
  app.querySelector('[data-cancel-oauth]')?.addEventListener('click',()=>{s.challenge=null;s.authMode='login';history.replaceState(null,'','#login');render(app,ctx);});
  app.querySelector('form').addEventListener('submit',async event=>{
   event.preventDefault();event.stopImmediatePropagation();const form=event.currentTarget,button=form.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;
   try{
    const f=new FormData(form);
    if(verifying){
     const result=await ctx.request('/auth/web/verify',{challenge_id:s.challenge,code:String(f.get('code')).trim(),consent:s.consent});
     // Adopt the verified account before the protected link request so account-consistency checks stay strict.
     ctx.adopt(result.account);
     if(connecting)await ctx.request('/auth/oauth/link',{confirmed:true});
     s.challenge=null;await ctx.enter(result.account);
    }else if(mode==='login'&&!connecting){const result=await ctx.request('/auth/web/password/login',{email:String(f.get('email')).trim(),password:f.get('password')});await ctx.enter(result.account);}
    else{
     s.email=String(f.get('email')).trim();s.consent=f.has('consent');
     const payload={email:s.email,consent:s.consent};if(setup&&!connecting){payload.password=f.get('password');payload.confirmation=f.get('confirmation');if(payload.password!==payload.confirmation)throw Error('Las contraseñas no coinciden.');}
     const result=await ctx.request(setup&&!connecting?'/auth/web/password/code':'/auth/web/code',payload);s.challenge=result.challenge_id;render(app,ctx);
    }
   }catch(e){fail(e);}finally{button.disabled=false;}
  });
  if(verifying)app.querySelector('[name=code]').focus();
  if(connecting&&!verifying){
   const form=app.querySelector('form');form.querySelector('[type=submit]').disabled=true;
   ctx.request('/auth/web/oauth/pending').then(info=>{if(version!==generation)return;app.querySelector('#authDescription').textContent=`Conecta ${info.label} verificando tu correo Qori. Si ya tienes cuenta, usa el mismo correo de siempre. Esta comprobación solo se necesita al vincular el proveedor.`;if(!s.email)form.elements.email.value=info.email_hint||'';form.querySelector('[type=submit]').disabled=false;}).catch(fail);
  }
  if(mode==='login'&&!connecting&&!verifying)ctx.request('/auth/options').then(data=>{
   if(version!==generation)return;
   app.querySelector('#oauthProviders').innerHTML=data.providers.map(p=>`<button type="button" class="secondary auth-provider" data-provider="${esc(p.provider)}" ${p.enabled?'':'disabled'}><span aria-hidden="true">${p.provider==='google'?'G':'⊞'}</span> ${esc(p.label)}${p.enabled?'':' · Próximamente'}</button>`).join('');
   if(data.providers.some(p=>!p.enabled))app.querySelector('#oauthAvailability').textContent='Estamos habilitando los proveedores indicados. Puedes entrar con contraseña o código de correo.';
   app.querySelectorAll('[data-provider]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const r=await ctx.request('/auth/web/oauth/'+b.dataset.provider+'/start',{consent:true});location.assign(r.url);}catch(e){fail(e);b.disabled=false;}});
  }).catch(()=>{if(version===generation)app.querySelector('#oauthProviders').textContent='No pudimos consultar otros métodos. Puedes entrar con tu correo.';});
 }
 function security(page,ctx){
  const section=document.createElement('section');section.className='panel';section.innerHTML='<h2>Acceso y seguridad</h2><p class="muted small">Consultando tus métodos de acceso…</p>';page.append(section);
  Promise.all([ctx.request('/auth/security'),ctx.request('/auth/options')]).then(([security,options])=>{
   if(!section.isConnected)return;
   section.innerHTML=`<h2>Acceso y seguridad</h2><p>${security.has_password?'Tienes una contraseña configurada.':'Tu cuenta todavía no tiene contraseña.'}</p><button class="secondary" data-password-setup>${security.has_password?'Cambiar contraseña':'Crear contraseña'}</button><p class="muted small">Verificaremos tu correo. Al cambiar la contraseña, se cerrarán tus otras sesiones.</p><div class="auth-providers">${options.providers.map(p=>`<button class="secondary" data-link-provider="${p.provider}" ${!p.enabled||security.providers.some(x=>x.provider===p.provider)?'disabled':''}>${p.label} · ${security.providers.some(x=>x.provider===p.provider)?'Conectado':p.enabled?'Conectar':'Próximamente'}</button>`).join('')}</div><p class="error" role="alert"></p>`;
   section.querySelector('[data-password-setup]').onclick=()=>{ctx.state.email=ctx.state.account.email;ctx.state.authMode='reset';ctx.state.challenge=null;ctx.open();};
   section.querySelectorAll('[data-link-provider]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const r=await ctx.request('/auth/oauth/'+b.dataset.linkProvider+'/start',{consent:true});location.assign(r.url);}catch(e){section.querySelector('.error').textContent=e.message;b.disabled=false;}});
  }).catch(e=>{if(section.isConnected)section.querySelector('p').textContent=e.message;});
 }
 window.QoriAuthAccess={render,security};
})();
