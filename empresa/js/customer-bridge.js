/* Enterprise operators can propose a verified relationship, never read personal finances. */
(() => {
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const params=new URLSearchParams(location.search);
  const call=(path,method='GET',body)=>api(`/api/business/customer${path}`,{method,headers:authHeaders(),noClientCache:true,...(body?{body:JSON.stringify(body)}:{})});
  let pending=params.get('customer')||'',opened=false;
  function open(){if(window.QoriCustomerWorkspace)return window.QoriCustomerWorkspace.show(pending);if(window.QoriCustomerInvitations)return window.QoriCustomerInvitations.open(pending);legacyOpen();}
  function legacyOpen(){
    if(typeof session==='undefined'||!session){return;}
    if(document.getElementById('customerBridgeDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='customerBridgeDialog';dialog.setAttribute('aria-labelledby','customerBridgeTitle');
    dialog.innerHTML=`<header><h2 id="customerBridgeTitle">Conectar Qori Customer</h2><button type="button" data-close aria-label="Cerrar">×</button></header>
      <p>Verifica el documento del comprador y solicita su confirmación en Qori Customer. Después, las ventas que registres con ese documento aparecerán en su cuenta.</p>
      <form id="customerBridgeForm"><label>Identificación Qori del comprador<input name="public_id" required value="${esc(pending)}" placeholder="Código de Mi Qori" autocomplete="off"></label>
      <label>Documento del comprador (no necesita compras previas)<input name="document_id" required minlength="3" maxlength="80"></label>
      <label class="cb-check"><input type="checkbox" name="checked" required> Verifiqué la identidad y el documento del comprador presente.</label><button type="submit">Enviar solicitud al comprador</button></form>
      <p id="customerBridgeMessage" role="status"></p><details><summary>Publicar mi establecimiento en Qori Customer</summary><form id="customerDirectoryForm">
      <label>Categoría<input name="category" maxlength="80" required></label><label>Ciudad<input name="city" maxlength="100" required></label><label>Dirección<input name="address" maxlength="200"></label><label>Descripción<textarea name="description" maxlength="1000"></textarea></label>
      <label class="cb-check"><input type="checkbox" name="published"> Mostrar mi establecimiento en Descubrir</label><button type="submit">Guardar publicación</button></form></details>
      <details><summary>Compras reportadas por clientes</summary><button type="button" id="customerReportsLoad">Consultar reportes</button><div id="customerReports"></div></details>`;
    document.body.append(dialog);dialog.showModal();dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
    const message=text=>dialog.querySelector('#customerBridgeMessage').textContent=text;
    dialog.querySelector('#customerBridgeForm').onsubmit=async e=>{e.preventDefault();const form=e.target,button=form.querySelector('button');button.disabled=true;try{const d=Object.fromEntries(new FormData(form));const r=await call('/relationships','POST',{public_id:d.public_id.trim(),document_id:d.document_id.trim(),identity_checked:d.checked==='on'});message(r.relationship.state==='ACCEPTED'?'La cuenta ya está conectada.':'Solicitud enviada. El comprador debe confirmarla desde Mis negocios en Qori Customer.');}catch(error){message(error.message);}finally{button.disabled=false;}};
    dialog.querySelector('#customerDirectoryForm').onsubmit=async e=>{e.preventDefault();try{const d=Object.fromEntries(new FormData(e.target));await call('/directory','PUT',{...d,published:d.published==='on'});message('Publicación actualizada.');}catch(error){message(error.message);}};
    call('/directory').then(({directory:d})=>{if(!d)return;const form=dialog.querySelector('#customerDirectoryForm');for(const name of ['category','city','address','description'])form.elements[name].value=d[name]||'';form.elements.published.checked=d.published;}).catch(()=>{});
    dialog.querySelector('#customerReportsLoad').onclick=async()=>{try{const r=await call('/reports');dialog.querySelector('#customerReports').innerHTML=r.reports.map(x=>`<p><strong>Venta ${esc(x.sale_id)}</strong><br>${esc(x.report_reason)}</p>`).join('')||'<p>Sin reportes.</p>';}catch(e){message(e.message);}};
  }
  window.QoriCustomerBridge={open(id){pending=id||'';opened=true;open();},legacy(id){pending=id||'';opened=true;legacyOpen();}};
  const timer=setInterval(()=>{

    if(pending&&!opened&&typeof session!=='undefined'&&session){opened=true;open();}
  },1500);
  window.addEventListener('pagehide',()=>clearInterval(timer));
})();
