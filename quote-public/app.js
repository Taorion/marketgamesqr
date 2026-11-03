(() => {
  const token=location.hash.slice(1), message=document.getElementById('quotePublicMessage');
  const base=`/api/public/quotes/${encodeURIComponent(token)}`;
  const statusMessages={
    EXPIRED:'La vigencia de esta cotización terminó. Contacta al negocio para recibir una propuesta actualizada.',
    ACCEPTED:'Tu aceptación quedó registrada. Coordina con el negocio los siguientes pasos para tu compra.',
    DECLINED:'Tu respuesta quedó registrada. Si necesitas otra propuesta, puedes contactar al negocio.',
    CONVERTED:'El negocio registró el pago de tu compra. Conserva esta propuesta para consultar sus condiciones.'
  };
  function feedback(text,kind='info') {message.textContent=text;message.dataset.kind=kind;}
  async function load() {
    try {
      if(!/^[a-f0-9]{64}$/.test(token))throw new Error('El enlace de la cotización no es válido. Solicita uno nuevo al negocio.');
      const r=await fetch(base,{cache:'no-store'}),q=await r.json();
      if(!r.ok)throw new Error(q.error?.message||'Cotización no disponible.');
      document.title=`Cotización COT-${q.number} · ${q.snapshot.business.name}`;
      document.getElementById('quotePublicTitle').textContent=q.snapshot.business.name;
      document.getElementById('quotePublicDocument').innerHTML=QuoteDocument.html(q);
      const download=document.getElementById('quoteDownload');download.href=`${base}/pdf`;download.hidden=false;
      document.getElementById('quoteResponse').hidden=q.status!=='SENT';
      feedback(statusMessages[q.status]||'',q.status==='ACCEPTED'||q.status==='CONVERTED'?'success':'info');
      return true;
    } catch(e) {document.getElementById('quoteResponse').hidden=true;feedback(e.message,'error');return false;}
  }
  let responding=false;
  async function respond(decision) {
    if(responding)return;
    if(!document.getElementById('quoteConsent').checked) {
      feedback('Confirma que revisaste los productos, precios y condiciones antes de responder.','error');
      document.getElementById('quoteConsent').focus();return;
    }
    responding=true;
    const buttons=document.querySelectorAll('#quoteResponse button');buttons.forEach(b=>b.disabled=true);
    try {
      const r=await fetch(`${base}/respond`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision})});
      const data=await r.json();
      if(!r.ok)throw new Error(data.error?.message||'No se pudo registrar la respuesta.');
      // The response is persisted even if the following refresh fails.
      document.getElementById('quoteResponse').hidden=true;
      if(!await load())feedback('Tu respuesta quedó registrada. Recarga la página para ver el estado actualizado.','success');
      message.scrollIntoView({behavior:'smooth',block:'start'});
    } catch(e) {feedback(e.message,'error');message.scrollIntoView({behavior:'smooth',block:'start'});}
    finally {responding=false;buttons.forEach(b=>b.disabled=false);}
  }
  document.getElementById('quoteAccept').onclick=()=>respond('ACCEPTED');
  document.getElementById('quoteDecline').onclick=()=>respond('DECLINED');
  load();
})();
