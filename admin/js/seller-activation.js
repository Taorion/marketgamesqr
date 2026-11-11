(() => {
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function showLink(d,activation,onManage){
    const form=d.querySelector('form');
    form.innerHTML=`<div class="full"><h3>Cuenta pendiente de activación</h3><p>Comparte este enlace únicamente con el embajador. Allí creará y confirmará su contraseña y aceptará las condiciones de Qori Seller.</p><label>Enlace personal de activación<input id="sellerActivationLink" readonly value="${esc(activation.url)}"></label><p>Vence: ${esc(new Date(activation.expires_at).toLocaleString('es-CO'))}. Se puede utilizar una sola vez.</p><p>Ya puedes adjuntar su documentación. La aprobación comercial se administra por separado.</p><div class="toolbar"><button type="button" class="primary-button" id="copySellerActivation">Copiar enlace</button>${onManage?'<button type="button" class="secondary-button" id="manageCreatedSeller">Administrar embajador</button>':''}</div><p role="status"></p></div>`;
    form.querySelector('#copySellerActivation').onclick=async()=>{try{await navigator.clipboard.writeText(activation.url);if(d.isConnected)form.querySelector('[role=status]').textContent='Enlace copiado.';}catch{form.querySelector('input').select();form.querySelector('[role=status]').textContent='Copia el enlace seleccionado con Ctrl+C.';}};
    if(onManage)form.querySelector('#manageCreatedSeller').onclick=onManage;
  }
  function create({dialog,request,isCurrent,onChanged,onManage}){
    const field=(name,label,type='text',attrs='')=>`<label><span>${label}</span><input name="${name}" type="${type}" required ${attrs}></label>`;
    const d=dialog('Crear embajador',`<p class="full">Registra sus datos. El embajador elegirá su propia contraseña al activar la cuenta; después podrás aprobar el acceso desde su expediente.</p>${field('full_name','Nombre completo','text','minlength="5" maxlength="160"')}${field('email','Correo del embajador','email','maxlength="180" autocomplete="off"')}${field('document_key','Cédula','text','inputmode="numeric" pattern="[0-9]{5,15}"')}${field('phone','Celular','tel','minlength="7" maxlength="40"')}${field('city','Ciudad','text','minlength="2" maxlength="120"')}<label class="full"><span>Nota del alta administrativa</span><textarea name="reason" required minlength="15" maxlength="1000" placeholder="Datos recibidos para vinculación como embajador."></textarea></label><button type="submit" class="primary-button full">Crear cuenta y enlace de activación</button>`);
    d.querySelector('form').onsubmit=async e=>{
      e.preventDefault();if(d.dataset.saving||!isCurrent())return;
      const form=e.currentTarget,button=form.querySelector('[type=submit]');d.dataset.saving='true';button.disabled=true;
      try{const r=await request('/api/admin/accounts/sellers',Object.fromEntries(new FormData(form)),'POST');if(!isCurrent()||!d.isConnected)return;delete d.dataset.saving;showLink(d,r.activation,()=>onManage(r.seller.id));await onChanged();}
      catch(error){if(isCurrent()&&d.isConnected)form.querySelector('[role=status]').textContent=error.message;}
      finally{delete d.dataset.saving;button.disabled=false;}
    };
  }
  function renew({id,dialog,request,isCurrent}){
    const d=dialog('Renovar activación',`<p class="full">El nuevo enlace reemplazará el anterior. La contraseña la crea únicamente el embajador al abrirlo.</p><button type="submit" class="primary-button full">Generar nuevo enlace</button>`);
    d.querySelector('form').onsubmit=async e=>{e.preventDefault();if(d.dataset.saving||!isCurrent())return;const b=e.currentTarget.querySelector('[type=submit]');d.dataset.saving='true';b.disabled=true;try{const r=await request('/api/admin/accounts/sellers/'+id+'/activation',{},'POST');if(isCurrent()&&d.isConnected)showLink(d,r.activation);}catch(error){if(isCurrent()&&d.isConnected)d.querySelector('[role=status]').textContent=error.message;}finally{delete d.dataset.saving;b.disabled=false;}};
  }
  window.QoriSellerActivationAdmin={create,renew};
})();
