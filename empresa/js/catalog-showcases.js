(() => {
 const form=document.getElementById('smartCatalogForm');if(!form)return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const picker=document.createElement('fieldset');picker.className='qs-program-picker';picker.hidden=true;picker.innerHTML='<legend>Programas que aparecerán en la vitrina</legend><p>Selecciona programas de este negocio. Solo los activos estarán disponibles para inscribirse.</p><div data-program-options></div><p role="status" data-program-message></p>';form.elements.redemption_mode.closest('label').after(picker);
 let selections={},original={},mode='',generation=0,ready=false,unavailable=[];
 const refresh=document.createElement('button');refresh.type='button';refresh.className='ghost-button';refresh.textContent='Actualizar opciones';picker.append(refresh);
 function selectedIds(){return [...picker.querySelectorAll('input:checked')].map(i=>i.value);}
 function updateSelection(){
  if(!ready)return;
  selections[mode]=selectedIds();
  const saved=original[mode]||[],chosen=selections[mode];
  picker.querySelectorAll('[data-selection-state]').forEach(node=>{
   const id=node.dataset.selectionState,had=saved.includes(id),has=chosen.includes(id);
   node.textContent=had?(has?'Ya incluido':'Se retirará al guardar'):(has?'Se añadirá al guardar':'Disponible para añadir');
  });
  const added=chosen.filter(id=>!saved.includes(id)).length,removed=saved.filter(id=>!chosen.includes(id)).length;
  picker.querySelector('[data-program-message]').textContent=`${chosen.length} seleccionados · ${added} para añadir · ${removed} para retirar. Los cambios se aplican al guardar la vitrina.`;
 }
 async function setupForm(catalog){selections={STAMP_PROGRAMS:[...(catalog?.metadata?.stamp_program_ids||[])],ACTIVATIONS:[...(catalog?.metadata?.activation_ids||[])]};original={STAMP_PROGRAMS:[...selections.STAMP_PROGRAMS],ACTIVATIONS:[...selections.ACTIVATIONS]};await sync();}
 async function sync(){
  mode=form.elements.redemption_mode.value;const activations=mode==='ACTIVATIONS',directory=activations||mode==='STAMP_PROGRAMS',request=++generation;picker.hidden=!directory;ready=false;
  const whatsapp=form.elements.whatsapp_number;whatsapp.required=!directory;whatsapp.closest('label').hidden=directory;form.elements.default_cta_label.closest('label').hidden=directory;
  const intro=form.closest('.modal-shell')?.querySelector('.modal-head p');if(intro)intro.textContent=directory?'Define tu vitrina, elige qué publicar y comparte su enlace o QR.':'Define tu marca y WhatsApp. Después agrega productos y comparte el enlace.';
  if(!directory)return;
  picker.querySelector('legend').textContent=activations?'Activaciones que aparecerán en la vitrina':'Programas que aparecerán en la vitrina';
  picker.querySelector('p').textContent=activations?'Selecciona juegos y experiencias de este negocio. Se mostrarán los que estén activos y vigentes, con sus beneficios configurados.':'Selecciona programas de este negocio. Solo los activos estarán disponibles para inscribirse.';
  picker.querySelector('[data-program-options]').innerHTML='';picker.querySelector('[data-program-message]').textContent=activations?'Consultando tus activaciones…':'Consultando tus programas…';
  try{
   const result=await api(activations?'/api/business/interactive-activations?limit=300':'/api/business/stamp-cards/context',{headers:authHeaders(),noClientCache:true});if(request!==generation)return;
   const programs=(activations?result.activations:result.programs)||[],selected=selections[mode]||[];
   picker.querySelector('[data-program-options]').innerHTML=programs.map(p=>`<label><input type="checkbox" value="${esc(p.id)}" ${selected.includes(p.id)?'checked':''}><span>${esc(activations?p.title:p.name)} · ${esc(activations?p.activation_label:p.stamps_required+' sellos')}${!['ACTIVE','active'].includes(p.status)?' · '+esc(p.status):''}${activations&&p.reward_config?.reward_label?'<small class="qs-picker-benefit">Beneficio: '+esc(p.reward_config.reward_label)+'</small>':''}</span></label>`).join('');
   unavailable=[];
   if(!activations){
    const saved=original[mode]||[];
    unavailable=saved.filter(id=>!programs.some(p=>p.id===id));
    const rows=[...programs,...unavailable.map(id=>({id,name:(result.deleted_programs||[]).find(p=>p.id===id)?.name||'Programa no disponible',status:'UNAVAILABLE'}))];
    const option=p=>`<label><input type="checkbox" value="${esc(p.id)}" ${selected.includes(p.id)?'checked':''}><span><strong>${esc(p.name)}</strong><small>${p.status==='UNAVAILABLE'?'No disponible. Desmárcalo para guardar.':esc(p.stamps_required)+' sellos · '+(p.status==='ACTIVE'?'Activo':'Pausado; no se muestra al público')}</small><small data-selection-state="${esc(p.id)}"></small></span></label>`;
    const group=(title,items,empty)=>`<section class="qs-picker-group"><h4>${title} (${items.length})</h4>${items.map(option).join('')||'<p>'+empty+'</p>'}</section>`;
    picker.querySelector('[data-program-options]').innerHTML=group('Ya incluidos en esta vitrina',rows.filter(p=>saved.includes(p.id)),'Todavía no hay programas vinculados.')+group('Disponibles para añadir',rows.filter(p=>!saved.includes(p.id)),'No hay más programas disponibles. Crea uno en Tarjetas de sellos y pulsa Actualizar opciones.');
   }
   picker.querySelector('[data-program-message]').textContent=programs.length?(activations?'Cada visitante elegirá una activación y entrará a su enlace de participación.':''):(activations?'Crea primero tus juegos en Activaciones. Después selecciónalos aquí.':'Crea primero tus programas en Tarjetas de sellos. Después selecciónalos aquí.');ready=true;
   if(!activations)updateSelection();
  }catch(e){if(request===generation)picker.querySelector('[data-program-message]').textContent=e.message;}
 }
 function formMetadata(){const type=form.elements.redemption_mode.value;if(!['STAMP_PROGRAMS','ACTIVATIONS'].includes(type))return {};if(!ready)throw Error('Espera a que carguen las opciones de la vitrina.');const ids=selectedIds();if(ids.some(id=>unavailable.includes(id)))throw Error('Desmarca los programas no disponibles antes de guardar.');return {[type==='ACTIVATIONS'?'activation_ids':'stamp_program_ids']:ids};}
 picker.addEventListener('change',()=>{if(mode==='STAMP_PROGRAMS')updateSelection();});
 refresh.addEventListener('click',()=>{if(ready)selections[mode]=selectedIds();sync();});
 form.elements.redemption_mode.addEventListener('change',()=>{if(ready)selections[mode]=[...picker.querySelectorAll('input:checked')].map(i=>i.value);sync();});
 document.addEventListener('click',async e=>{const button=e.target.closest('[data-catalog-access-qr]');if(!button||!button.dataset.catalogAccessQr)return;e.preventDefault();button.disabled=true;try{const data=await api('/api/business/catalogs/'+encodeURIComponent(button.dataset.catalogAccessQr)+'/access-qr',{headers:authHeaders()});window.QoriShowcases.openQr(data);}catch(error){showFeedback(error.message,'error',{title:'QR de la vitrina'});}finally{button.disabled=false;}});
 window.QoriCatalogShowcases={setupForm,formMetadata};
})();
