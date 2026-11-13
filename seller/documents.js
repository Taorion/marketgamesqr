(() => {
  'use strict';
  const labels = {IDENTITY:'Cédula',RUT:'RUT actualizado',BANK:'Certificado bancario',POLICE:'Antecedentes de Policía',PROCURADURIA:'Antecedentes de Procuraduría',PHOTO:'Foto del rostro',CONTRACT:'Contrato firmado y autenticado'};
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let cleanup = () => {};
  function stopCamera(){cleanup();cleanup=()=>{};}
  function render(host,{profile,request,download,reload,isCurrent}){
    stopCamera();
    const a=profile.application,docs=profile.documents,allow=['DRAFT','CHANGES_REQUESTED','SUBMITTED','APPROVED'].includes(a.status);
    const complete=Object.keys(labels).every(k=>docs.some(d=>d.kind===k));
    const canSubmit=['DRAFT','CHANGES_REQUESTED'].includes(a.status)||(a.status==='APPROVED'&&a.approval_mode==='ADMIN_OVERRIDE');
    let disposed=false,stream=null,cameraRevision=0;
    const current=()=>!disposed&&host.isConnected&&isCurrent();
    const halt=()=>{cameraRevision++;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;const video=host.querySelector('video');if(video)video.srcObject=null;};
    const onHidden=()=>{if(document.hidden)halt();};
    cleanup=()=>{disposed=true;halt();window.removeEventListener('pagehide',halt);document.removeEventListener('visibilitychange',onHidden);};
    window.addEventListener('pagehide',halt);document.addEventListener('visibilitychange',onHidden);
    host.innerHTML=`<section class="card"><h2>Mi documentación</h2><p>Adjunta cada documento una sola vez. Después podrás descargarlo; cualquier corrección o reemplazo debe realizarlo Admin.</p>${a.review_note?`<p class="hint">Respuesta de Qori: ${esc(a.review_note)}</p>`:''}<div class="hint"><strong>CIIU requerido: 4610 — Comercio al por mayor a cambio de una retribución o por contrata</strong><p>Debe figurar en tu RUT como actividad principal, secundaria u otra actividad.</p></div><button type="button" class="primary" id="downloadContract">Descargar contrato PDF</button><p>Descarga el contrato con tus datos, imprime todas sus páginas, fírmalo y autentica la firma ante notaría. Adjunta el contrato completo con la constancia de autenticación.</p><p id="documentStatus" role="status"></p><div class="grid" id="documents">${Object.entries(labels).map(([kind,label])=>{
      const doc=docs.find(d=>d.kind===kind);
      return `<article class="card document-card" data-card="${kind}"><h3>${label}</h3><p>${doc?esc(doc.filename)+' · Adjunto definitivo':'Pendiente'}</p>${doc?`<button type="button" class="outline" data-download="${doc.id}">Descargar copia</button><small>Solo Admin puede reemplazar este archivo.</small>`:allow?`${kind==='PHOTO'?'<label class="check"><input type="checkbox" data-photo-consent> Autorizo guardar mi foto del rostro en el expediente para revisión manual de Qori, sin reconocimiento facial.</label><button type="button" class="outline" data-camera>Abrir cámara</button><div data-camera-panel hidden><video autoplay muted playsinline></video><div class="actions"><button type="button" data-capture>Tomar foto</button><button type="button" data-close-camera>Cerrar cámara</button></div></div>':''}<label>Seleccionar ${label.toLowerCase()}<input type="file" data-kind="${kind}" accept="${kind==='PHOTO'?'image/jpeg,image/png':'application/pdf,image/jpeg,image/png'}" ${kind==='PHOTO'?'capture="user"':''}></label><small>${kind==='PHOTO'?'JPG o PNG':'PDF, JPG o PNG'} · máximo 8 MB</small><div data-pending hidden><img data-preview hidden alt="Vista previa del rostro"><p data-filename></p><p>Revisa el archivo antes de confirmar. Una vez adjunto, no podrás cambiarlo.</p><div class="actions"><button type="button" class="primary" data-confirm>Adjuntar definitivamente</button><button type="button" class="outline" data-cancel>Descartar</button></div></div>`:'<p>Contacta a Admin para completar este expediente.</p>'}</article>`;
    }).join('')}</div>${canSubmit?`<form id="submitApplication" class="stack"><h3>Enviar expediente a revisión</h3><p>${complete?'Los siete documentos están adjuntos.':'Completa los siete documentos para enviar el expediente.'}</p><label class="check"><input name="signed" type="checkbox" required> El contrato está firmado y autenticado ante notaría.</label><label class="check"><input name="truthful" type="checkbox" required> Los siete documentos son completos, legibles, vigentes y propios.</label><label class="check"><input name="ciiu_terms" type="checkbox" required> Acepto las condiciones actuales y el tratamiento de los documentos del expediente, confirmo el CIIU 4610 en mi RUT y que adjunté el contrato actualizado.</label><details><summary>Leer condiciones actuales</summary><div data-terms></div></details><button type="submit" class="primary" ${complete?'':'disabled'}>Enviar a revisión</button><p class="status" role="status"></p></form>`:''}</section>`;
    const message=host.querySelector('#documentStatus');
    const report=e=>{if(current())message.textContent=e.message;};
    host.querySelector('#downloadContract').onclick=()=>download('/api/seller/contract','Contrato-Qori-Seller.pdf').catch(report);
    host.querySelectorAll('[data-download]').forEach(b=>b.onclick=()=>download('/api/seller/documents/'+b.dataset.download,docs.find(d=>d.id===b.dataset.download).filename).catch(report));
    host.querySelectorAll('[data-kind]').forEach(input=>{
      const kind=input.dataset.kind,card=input.closest('[data-card]'),pending=card.querySelector('[data-pending]'),preview=card.querySelector('[data-preview]');let selected=null,saving=false;
      const consent=()=>kind!=='PHOTO'||card.querySelector('[data-photo-consent]').checked;
      const stage=(file,data)=>{selected={file,data};pending.hidden=false;card.querySelector('[data-filename]').textContent=file.name;preview.hidden=kind!=='PHOTO';if(kind==='PHOTO')preview.src=data;};
      const clear=()=>{selected=null;pending.hidden=true;preview.removeAttribute('src');input.value='';};
      input.onchange=async()=>{const file=input.files[0];if(!file)return;try{
        if(!file.size||file.size>8*1024*1024)throw Error('Selecciona un archivo con contenido de hasta 8 MB.');
        if(!(kind==='PHOTO'?['image/jpeg','image/png']:['application/pdf','image/jpeg','image/png']).includes(file.type))throw Error('Formato de archivo no permitido.');
        const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('No se pudo leer el archivo.'));r.readAsDataURL(file);});
        if(current())stage(file,data);
      }catch(e){clear();report(e);}};
      card.querySelector('[data-cancel]').onclick=clear;
      card.querySelector('[data-confirm]').onclick=async()=>{
        if(!selected||saving)return;if(!consent()){report(Error('Autoriza el uso de la foto antes de adjuntarla.'));return;}
        saving=true;card.querySelectorAll('button,input').forEach(c=>c.disabled=true);message.textContent='Adjuntando documento…';
        let saved=false;
        try{await request('/api/seller/documents/'+kind,{filename:selected.file.name,content_base64:String(selected.data).split(',')[1],...(kind==='PHOTO'?{photo_consent:true}:{})},'PUT');saved=true;if(!current())return;halt();card.innerHTML='<h3>'+labels[kind]+'</h3><p>Documento adjuntado definitivamente.</p>';await reload();}
        catch(e){report(saved?Error('Documento guardado. Actualiza la página para descargarlo.'):e);}
        finally{saving=false;if(current()&&!saved)card.querySelectorAll('button,input').forEach(c=>c.disabled=false);}
      };
      if(kind==='PHOTO'){
        const panel=card.querySelector('[data-camera-panel]'),video=card.querySelector('video');
        card.querySelector('[data-camera]').onclick=async()=>{
          if(!consent()){report(Error('Autoriza el uso de la foto para abrir la cámara.'));return;}
          halt();const revision=cameraRevision;
          try{if(!navigator.mediaDevices?.getUserMedia)throw Error('La cámara no está disponible. Puedes seleccionar una foto del rostro.');const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:1280},height:{ideal:960}}});
            if(!current()||revision!==cameraRevision){acquired.getTracks().forEach(t=>t.stop());return;}stream=acquired;video.srcObject=stream;panel.hidden=false;message.textContent='Centra tu rostro y toma la foto.';
          }catch(e){report(Error(e.name==='NotAllowedError'?'Permite el acceso a la cámara o selecciona una foto del rostro.':e.message));}
        };
        card.querySelector('[data-close-camera]').onclick=()=>{halt();panel.hidden=true;};
        card.querySelector('[data-capture]').onclick=()=>{try{if(!stream||!video.videoWidth)throw Error('Espera a que la cámara muestre la imagen.');const canvas=document.createElement('canvas'),scale=Math.min(1,1600/Math.max(video.videoWidth,video.videoHeight));canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);stage({name:'Foto-rostro.jpg'},canvas.toDataURL('image/jpeg',.9));halt();panel.hidden=true;message.textContent='Revisa la foto. Puedes descartarla y tomar otra antes de adjuntarla.';}catch(e){report(e);}};
      }
    });
    const form=host.querySelector('#submitApplication');
    if(form){let termsReady=false;request('/api/seller/terms').then(r=>{if(current()){form.querySelector('[data-terms]').textContent=r.clauses.map(c=>c.title+': '+c.text).join('\n\n');termsReady=true;}}).catch(report);form.onsubmit=async e=>{e.preventDefault();const status=form.querySelector('[role=status]'),button=form.querySelector('[type=submit]');if(!complete||!termsReady){status.textContent='Completa los documentos y espera a que carguen las condiciones.';return;}button.disabled=true;try{await request('/api/seller/application/submit',{signed_and_notarized:form.elements.signed.checked,documents_truthful:form.elements.truthful.checked,ciiu_terms_accepted:form.elements.ciiu_terms.checked});if(current())await reload();}catch(e){if(current())status.textContent=e.message;}finally{if(current())button.disabled=false;}};}
  }
  window.QoriSellerDocuments={render,stopCamera};
})();
