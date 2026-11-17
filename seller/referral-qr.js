(() => {
  'use strict';
  function clear(host){host.replaceChildren();}
  async function mount(host,url,{request,isCurrent=()=>true}={}){
    clear(host);
    const panel=document.createElement('section');panel.className='seller-referral-qr';
    const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Preparando tu QR…';
    panel.append(status);host.append(panel);
    const current=()=>panel.isConnected&&isCurrent();
    try{
      if(typeof request!=='function')throw Error('No se pudo abrir la conexión. Actualiza el portal e intenta de nuevo.');
      const result=await request('/api/seller/referral-qr',{url});
      if(!current())return;
      if(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(result.qr_data_url||''))throw Error('No se pudo generar una imagen QR válida.');
      const title=document.createElement('h3');title.textContent=result.plan_name;
      const by=document.createElement('p');by.textContent='Te acompaña '+result.advisor_name;
      const image=document.createElement('img');image.src=result.qr_data_url;image.alt='Escanea para abrir el formulario de '+result.plan_name;image.width=1024;image.height=1024;
      const instruction=document.createElement('p');instruction.className='qr-instruction';instruction.textContent='Escanea con la cámara de tu celular para inscribirte.';
      const note=document.createElement('p');note.className='small';note.textContent=result.notice;
      const download=document.createElement('a');download.href=result.qr_data_url;download.download=result.filename;download.className='primary';download.textContent='Descargar QR PNG';
      panel.replaceChildren(title,by,image,instruction,download,note);
    }catch(error){
      if(!current())return;
      status.textContent=error.message;
      const retry=document.createElement('button');retry.type='button';retry.className='outline';retry.textContent='Reintentar QR';retry.onclick=()=>mount(host,url,{request,isCurrent});panel.append(retry);
    }
  }
  function open(url,options={}){
    const previous=document.activeElement,d=document.createElement('dialog');d.dataset.sellerDialog='';d.className='seller-qr-dialog';
    d.setAttribute('aria-label','QR de inscripción Qori');
    d.innerHTML='<div class="row"><h2>Inscripción en sitio</h2><button type="button" class="quiet" data-qr-close aria-label="Cerrar QR">×</button></div><div data-qr-content></div>';
    document.body.append(d);d.querySelector('[data-qr-close]').onclick=()=>d.close();
    d.onclose=()=>{d.remove();if(previous?.isConnected)previous.focus();};d.showModal();
    mount(d.querySelector('[data-qr-content]'),url,options);
  }
  window.QoriSellerReferralQR={open,mount,clear};
})();
