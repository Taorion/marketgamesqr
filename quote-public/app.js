(() => {
  const token=location.hash.slice(1),message=document.getElementById('quotePublicMessage');
  const base=`/api/public/quotes/${encodeURIComponent(token)}`;
  async function load(){
    try{
      if(!/^[a-f0-9]{64}$/.test(token))throw new Error('El enlace de la cotización no es válido. Solicita uno nuevo al negocio.');
      const r=await fetch(base,{cache:'no-store'}),q=await r.json();if(!r.ok)throw new Error(q.error?.message||'Cotización no disponible.');
      document.title=`Cotización COT-${q.number} · ${q.snapshot.business.name}`;
      document.getElementById('quotePublicTitle').textContent=q.snapshot.business.name;
      document.getElementById('quotePublicDocument').innerHTML=QuoteDocument.html(q);
      const download=document.getElementById('quoteDownload');download.href=`${base}/pdf`;download.hidden=false;
      document.getElementById('quoteResponse').hidden=q.status!=='SENT';message.textContent= q.status==='EXPIRED'?'La vigencia de esta cotización terminó. Contacta al negocio para actualizarla.':'';
    }catch(e){message.textContent=e.message;}
  }
  async function respond(decision){
    if(!document.getElementById('quoteConsent').checked){message.textContent='Confirma que revisaste la cotización antes de responder.';message.scrollIntoView({behavior:'smooth'});return;}
    const buttons=document.querySelectorAll('#quoteResponse button');buttons.forEach(b=>b.disabled=true);
    try{const r=await fetch(`${base}/respond`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision})}),data=await r.json();if(!r.ok)throw new Error(data.error?.message||'No se pudo registrar la respuesta.');await load();message.textContent=decision==='ACCEPTED'?'Tu aceptación quedó registrada. El negocio podrá coordinar contigo los siguientes pasos.':'Tu respuesta quedó registrada.';}
    catch(e){message.textContent=e.message;}finally{buttons.forEach(b=>b.disabled=false);}
  }
  document.getElementById('quoteAccept').onclick=()=>respond('ACCEPTED');document.getElementById('quoteDecline').onclick=()=>respond('DECLINED');load();
})();
