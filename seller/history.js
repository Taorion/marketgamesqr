(() => {
  'use strict';
  function render(host,{view,rows=[],pagination,renderRows,fetchPage,isCurrent,searchLabel}) {
    host.innerHTML='<form class="row"><label style="flex:1"><span></span><input type="search" maxlength="160" name="search"></label><button type="submit" class="outline">Buscar</button></form><p role="status"></p><div data-history-rows></div><button type="button" class="outline" data-history-more>Cargar más</button>';
    const form=host.querySelector('form'),status=host.querySelector('[role=status]'),list=host.querySelector('[data-history-rows]'),more=host.querySelector('[data-history-more]');
    form.querySelector('span').textContent=searchLabel;
    if(view==='accounts'){
      const label=document.createElement('label');label.textContent='Filtrar por fase';
      const select=document.createElement('select');select.name='phase';
      for(const [value,text] of [['ALL','Todas las fases'],['TRIAL','En prueba Freemium'],['TRIAL_ENDING','Freemium por vencer'],['TRIAL_EXPIRED','Freemium vencido'],['CONVERTED','Pasaron de Freemium a pago'],['PAID_ACTIVE','Plan pago activo'],['PAYMENT','Pago o renovación pendiente'],['SUSPENDED','Suspendidos']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
      label.append(select);form.insertBefore(label,form.querySelector('button'));select.onchange=()=>request(true);
    }
    let loaded=rows,page=pagination||{has_more:false,next_offset:rows.length},search='',phase='ALL',revision=0,busy=false;
    const current=()=>host.isConnected&&isCurrent();
    const draw=()=>{list.innerHTML=renderRows(loaded);status.textContent=loaded.length+' registros cargados'+(page.has_more?' · Hay más resultados.':' · Fin de los resultados.');more.hidden=!page.has_more;};
    async function request(reset) {
      if(!current()||(!reset&&busy))return;
      const mine=++revision;busy=true;more.disabled=true;status.textContent='Consultando…';
      const wanted=reset?form.elements.search.value.trim():search;
      const wantedPhase=reset?(form.elements.phase?.value||'ALL'):phase;
      try {
        const result=await fetchPage({view,search:wanted,phase:wantedPhase,offset:reset?0:page.next_offset});
        if(mine!==revision||!current())return;
        const combined=reset?result.rows:[...loaded,...result.rows];
        loaded=Array.from(new Map(combined.map(row=>[row.id,row])).values());
        page=result.pagination;search=wanted;phase=wantedPhase;draw();
      } catch(error) {if(mine===revision&&current())status.textContent=error.message;}
      finally {if(mine===revision&&current()){busy=false;more.disabled=false;}}
    }
    form.onsubmit=event=>{event.preventDefault();request(true);};
    more.onclick=()=>request(false);draw();
  }
  window.QoriSellerHistory={render};
})();
