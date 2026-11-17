(() => {
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const states={DRAFT:'Oculto / borrador',PUBLISHED:'Publicado',ARCHIVED:'Archivado'};
 const endpoint='/api/seller/resources/academy';
 const options=(values,chosen)=>Object.entries(values).map(([v,label])=>`<option value="${esc(v)}" ${v===chosen?'selected':''}>${esc(label)}</option>`).join('');
 function open(ctx){
  document.querySelectorAll('.qa-admin-dialog').forEach(d=>d.close());
  const dialog=document.createElement('dialog');dialog.className='qori-resource-dialog qa-admin-dialog';dialog.setAttribute('aria-label','Administrar Qori Academy');
  dialog.innerHTML='<header><h2>Qori Academy</h2><button type="button" data-close>Cerrar</button></header><div class="qr-dialog-body seller-resources"></div>';
  document.body.append(dialog);dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();dialog.showModal();
  render(dialog.querySelector('.qr-dialog-body'),{...ctx,isCurrent:()=>dialog.isConnected&&ctx.isCurrent()});
 }
 async function render(host,ctx){
  const current=()=>host.isConnected&&ctx.isCurrent();let data,search='',state='',busy=false;
  host.innerHTML='<p role="status">Cargando administración de Academy…</p>';
  try{data=await ctx.request(endpoint+'/admin');}catch(e){if(current()){host.innerHTML=`<p role="alert">${esc(e.message)}</p><button type="button" data-retry>Reintentar</button>`;host.querySelector('[data-retry]').onclick=()=>render(host,ctx);}return;}
  if(!current())return;
  host.innerHTML='<section class="qa-admin-access"><div><span class="qr-kicker">ACCESO DE EMBAJADORES</span><h3 data-access-label></h3><p>Al deshabilitar Academy se bloquean nuevas consultas y descargas desde el portal. Puedes seguir administrando el contenido.</p></div><button type="button" data-toggle></button></section><p class="qa-admin-note">Los archivos ya descargados y los videos abiertos conservan su acceso. Para retirar también un enlace de Drive, cambia sus permisos en Google Drive.</p><div class="qr-actions"><button type="button" data-new>Agregar material</button><button type="button" data-refresh>Actualizar</button></div><p role="status" data-status></p><div data-editor></div><div class="qa-admin-filters"><label>Buscar material<input type="search" data-search placeholder="Título o descripción"></label><label>Visibilidad<select data-state></select></label></div><div class="qr-grid" data-cards></div>';
  const status=host.querySelector('[data-status]');
  function access(){host.querySelector('[data-access-label]').textContent=data.settings.enabled?'Academy habilitada':'Academy deshabilitada';const b=host.querySelector('[data-toggle]');b.textContent=data.settings.enabled?'Deshabilitar Academy':'Habilitar Academy';b.setAttribute('aria-pressed',String(data.settings.enabled));}
  async function action(button,fn){if(busy)return;busy=true;button.disabled=true;status.textContent='Guardando…';try{await fn();}catch(e){if(current())status.textContent=e.message;}finally{busy=false;button.disabled=false;}}
  host.querySelector('[data-toggle]').onclick=e=>action(e.currentTarget,async()=>{
   const r=await ctx.request(endpoint+'/settings',{enabled:!data.settings.enabled,expected_revision:data.settings.revision},'PATCH');
   if(!current())return;data.settings=r.settings;access();status.textContent=r.settings.enabled?'Academy habilitada para embajadores.':'Academy deshabilitada para embajadores.';
  });
  function cards(){
   const rows=data.resources.filter(r=>(!state||r.state===state)&&(!search||[r.title,r.description].join(' ').toLocaleLowerCase('es').includes(search))).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
   host.querySelector('[data-cards]').innerHTML=rows.map(r=>`<article class="qr-card" data-resource="${esc(r.id)}"><div class="qr-meta"><span>${esc(states[r.state])}</span><span>${esc(r.format)} · Orden ${r.order}</span></div><h3>${esc(r.title)}</h3><p>${esc(r.description)}</p><small>${r.filename?esc(r.filename):'Video en Google Drive'}</small><div class="qr-actions"><button type="button" data-edit>Editar material</button>${r.kind==='VIDEO'?`<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Ver en Drive ↗</a>`:'<button type="button" data-download>Descargar archivo</button>'}</div></article>`).join('')||'<p>No hay materiales con estos filtros.</p>';
   host.querySelectorAll('[data-resource]').forEach(card=>{const r=rows.find(r=>r.id===card.dataset.resource);card.querySelector('[data-edit]').onclick=()=>editor(r);card.querySelector('[data-download]')?.addEventListener('click',e=>action(e.currentTarget,async()=>{await ctx.download(endpoint+'/'+encodeURIComponent(r.id)+'/download',r.filename);if(current())status.textContent='Descarga iniciada.';}));});
  }
  function editor(r={kind:'VIDEO',state:'DRAFT',order:data.resources.reduce((n,r)=>Math.max(n,r.order),0)+1}){
   const box=host.querySelector('[data-editor]');
   box.innerHTML=`<form class="qr-editor"><h3>${r.id?'Editar material':'Agregar material'}</h3><label>Título<input name="title" required minlength="3" maxlength="140" value="${esc(r.title)}"></label><label>Descripción<textarea name="description" maxlength="800">${esc(r.description)}</textarea></label><div class="qa-admin-fields"><label>Tipo<select name="kind">${options({VIDEO:'Video de Google Drive',FILE:'Documento o imagen'},r.kind)}</select></label><label>Visibilidad<select name="state">${options(states,r.state)}</select></label><label>Orden<input name="position" type="number" min="1" max="9999" required value="${r.order}"></label></div><label data-url>Enlace del video en Drive<input name="url" type="url" maxlength="2000" value="${esc(r.url)}" placeholder="https://drive.google.com/file/d/…/view"><small>Comprueba que los embajadores tengan permiso para ver el video.</small></label><label data-file>Archivo (máximo 15 MB)<input name="file" type="file" accept=".pdf,.pptx,.docx,.xlsx,.png,.jpg,.jpeg,.webp"><small>${r.filename?'Actual: '+esc(r.filename)+'. Deja este campo vacío para conservarlo.':'PDF, PowerPoint, Word, Excel o imágenes. Sin macros.'}</small></label><p>Publicado: visible cuando Academy está habilitada. Oculto y archivado: solo Admin. Los números menores aparecen primero.</p><div class="qr-actions"><button type="submit">Guardar material</button><button type="button" data-cancel>Cancelar</button></div><p role="status"></p></form>`;
   const form=box.querySelector('form'),feedback=form.querySelector('[role=status]');
   function kind(){const isVideo=form.elements.kind.value==='VIDEO';form.querySelector('[data-url]').hidden=!isVideo;form.elements.url.required=isVideo;form.querySelector('[data-file]').hidden=isVideo;form.elements.file.required=!isVideo&&!(r.kind==='FILE'&&r.filename);}
   kind();form.elements.kind.onchange=kind;form.querySelector('[data-cancel]').onclick=()=>box.replaceChildren();form.scrollIntoView?.({block:'start',behavior:'smooth'});form.elements.title.focus();
   form.onsubmit=async e=>{
    e.preventDefault();if(busy)return;busy=true;const buttons=form.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);feedback.textContent='Guardando material…';
    try{
     const body={title:form.elements.title.value,description:form.elements.description.value,kind:form.elements.kind.value,state:form.elements.state.value,position:Number(form.elements.position.value)};
     if(r.id)body.expected_revision=r.revision;
     if(body.kind==='VIDEO')body.url=form.elements.url.value.trim();
     else{const file=form.elements.file.files[0];if(file){if(file.size>15*1024*1024)throw Error('El archivo supera 15 MB.');body.filename=file.name;body.base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('No se pudo leer el archivo.'));reader.readAsDataURL(file);});}}
     if(!current()||!form.isConnected)return;
     const result=await ctx.request(endpoint+'/materials'+(r.id?'/'+encodeURIComponent(r.id):''),body,r.id?'PATCH':'POST');
     if(!current()||!form.isConnected)return;data.resources=[...data.resources.filter(x=>x.id!==result.resource.id),result.resource];box.replaceChildren();cards();status.textContent='Material guardado: '+states[result.resource.state]+'.';
    }catch(error){if(current()&&form.isConnected)feedback.textContent=error.message;}finally{busy=false;buttons.forEach(b=>b.disabled=false);}
   };
  }
  host.querySelector('[data-new]').onclick=()=>{if(!busy)editor();};host.querySelector('[data-refresh]').onclick=()=>{if(!busy)render(host,ctx);};
  host.querySelector('[data-state]').innerHTML=options({'':'Todos los estados',...states},'');host.querySelector('[data-state]').onchange=e=>{state=e.target.value;cards();};host.querySelector('[data-search]').oninput=e=>{search=e.target.value.trim().toLocaleLowerCase('es');cards();};access();cards();
 }
 window.QoriAcademyAdmin={open,render};
})();
