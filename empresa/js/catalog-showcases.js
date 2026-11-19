(() => {
 const form=document.getElementById('smartCatalogForm');if(!form)return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const picker=document.createElement('fieldset');picker.className='qs-program-picker';picker.hidden=true;picker.innerHTML='<legend>Programas que aparecerán en la vitrina</legend><p>Selecciona programas de este negocio. Solo los activos estarán disponibles para inscribirse.</p><div data-program-options></div><p role="status" data-program-message></p>';form.elements.redemption_mode.closest('label').after(picker);
 let selected=[],generation=0,ready=false;
 async function setupForm(catalog){selected=catalog?.metadata?.stamp_program_ids||[];await sync();}
 async function sync(){
  const stamps=form.elements.redemption_mode.value==='STAMP_PROGRAMS',request=++generation;picker.hidden=!stamps;ready=false;
  const whatsapp=form.elements.whatsapp_number;whatsapp.required=!stamps;whatsapp.closest('label').hidden=stamps;form.elements.default_cta_label.closest('label').hidden=stamps;
  if(!stamps)return;picker.querySelector('[data-program-options]').innerHTML='';picker.querySelector('[data-program-message]').textContent='Consultando tus programas…';
  try{const result=await api('/api/business/stamp-cards/context',{headers:authHeaders()});if(request!==generation)return;const programs=result.programs||[];picker.querySelector('[data-program-options]').innerHTML=programs.map(p=>`<label><input type="checkbox" value="${esc(p.id)}" ${selected.includes(p.id)?'checked':''}>${esc(p.name)} · ${p.stamps_required} sellos${p.status!=='ACTIVE'?' · '+esc(p.status):''}</label>`).join('');picker.querySelector('[data-program-message]').textContent=programs.length?'':'Crea primero tus programas en Tarjetas de sellos. Después selecciónalos aquí.';ready=true;}catch(e){if(request===generation)picker.querySelector('[data-program-message]').textContent=e.message;}
 }
 function formMetadata(){if(form.elements.redemption_mode.value!=='STAMP_PROGRAMS')return {};if(!ready)throw Error('Espera a que carguen los programas de sellos.');return {stamp_program_ids:[...picker.querySelectorAll('input:checked')].map(i=>i.value)};}
 form.elements.redemption_mode.addEventListener('change',()=>{selected=[...picker.querySelectorAll('input:checked')].map(i=>i.value);sync();});
 document.addEventListener('click',async e=>{const button=e.target.closest('[data-catalog-access-qr]');if(!button||!button.dataset.catalogAccessQr)return;e.preventDefault();button.disabled=true;try{const data=await api('/api/business/catalogs/'+encodeURIComponent(button.dataset.catalogAccessQr)+'/access-qr',{headers:authHeaders()});window.QoriShowcases.openQr(data);}catch(error){showFeedback(error.message,'error',{title:'QR de la vitrina'});}finally{button.disabled=false;}});
 window.QoriCatalogShowcases={setupForm,formMetadata};
})();
