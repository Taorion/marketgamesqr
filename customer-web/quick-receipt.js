/* Optional local attachment: nothing is uploaded until the expense is saved. */
(()=>{
 'use strict';
 const LIMIT=5242880;
 const read=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('No pudimos leer el archivo. Selecciónalo otra vez.'));r.readAsDataURL(blob);});
 async function prepare(file){
  const type=file.type||(/\.pdf$/i.test(file.name)?'application/pdf':/\.png$/i.test(file.name)?'image/png':/\.jpe?g$/i.test(file.name)?'image/jpeg':'');
  if(!file.size)throw Error('El archivo está vacío.');
  if(type==='application/pdf'){
   if(file.size>LIMIT)throw Error('El PDF debe pesar hasta 5 MB.');
   return {filename:file.name.slice(0,120),mime_type:type,base64:(await read(file)).split(',')[1]};
  }
  if(!type.startsWith('image/')||type==='image/svg+xml')throw Error('Elige una foto JPG o PNG, o un comprobante PDF.');
  if(file.size>25*1024*1024)throw Error('La foto es demasiado grande. Elige una de hasta 25 MB.');
  if(['image/jpeg','image/png'].includes(type)&&file.size<=LIMIT)return {filename:file.name.slice(0,120),mime_type:type,base64:(await read(file)).split(',')[1]};
  const src=URL.createObjectURL(file);
  try{
   const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('No pudimos abrir esta foto. Elige una imagen JPG o PNG.'));img.src=src;});
   const scale=Math.min(1,2200/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.85));
   if(!blob||blob.size>LIMIT)throw Error('No pudimos reducir la foto a 5 MB. Elige una imagen más pequeña.');
   return {filename:file.name.replace(/\.[^.]+$/,'').slice(0,110)+'.jpg',mime_type:'image/jpeg',base64:(await read(blob)).split(',')[1]};
  }finally{URL.revokeObjectURL(src);}
 }
 function mount(host,{onBusy,onChange,onError}){
  host.innerHTML='<h3>Comprobante <span class="small muted">(opcional)</span></h3><div class="quick-receipt-actions"><button type="button" class="secondary" data-photo>Tomar foto</button><button type="button" class="secondary" data-file>Adjuntar archivo</button></div><input type="file" data-camera accept="image/*" capture="environment" hidden><input type="file" data-upload accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.jpg,.jpeg,.png,.pdf" hidden><p class="small muted">Foto o PDF. El comprobante se guarda junto a este gasto.</p><div data-preview hidden><img alt="Vista previa del comprobante" hidden><span data-filename></span><button type="button" class="quiet" data-remove>Quitar</button></div><p class="small" data-status role="status"></p>';
  let version=0;
  const controls=[...host.querySelectorAll('button,input')];
  const disable=value=>controls.forEach(c=>c.disabled=value);
  const show=receipt=>{const preview=host.querySelector('[data-preview]'),img=preview.querySelector('img');preview.hidden=!receipt;preview.querySelector('[data-filename]').textContent=receipt?.filename||'';img.hidden=!receipt||receipt.mime_type==='application/pdf';if(!img.hidden)img.src='data:'+receipt.mime_type+';base64,'+receipt.base64;else img.removeAttribute('src');onChange(receipt);};
  host.querySelector('[data-photo]').onclick=()=>host.querySelector('[data-camera]').click();
  host.querySelector('[data-file]').onclick=()=>host.querySelector('[data-upload]').click();
  host.querySelector('[data-remove]').onclick=()=>{version++;show(null);host.querySelector('[data-status]').textContent='';};
  for(const input of host.querySelectorAll('input'))input.onchange=async()=>{
   const file=input.files[0];input.value='';if(!file)return;const current=++version;disable(true);onBusy(true);host.querySelector('[data-status]').textContent='Preparando comprobante…';
   try{const receipt=await prepare(file);if(current!==version||!host.isConnected)return;show(receipt);onError('');host.querySelector('[data-status]').textContent='Listo para adjuntar al guardar.';}
   catch(error){if(current===version&&host.isConnected){host.querySelector('[data-status]').textContent='';onError(error.message);}}
   finally{if(current===version){disable(false);onBusy(false);}}
  };
  return {disable};
 }
 window.QoriQuickReceipt={mount,prepare};
})();
