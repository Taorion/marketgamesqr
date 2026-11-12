(() => {
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:2}).format(Number(v||0));
  const date=v=>v?new Date(String(v).length===10?v+'T12:00:00Z':v).toLocaleString('es-CO',{timeZone:'America/Bogota'}):'Sin registrar';
  const views={accounts:'Cartera y suscripciones',orders:'Órdenes y pagos',commissions:'Comisiones',payouts:'Transferencias',history:'Historial de control'};
  const labels={ACTIVE:'Activa',PENDING_PAYMENT:'Pendiente de pago',PENDING:'Pendiente',APPROVED:'Aprobado',REJECTED:'Rechazado',CANCELLED:'Cancelado',SUSPENDED:'Suspendido',SCHEDULED:'Programada',PAID:'Pagada',VOID:'Anulada',SUBSCRIPTION:'Suscripción',TICKETS:'Tickets',REVERSAL:'Ajuste por devolución'};
  Object.assign(labels,{REFUNDED:'Devuelto',CHARGED_BACK:'Contracargo',IN_PROCESS:'En proceso',IN_MEDIATION:'En mediación',AUTHORIZED:'Autorizado'});
  const statuses={accounts:['ACTIVE','PENDING_PAYMENT','SUSPENDED','CANCELLED'],orders:['PENDING','APPROVED','REJECTED','CANCELLED','REFUNDED','CHARGED_BACK'],commissions:['PENDING','SCHEDULED','PAID','VOID'],payouts:[],history:[]};
  const paymentLabel=r=>labels[String(r.provider_status||'').toUpperCase()]||labels[r.status]||r.status;
  const cell=(v)=>esc(v||'—');
  async function open({dialog,request,isCurrent,showPayments}) {
    const d=dialog('Supervisión de embajadores', '<section class="full seller-supervision"><p role="status">Cargando supervisión…</p></section>');
    d.classList.add('seller-supervision-dialog');
    const host=d.querySelector('.seller-supervision');
    const alive=()=>isCurrent()&&d.isConnected;
    let sellers=[],rows=[],offset=0,seq=0,businessId='',view='accounts';
    try { sellers=(await request('/api/seller/admin/supervision/bootstrap')).sellers; }
    catch(error) {if(alive())host.textContent=error.message;return;}
    if(!alive())return;
    host.innerHTML=`<p>Supervisa toda la cartera, incluidos los negocios sin embajador. En cada orden se conserva el destinatario original de la comisión aunque cambie el responsable de la cuenta.</p>
      <div class="supervision-filters">
      <label>Consultar<select data-view>${Object.entries(views).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
      <label>Embajador<select data-seller><option value="">Todos los embajadores</option><option value="unassigned">Sin atribución</option>${sellers.map(s=>`<option value="${esc(s.id)}">${esc(s.full_name)}${!s.is_active?' · suspendido':''}</option>`).join('')}</select></label>
      <label>Buscar<input data-search type="search" maxlength="160" placeholder="Negocio, embajador o referencia"></label>
      <label>Estado<select data-state></select></label>
      <button type="button" class="primary-button" data-search-button>Consultar</button></div>
      <div class="toolbar"><button type="button" class="secondary-button" data-clear>Ver todos los negocios</button><button type="button" class="secondary-button" data-payments>Expedientes y registrar transferencias</button></div>
      <p data-business-filter hidden></p><p data-summary></p><p role="status" data-message></p>
      <div data-rows></div><div class="commercial-pagination"><button type="button" class="secondary-button" data-prev>Anterior</button><span data-page></span><button type="button" class="secondary-button" data-next>Siguiente</button></div>
      <section data-management hidden></section>`;
    const $=s=>host.querySelector(s),msg=$('[data-message]');
    const options=()=>{$('[data-state]').innerHTML='<option value="">Todos los estados</option>'+statuses[view].map(s=>`<option value="${s}">${labels[s]||s}</option>`).join('');};options();
    function drill(id,next) {businessId=id;view=next;offset=0;$('[data-view]').value=view;$('[data-seller]').value='';$('[data-search]').value='';options();load();}
    const inspect=(id)=>`<button type="button" class="secondary-button" data-orders="${esc(id)}">Pagos</button> <button type="button" class="secondary-button" data-commissions="${esc(id)}">Comisiones</button> <button type="button" class="secondary-button" data-history="${esc(id)}">Historial</button>`;
    function render() {
      let headers,body;
      if(view==='accounts') {headers=['Negocio','Suscripción','Responsable actual','Último pago','Control'];body=rows.map(r=>[`${cell(r.name)}${r.is_seller_demo?' <small>Demo Qori</small>':''}`,`${cell(r.plan_code)} · ${cell(labels[r.subscription_status]||r.subscription_status)}<small>${r.is_active?'Habilitado':'Suspendido'} · vence ${date(r.subscription_current_period_ends_at)}</small>`,cell(r.seller_name||'Sin asignar'),date(r.last_payment_at),inspect(r.id)+` <button type="button" class="primary-button" data-manage="${r.id}">Gestionar atribución</button>`]);}
      if(view==='orders') {headers=['Negocio / orden','Plan e importe','Pago','Embajador de la orden','Responsable actual','Trazabilidad'];body=rows.map(r=>[`${cell(r.business_name)}<small>${cell(r.id)}</small>`,`${cell(r.package_title)}<small>${money(r.price_cop)}</small>`,`${cell(paymentLabel(r))}<small>Acreditación original: ${date(r.credited_at)}</small><small>Referencia: ${cell(r.mercado_pago_payment_id)}</small>`,cell(r.seller_name||'Sin atribución'),cell(r.current_seller_name||'Sin asignar'),`${r.commission_entries} movimientos<br>${inspect(r.business_id)}`]);}
      if(view==='commissions') {headers=['Negocio / orden','Embajador','Concepto','Cálculo','Estado / corte','Transferencia'];body=rows.map(r=>[`${cell(r.business_name)}<small>${cell(r.order_id)}</small>`,cell(r.seller_name),`${cell(labels[r.kind]||r.kind)}<small>${cell(r.policy_version)}${r.commission_month?' · mes '+r.commission_month:''}</small>`,`${money(r.base_cop)} × ${Number(r.rate)*100}%<strong>${money(r.amount_cop)}</strong>`,`${cell(labels[r.status]||r.status)}<small>${date(r.due_on)}</small>${r.reversed_at?'<small>Con devolución registrada</small>':''}`,cell(r.payout_id)]);}
      if(view==='payouts') {headers=['Embajador','Referencia / fecha','Bruto','Retención','Neto','Registró'];body=rows.map(r=>[cell(r.seller_name),`${cell(r.transfer_reference)}<small>${date(r.paid_on)}</small><small>${cell(r.id)}</small>`,money(r.gross_cop),money(r.withholding_cop),money(r.net_cop),cell(r.recorded_by_name)]);}
      if(view==='history') {headers=['Fecha','Acción','Responsable','Registro','Detalle'];body=rows.map(r=>[date(r.created_at),cell(r.action),cell(r.actor_name||'Sistema / enlace público'),`${cell(r.entity_type)}<small>${cell(r.entity_id)}</small>`,`<details><summary>Ver trazabilidad</summary><pre>${esc(JSON.stringify(r.detail,null,2))}</pre></details>`]);}
      $('[data-rows]').innerHTML=rows.length?`<div class="table-wrap" tabindex="0" role="region" aria-label="${views[view]}"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${body.map(cells=>'<tr>'+cells.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')}</tbody></table></div>`:'<p>No hay registros con estos filtros.</p>';
      host.querySelectorAll('[data-orders]').forEach(b=>b.onclick=()=>drill(b.dataset.orders,'orders'));
      host.querySelectorAll('[data-commissions]').forEach(b=>b.onclick=()=>drill(b.dataset.commissions,'commissions'));
      host.querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>drill(b.dataset.history,'history'));
      host.querySelectorAll('[data-manage]').forEach(b=>b.onclick=()=>manage(rows.find(r=>r.id===b.dataset.manage)));
    }
    async function load() {
      const mine=++seq;msg.textContent='Consultando…';$('[data-management]').hidden=true;$('[data-rows]').innerHTML='';
      $('[data-prev]').disabled=true;$('[data-next]').disabled=true;
      const params=new URLSearchParams({view,seller_id:$('[data-seller]').value,business_id:businessId,search:$('[data-search]').value,status:$('[data-state]').value,offset});
      try { const data=await request('/api/seller/admin/supervision?'+params);if(!alive()||mine!==seq)return;
        rows=data.rows;render();msg.textContent='';
        const totals=data.summary,names={pending_cop:'Por pagar',scheduled_cop:'Programadas',paid_cop:'Pagadas',approved_cop:'Pagos acreditados',net_cop:'Neto transferido'};
        $('[data-summary]').textContent=`${totals.total} registros`+Object.entries(names).filter(([k])=>totals[k]!==undefined).map(([k,label])=>` · ${label}: ${money(totals[k])}`).join('');
        $('[data-business-filter]').hidden=!businessId;$('[data-business-filter]').textContent='Filtrado por negocio: '+businessId;
        $('[data-page]').textContent='Página '+(offset/30+1);$('[data-prev]').disabled=offset===0;$('[data-next]').disabled=!data.has_more;
      } catch(error){if(alive()&&mine===seq)msg.textContent=error.message;}
    }
    function manage(row) {
      const panel=$('[data-management]');panel.hidden=false;
      panel.innerHTML=`<h3>Responsable de ${esc(row.name)}</h3><p>El cambio aplica a órdenes futuras. Las órdenes existentes y sus comisiones conservan el embajador original. Las ofertas abiertas de la cuenta se cancelan si cambia el responsable.</p>
        <label>Embajador responsable<select data-owner><option value="">Sin asignar</option>${sellers.map(s=>`<option value="${s.id}" ${s.id===row.seller_id?'selected':''}>${esc(s.full_name)}${!s.is_active?' · suspendido':''}</option>`).join('')}</select></label>
        <label>Motivo de la reasignación<textarea data-reason minlength="10" maxlength="1000" required></textarea></label>
        <button type="button" class="primary-button" data-save>Guardar atribución</button><button type="button" class="secondary-button" data-cancel>Cancelar</button><p role="status" data-save-status></p>`;
      panel.querySelector('[data-cancel]').onclick=()=>panel.hidden=true;
      panel.querySelector('[data-save]').onclick=async e=>{
        if(!alive()||e.currentTarget.disabled)return;
        const reason=panel.querySelector('[data-reason]').value.trim(),status=panel.querySelector('[data-save-status]'),button=e.currentTarget;
        if(reason.length<10){status.textContent='Escribe un motivo de al menos 10 caracteres.';return;}
        button.disabled=true;
        try {await request('/api/admin/commercial/customers/'+row.id,{seller_id:panel.querySelector('[data-owner]').value||null,expected_seller_id:row.seller_id||null,reason},'PATCH');if(alive()){await load();msg.textContent='Atribución actualizada y registrada en el historial.';}}
        catch(error){if(alive())status.textContent=error.message;}
        finally{button.disabled=false;}
      };panel.scrollIntoView?.({block:'nearest'});
    }
    $('[data-view]').onchange=()=>{view=$('[data-view]').value;offset=0;options();load();};
    $('[data-search-button]').onclick=()=>{offset=0;load();};
    $('[data-search]').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();offset=0;load();}};
    $('[data-prev]').onclick=()=>{offset=Math.max(0,offset-30);load();};$('[data-next]').onclick=()=>{offset+=30;load();};
    $('[data-clear]').onclick=()=>{businessId='';$('[data-search]').value='';$('[data-seller]').value='';$('[data-state]').value='';offset=0;load();};
    $('[data-payments]').onclick=()=>{if(alive())showPayments();};
    await load();
  }
  window.QoriSellerSupervision={open};
})();
